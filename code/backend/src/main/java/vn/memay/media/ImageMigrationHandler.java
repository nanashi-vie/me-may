package vn.memay.media;

import jakarta.annotation.PreDestroy;
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
import vn.memay.media.ImageTypes.JobKind;
import vn.memay.media.source.DownloadedSource;
import vn.memay.media.source.DriveSourceClient;
import vn.memay.media.source.SourceAccessException;

@Component
@ConditionalOnProperty(prefix = "memay.media.local", name = "enabled", havingValue = "true")
class ImageMigrationHandler {
    private final JdbcTemplate jdbc;
    private final DriveSourceClient drive;
    private final ImageJobService jobs;
    private final ImageMigrationApplyService apply;
    private final TransactionTemplate transactions;
    private final AtomicBoolean running = new AtomicBoolean();
    private final java.util.concurrent.ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

    ImageMigrationHandler(JdbcTemplate jdbc, DriveSourceClient drive, ImageJobService jobs,
            ImageMigrationApplyService apply, org.springframework.transaction.PlatformTransactionManager manager) {
        this.jdbc = jdbc;
        this.drive = drive;
        this.jobs = jobs;
        this.apply = apply;
        this.transactions = new TransactionTemplate(manager);
    }

    private record Group(UUID operation, long book, long actor) {}
    private record Task(UUID id, UUID media, UUID token, String file, String hash, String sourceVersion,
                        long bytes, String mime, String recipe) {}

    @Scheduled(fixedDelayString = "${memay.media.migration.apply-delay-ms:1000}",
            initialDelayString = "${memay.media.migration.apply-delay-ms:1000}")
    void poll() {
        if (executor.isShutdown() || !running.compareAndSet(false, true)) return;
        executor.execute(() -> {
            try {
                finishNextBook();
                transactions.execute(tx -> claim()).ifPresent(this::download);
            } catch (RuntimeException e) {
                org.slf4j.LoggerFactory.getLogger(getClass()).warn("Image migration apply poll failed");
            } finally {
                running.set(false);
            }
        });
    }

    private void finishNextBook() {
        var candidates = jdbc.query("""
                SELECT b.operation_id,b.book_id,o.actor_id
                FROM image_migration_apply_book b JOIN image_migration_apply o ON o.id=b.operation_id
                WHERE b.state='PENDING' AND (
                    NOT EXISTS(SELECT 1 FROM admin_user WHERE id=o.actor_id AND active AND role='OWNER')
                    OR EXISTS(SELECT 1 FROM image_migration_apply_item i LEFT JOIN image_job j ON j.id=i.job_id
                        WHERE i.operation_id=b.operation_id AND i.book_id=b.book_id
                            AND (i.state='FAILED' OR j.status IN ('FAILED','CANCELLED')
                                OR (i.state='QUEUED' AND j.id IS NULL)))
                    OR NOT EXISTS(SELECT 1 FROM image_migration_apply_item i LEFT JOIN image_job j ON j.id=i.job_id
                        WHERE i.operation_id=b.operation_id AND i.book_id=b.book_id AND j.status IS DISTINCT FROM 'READY'))
                ORDER BY o.created_at,b.book_id LIMIT 1
                """, (r, i) -> new Group(r.getObject(1, UUID.class), r.getLong(2), r.getLong(3)));
        if (candidates.isEmpty()) return;
        var next = candidates.getFirst();
        try {
            apply.finishBook(next.operation(), next.book(), next.actor());
        } catch (AdminApiException e) {
            apply.failBook(next.operation(), next.book(), e.error);
        } catch (org.springframework.dao.NonTransientDataAccessException e) {
            apply.failBook(next.operation(), next.book(), "image_migration_commit_failed");
        }
    }

