package vn.memay.media;

import java.io.IOException;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.memay.common.AdminApiException;
import vn.memay.media.ImageTypes.*;

@Service
@ConditionalOnProperty(prefix = "memay.media.local", name = "enabled", havingValue = "true")
public class ImageJobService {
    private final ImageJobRepository jobs;
    private final LocalImageStore store;
    private final ImageMigrationPreviewQueue previews;

    public ImageJobService(ImageJobRepository jobs, LocalImageStore store, ImageMigrationPreviewQueue previews) {
        this.jobs = jobs;
        this.store = store;
        this.previews = previews;
    }

    @Transactional
    public UUID enqueue(UUID mediaId, UUID generationId, JobKind kind, String inputKey,
                        String recipeVersion, String dedupeKey, int priority) {
        if (!inputKey.matches("staging/[a-f0-9-]{36}/input"))
            throw new AdminApiException(400, "invalid_image_input_key");
        String originalHash = null;
        if (kind == JobKind.PROCESS || kind == JobKind.MIGRATE) {
            try {
                originalHash = store.originalHash(inputKey);
            } catch (IOException e) {
                throw new AdminApiException(422, "image_input_unavailable");
            }
        }
        if (kind == JobKind.MIGRATE && !jobs.matchesMigrationInput(generationId, originalHash))
            throw new AdminApiException(409, "source_changed");
        UUID id = jobs.enqueue(mediaId, generationId, kind, inputKey, recipeVersion, dedupeKey, priority);
        if (originalHash != null) jobs.registerOriginalHash(generationId, originalHash);
        return id;
    }

    public Optional<JobLease> claim() {
        var lease = jobs.claim();
        if (lease.isPresent() && lease.get().kind() != JobKind.PROCESS && lease.get().kind() != JobKind.MIGRATE) {
            var job = lease.get();
            jobs.fail(job.jobId(), job.token(), "unsupported_job_kind", false);
            return Optional.empty();
        }
        return lease.or(previews::claimEncode);
    }

    public Instant heartbeat(UUID jobId, UUID token) {
        return previews.owns(jobId) ? previews.heartbeat(jobId, token) : jobs.heartbeat(jobId, token);
    }

    @Transactional
    public void complete(UUID jobId, UUID token, Manifest manifest) {
        if (previews.owns(jobId)) {
            previews.complete(jobId, token, manifest);
            return;
        }
        var lease = jobs.lockLease(jobId, token);
        boolean migrate = lease.kind() == JobKind.MIGRATE;
        if (!lease.mediaId().equals(manifest.mediaId()) || !lease.generationId().equals(manifest.generationId())
                || !lease.recipeVersion().equals(manifest.recipeVersion())
                || (migrate ? !jobs.isMigrationJob(jobId, lease.generationId())
                        : lease.kind() != JobKind.PROCESS || !jobs.lockUpload(lease.mediaId())))
            throw new AdminApiException(409, "image_generation_conflict");
        String originalHash;
        try {
            originalHash = store.originalHash(lease.inputKey());
            jobs.requireOriginalHash(lease.generationId(), originalHash);
            if (migrate) store.validateMigrationVariants(manifest);
            store.publishAttempt(manifest, token);
        } catch (IOException e) {
            throw new AdminApiException(422, "image_output_not_publishable");
        }
        jobs.ready(jobId, token, manifest, originalHash);
        if (!migrate) jobs.finishLocalUpload(manifest);
    }

    public void fail(UUID jobId, UUID token, String code, boolean retryable) {
        if (code == null || !code.matches("[a-z0-9_]{1,64}"))
            throw new AdminApiException(400, "invalid_image_error_code");
        if (previews.owns(jobId)) previews.fail(jobId, token, code, retryable);
        else jobs.fail(jobId, token, code, retryable);
    }
}
