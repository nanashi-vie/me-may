package vn.memay.media;

import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;
import vn.memay.common.AdminApiException;
import vn.memay.media.ImageTypes.*;
import vn.memay.media.source.DriveSourceClient;
import vn.memay.media.source.SourceAccessException;

@Component
@ConditionalOnProperty(prefix = "memay.media.local", name = "enabled", havingValue = "true")
class ImageMigrationPreviewQueue {
    private final JdbcTemplate jdbc;
    private final LocalImageStore store;
    private final DriveSourceClient drive;
    private final TransactionTemplate transactions;
    private final AtomicBoolean running = new AtomicBoolean();
    private final java.util.concurrent.ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

    ImageMigrationPreviewQueue(JdbcTemplate jdbc, LocalImageStore store, DriveSourceClient drive,
            org.springframework.transaction.PlatformTransactionManager manager) {
        this.jdbc = jdbc;
        this.store = store;
        this.drive = drive;
        this.transactions = new TransactionTemplate(manager);
    }

    private record Download(UUID row, String fileId, UUID token) {}

    @Scheduled(fixedDelay = 1000,
            initialDelayString = "${memay.media.migration.initial-delay-ms:1000}")
    void poll() {
        if (executor.isShutdown() || !running.compareAndSet(false, true)) return;
        executor.execute(() -> {
            try {
                transactions.execute(tx -> claimDownload()).ifPresent(this::download);
            } catch (RuntimeException e) {
                org.slf4j.LoggerFactory.getLogger(getClass()).warn("Image migration preview poll failed");
            } finally {
                running.set(false);
            }
        });
    }

    private Optional<Download> claimDownload() {
        // Separate from image-job leases. Only one Drive download runs at a time across Spring instances.
        if (!Boolean.TRUE.equals(jdbc.queryForObject("SELECT pg_try_advisory_xact_lock(61029025)", Boolean.class)))
            return Optional.empty();
        UUID token = UUID.randomUUID();
        return jdbc.query("""
                WITH candidate AS (
                    SELECT r.id FROM image_migration_row r JOIN image_migration_receipt p ON p.id=r.receipt_id
                    JOIN admin_user a ON a.id=p.actor_id AND a.active AND a.role='OWNER'
                    WHERE p.expires_at>clock_timestamp() AND (r.state='PENDING' OR
                        (r.state='DOWNLOADING' AND r.lease_until<=clock_timestamp()))
                    AND NOT EXISTS (SELECT 1 FROM image_migration_row
                        WHERE state='DOWNLOADING' AND lease_until>clock_timestamp())
                    ORDER BY p.created_at,r.line LIMIT 1 FOR UPDATE OF r SKIP LOCKED
                )
                UPDATE image_migration_row r SET state='DOWNLOADING',lease_token=?,
                    lease_until=clock_timestamp()+interval '5 minutes'
                FROM candidate c WHERE r.id=c.id RETURNING r.id,r.file_id
                """, (r, i) -> new Download(r.getObject(1, UUID.class), r.getString(2), token), token)
                .stream().findFirst();
    }

    private void download(Download task) {
        String error = null;
        try {
            var source = drive.download(task.fileId(), task.token());
            if (!source.inputKey().equals(input(task.token())) || !source.sha256().matches("[a-f0-9]{64}"))
                throw new IllegalStateException("invalid source staging");
            jdbc.update("""
                    UPDATE image_migration_row r SET state='QUEUED',lease_token=NULL,lease_until=NULL,
                        input_id=?,source_sha256=?,source_version=?,source_bytes=?,source_mime=?
                    FROM image_migration_receipt p WHERE r.receipt_id=p.id AND p.expires_at>clock_timestamp()
                        AND r.id=? AND r.state='DOWNLOADING' AND r.lease_token=? AND r.lease_until>clock_timestamp()
                    """, task.token(), source.sha256(), source.version(), source.bytes(), source.mime(), task.row(), task.token());
        } catch (SourceAccessException e) {
            error = e.code();
        } catch (RuntimeException e) {
            error = "source_download_failed";
        }
        if (error != null) jdbc.update("""
                UPDATE image_migration_row SET state='INVALID',error_code=?,lease_token=NULL,lease_until=NULL
                WHERE id=? AND state='DOWNLOADING' AND lease_token=? AND lease_until>clock_timestamp()
                """, error, task.row(), task.token());
    }

