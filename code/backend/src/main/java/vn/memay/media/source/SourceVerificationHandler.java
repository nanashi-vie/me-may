package vn.memay.media.source;

import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import vn.memay.common.AdminApiException;
import vn.memay.media.ImageJobRepository;
import vn.memay.media.ImageTypes.JobLease;
import vn.memay.media.LocalImageStore;

@Component
@ConditionalOnProperty(prefix = "memay.media.local", name = "enabled", havingValue = "true")
class SourceVerificationHandler {
    private final SourceBindingService bindings;
    private final ImageJobRepository jobs;
    private final DriveSourceClient drive;
    private final LocalImageStore store;
    private final AtomicBoolean running = new AtomicBoolean();
    private final java.util.concurrent.ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

    SourceVerificationHandler(SourceBindingService bindings, ImageJobRepository jobs,
                              DriveSourceClient drive, LocalImageStore store) {
        this.bindings = bindings;
        this.jobs = jobs;
        this.drive = drive;
        this.store = store;
    }

    @Scheduled(fixedDelay = 1000)
    void poll() {
        if (executor.isShutdown() || !running.compareAndSet(false, true)) return;
        executor.execute(() -> {
            try {
                jobs.claimVerification().ifPresent(this::verify);
            } catch (RuntimeException e) {
                org.slf4j.LoggerFactory.getLogger(SourceVerificationHandler.class).warn("Image verification queue poll failed");
            } finally {
                running.set(false);
            }
        });
    }

    private void verify(JobLease lease) {
        boolean staged = false;
        try {
            var candidate = bindings.candidateForDownload(lease);
            var source = drive.download(candidate.fileId(), lease.token());
            staged = true;
            bindings.complete(lease, source);
        } catch (SourceAccessException e) {
            fail(lease, e.code(), e.retryable());
        } catch (AdminApiException e) {
            fail(lease, e.error, false);
        } catch (RuntimeException e) {
            fail(lease, "source_verification_failed", true);
        } finally {
            if (staged) {
                try {
                    store.discardInput(lease.token());
                } catch (IOException ignored) {
                    // Unreferenced staging input is eligible for cleanup.
                }
            }
        }
    }

    private void fail(JobLease lease, String code, boolean retryable) {
        try {
            jobs.fail(lease.jobId(), lease.token(), code, retryable);
        } catch (AdminApiException stale) {
            if (stale.status != 409) throw stale;
        }
    }

    @PreDestroy void stop() {
        executor.shutdownNow();
    }
}
