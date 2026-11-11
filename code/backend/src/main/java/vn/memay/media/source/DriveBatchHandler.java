package vn.memay.media.source;

import java.io.IOException;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import vn.memay.auth.AdminUserRepository;
import vn.memay.media.LocalImageStore;
import vn.memay.media.LocalUploadService;
import vn.memay.media.MediaRecoveryMode;

@Component
@ConditionalOnProperty(prefix="memay.media.local",name="enabled",havingValue="true")
class DriveBatchHandler {
    private final DriveBatchRepository repository;
    private final DriveBatchService batches;
    private final DriveSourceClient drive;
    private final LocalUploadService uploads;
    private final LocalImageStore store;
    private final AdminUserRepository users;
    private final TransactionTemplate tx;
    private final MediaRecoveryMode mode;
    private final String namespace;
    private final AtomicBoolean running=new AtomicBoolean();
    private final java.util.concurrent.ExecutorService executor=Executors.newVirtualThreadPerTaskExecutor();

    DriveBatchHandler(DriveBatchRepository repository, DriveBatchService batches, DriveSourceClient drive,
                      LocalUploadService uploads, LocalImageStore store, AdminUserRepository users,
                      PlatformTransactionManager manager, MediaRecoveryMode mode,
                      @Value("${memay.media.namespace:memay/dev}") String namespace) {
        this.repository=repository; this.batches=batches; this.drive=drive; this.uploads=uploads;
        this.store=store; this.users=users; this.tx=new TransactionTemplate(manager);
        this.mode=mode; this.namespace=namespace;
    }
    @Scheduled(initialDelayString="${memay.media.drive-batch.initial-delay-ms:1000}",
            fixedDelayString="${memay.media.drive-batch.poll-delay-ms:1000}")
    void poll() {
        if (mode.isolated() || executor.isShutdown() || !running.compareAndSet(false,true)) return;
        executor.execute(()-> {
            try {
                tx.execute(t->repository.claim(namespace)).ifPresent(this::download);
            } catch (RuntimeException e) {
                org.slf4j.LoggerFactory.getLogger(getClass()).warn("Drive batch queue poll deferred");
            } finally { running.set(false); }
        });
    }
    private void download(DriveBatchRepository.Lease lease) {
        boolean handedOff=false;
        try {
            var actor=users.findById(lease.actorId()).orElseThrow(DriveBatchService::conflict);
            var source=drive.download(lease.fileId(),lease.token());
            tx.executeWithoutResult(t->batches.completeDownload(lease,source,actor,uploads));
            handedOff="IMPORT".equals(lease.mode());
        } catch (SourceAccessException e) {
            fail(lease,e.code(),e.retryable());
        } catch (RuntimeException e) {
            fail(lease,e instanceof vn.memay.common.AdminApiException a?a.error:"drive_batch_failed",
                    !(e instanceof vn.memay.common.AdminApiException));
        } finally {
            if (!handedOff) {
                try { store.discardInput(lease.token()); }
                catch (IOException e) { org.slf4j.LoggerFactory.getLogger(getClass()).warn("Drive input cleanup deferred"); }
            }
        }
    }
    private void fail(DriveBatchRepository.Lease lease,String code,boolean retryable) {
        try { tx.executeWithoutResult(t->repository.fail(lease,code,retryable)); }
        catch (vn.memay.common.AdminApiException stale) { /* A newer lease or closed session owns cleanup. */ }
    }
    @PreDestroy void stop() { executor.shutdownNow(); }
}