    boolean owns(UUID id) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM image_migration_row WHERE id=?)",
                Boolean.class, id));
    }

    Optional<JobLease> claimEncode() {
        jdbc.update("""
                UPDATE image_migration_row SET state='INVALID',error_code='lease_expired',lease_token=NULL,lease_until=NULL
                WHERE id IN (SELECT id FROM image_migration_row WHERE state='PROCESSING' AND attempts>=3
                    AND lease_until<=clock_timestamp() FOR UPDATE SKIP LOCKED)
                """);
        return jdbc.query("""
                WITH candidate AS (
                    SELECT r.id FROM image_migration_row r JOIN image_migration_receipt p ON p.id=r.receipt_id
                    JOIN admin_user a ON a.id=p.actor_id AND a.active AND a.role='OWNER'
                    WHERE p.expires_at>clock_timestamp() AND r.attempts<3 AND
                        ((r.state='QUEUED' AND r.available_at<=clock_timestamp()) OR
                         (r.state='PROCESSING' AND r.lease_until<=clock_timestamp()))
                    ORDER BY p.created_at,r.line LIMIT 1 FOR UPDATE OF r SKIP LOCKED
                )
                UPDATE image_migration_row r SET state='PROCESSING',attempts=r.attempts+1,
                    lease_token=?,lease_until=clock_timestamp()+interval '5 minutes'
                FROM candidate c,image_migration_receipt p WHERE r.id=c.id AND p.id=r.receipt_id
                RETURNING r.*,p.recipe_version
                """, (r, i) -> new JobLease(r.getObject("id", UUID.class), r.getObject("lease_token", UUID.class),
                    r.getObject("media_id", UUID.class), r.getObject("id", UUID.class), JobKind.PREVIEW,
                    input(r.getObject("input_id", UUID.class)), r.getString("recipe_version"),
                    r.getObject("lease_until", OffsetDateTime.class).toInstant()), UUID.randomUUID()).stream().findFirst();
    }

    Instant heartbeat(UUID id, UUID token) {
        return jdbc.query("""
                UPDATE image_migration_row r SET lease_until=clock_timestamp()+interval '5 minutes'
                FROM image_migration_receipt p WHERE p.id=r.receipt_id AND p.expires_at>clock_timestamp()
                    AND r.id=? AND r.lease_token=? AND r.state='PROCESSING' AND r.lease_until>clock_timestamp()
                RETURNING r.lease_until
                """, (r, i) -> r.getObject(1, OffsetDateTime.class).toInstant(), id, token)
                .stream().findFirst().orElseThrow(ImageMigrationPreviewQueue::stale);
    }

    void complete(UUID id, UUID token, Manifest manifest) {
        var row = jdbc.queryForList("""
                SELECT r.media_id,r.source_sha256,r.input_id,p.recipe_version
                FROM image_migration_row r JOIN image_migration_receipt p ON p.id=r.receipt_id
                JOIN admin_user a ON a.id=p.actor_id AND a.active AND a.role='OWNER'
                WHERE r.id=? AND r.lease_token=? AND r.state='PROCESSING'
                    AND r.lease_until>clock_timestamp() AND p.expires_at>clock_timestamp() FOR UPDATE OF r
                """, id, token).stream().findFirst().orElseThrow(ImageMigrationPreviewQueue::stale);
        if (!id.equals(manifest.generationId()) || !row.get("media_id").equals(manifest.mediaId())
                || !row.get("recipe_version").equals(manifest.recipeVersion()))
            throw new AdminApiException(422, "invalid_preview_output");
        try {
            if (!row.get("source_sha256").equals(store.originalHash(input((UUID) row.get("input_id")))))
                throw new IOException("Source hash changed");
            store.validateMigrationPreview(manifest, token);
        } catch (IOException e) {
            throw new AdminApiException(422, "invalid_preview_output");
        }
        if (jdbc.update("""
                UPDATE image_migration_row r SET state='READY',preview_id=?,lease_token=NULL,lease_until=NULL
                FROM image_migration_receipt p WHERE p.id=r.receipt_id AND p.expires_at>clock_timestamp()
                    AND r.id=? AND r.lease_token=? AND r.lease_until>clock_timestamp()
                """, token, id, token) != 1) throw stale();
    }

    void fail(UUID id, UUID token, String code, boolean retryable) {
        if (jdbc.update("""
                UPDATE image_migration_row SET state=CASE WHEN ? AND attempts<3 THEN 'QUEUED' ELSE 'INVALID' END,
                    available_at=clock_timestamp()+CASE WHEN attempts=1 THEN interval '10 seconds' ELSE interval '60 seconds' END,
                    error_code=CASE WHEN ? AND attempts<3 THEN NULL ELSE ? END,lease_token=NULL,lease_until=NULL
                WHERE id=? AND lease_token=? AND state='PROCESSING' AND lease_until>clock_timestamp()
                """, retryable, retryable, code, id, token) != 1) throw stale();
    }

    private static AdminApiException stale() { return new AdminApiException(409, "image_lease_conflict"); }
    private static String input(UUID id) { return "staging/" + id + "/input"; }

    @PreDestroy void stop() { executor.shutdownNow(); }
}