    private Optional<Task> claim() {
        if (!Boolean.TRUE.equals(jdbc.queryForObject("SELECT pg_try_advisory_xact_lock(61029025)", Boolean.class)))
            return Optional.empty();
        UUID token = UUID.randomUUID();
        return jdbc.query("""
                WITH candidate AS (
                    SELECT i.id,o.recipe_version FROM image_migration_apply_item i
                    JOIN image_migration_apply_book b USING(operation_id,book_id)
                    JOIN image_migration_apply o ON o.id=i.operation_id
                    JOIN admin_user a ON a.id=o.actor_id AND a.active AND a.role='OWNER'
                    WHERE b.state='PENDING' AND (i.state='PENDING' OR
                        (i.state='DOWNLOADING' AND i.lease_until<=clock_timestamp()))
                    AND NOT EXISTS(SELECT 1 FROM image_migration_apply_item
                        WHERE state='DOWNLOADING' AND lease_until>clock_timestamp())
                    AND NOT EXISTS(SELECT 1 FROM image_migration_row
                        WHERE state='DOWNLOADING' AND lease_until>clock_timestamp())
                    ORDER BY o.created_at,i.book_id,i.id LIMIT 1 FOR UPDATE OF i SKIP LOCKED
                )
                UPDATE image_migration_apply_item i SET state='DOWNLOADING',lease_token=?,
                    lease_until=clock_timestamp()+interval '5 minutes'
                FROM candidate c WHERE i.id=c.id RETURNING i.*,c.recipe_version
                """, (r, n) -> new Task(r.getObject("id", UUID.class), r.getObject("media_id", UUID.class), token,
                        r.getString("file_id"), r.getString("source_sha256"), r.getString("source_version"),
                        r.getLong("source_bytes"), r.getString("source_mime"), r.getString("recipe_version")), token)
                .stream().findFirst();
    }

    private void download(Task task) {
        try {
            var source = drive.download(task.file(), task.token());
            if (!matches(task, source)) {
                fail(task, "source_changed");
                return;
            }
            transactions.executeWithoutResult(tx -> enqueue(task, source));
        } catch (SourceAccessException e) {
            fail(task, e.code().toLowerCase(java.util.Locale.ROOT));
        } catch (AdminApiException e) {
            fail(task, e.error);
        } catch (RuntimeException e) {
            fail(task, "source_download_failed");
        }
    }

    private void enqueue(Task task, DownloadedSource source) {
        boolean active = !jdbc.queryForList("""
                SELECT i.id FROM image_migration_apply_item i JOIN image_migration_apply_book b USING(operation_id,book_id)
                WHERE i.id=? AND i.state='DOWNLOADING' AND i.lease_token=? AND i.lease_until>clock_timestamp()
                    AND b.state='PENDING' FOR UPDATE OF b,i
                """, UUID.class, task.id(), task.token()).isEmpty();
        if (!active) {
            fail(task, "image_migration_cancelled");
            return;
        }
        UUID job = jobs.enqueue(task.media(), task.id(), JobKind.MIGRATE, source.inputKey(),
                task.recipe(), "migrate:" + task.id(), 100);
        jdbc.update("""
                UPDATE image_migration_apply_item SET state='QUEUED',job_id=?,lease_token=NULL,lease_until=NULL WHERE id=?
                """, job, task.id());
    }

    private void fail(Task task, String code) {
        jdbc.update("""
                UPDATE image_migration_apply_item SET state='FAILED',error_code=?,lease_token=NULL,lease_until=NULL
                WHERE id=? AND state='DOWNLOADING' AND lease_token=? AND lease_until>clock_timestamp()
                """, code, task.id(), task.token());
    }

    private static boolean matches(Task task, DownloadedSource source) {
        return ("staging/" + task.token() + "/input").equals(source.inputKey())
                && task.hash().equals(source.sha256()) && task.sourceVersion().equals(source.version())
                && task.bytes() == source.bytes() && task.mime().equals(source.mime());
    }

    @PreDestroy void stop() { executor.shutdownNow(); }
}
