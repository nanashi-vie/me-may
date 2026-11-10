package vn.memay.media;

import jakarta.annotation.PreDestroy;
import java.io.IOException;
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
import vn.memay.media.source.DriveSourceClient;
import vn.memay.media.source.SourceAccessException;

@Component
@ConditionalOnProperty(prefix = "memay.media.local", name = "enabled", havingValue = "true")
class ImageRecoveryHandler {
    private final JdbcTemplate jdbc;
    private final LocalImageStore store;
    private final DriveSourceClient drive;
    private final ImageRecoveryService recovery;
    private final ImageJobRepository jobs;
    private final TransactionTemplate transactions;
    private final AtomicBoolean running = new AtomicBoolean();
    private final java.util.concurrent.ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

    ImageRecoveryHandler(JdbcTemplate jdbc, LocalImageStore store, DriveSourceClient drive, ImageRecoveryService recovery,
            ImageJobRepository jobs, org.springframework.transaction.PlatformTransactionManager manager) {
        this.jdbc = jdbc;
        this.store = store;
        this.drive = drive;
        this.recovery = recovery;
        this.jobs = jobs;
        this.transactions = new TransactionTemplate(manager);
    }

    private record Task(UUID id, UUID media, UUID generation, UUID token, long actor, int priority) {}

    @Scheduled(fixedDelayString = "${memay.media.recovery.poll-delay-ms:1000}",
            initialDelayString = "${memay.media.recovery.poll-delay-ms:1000}")
    void poll() {
        if (executor.isShutdown() || !running.compareAndSet(false, true)) return;
        executor.execute(() -> {
            try {
                reconcile();
                transactions.execute(tx -> claim()).ifPresent(this::download);
            } catch (RuntimeException e) {
                org.slf4j.LoggerFactory.getLogger(getClass()).warn("Image recovery poll failed");
            } finally {
                running.set(false);
            }
        });
    }

    private void reconcile() {
        jdbc.update("""
                WITH failed AS (
                    SELECT i.id,coalesce(j.error_code,'IMAGE_JOB_MISSING') AS code
                    FROM image_recovery_item i LEFT JOIN image_job j ON j.id=i.job_id
                    WHERE i.state='QUEUED' AND (j.id IS NULL OR j.status IN ('FAILED','CANCELLED'))
                    LIMIT 100 FOR UPDATE OF i SKIP LOCKED
                )
                UPDATE image_recovery_item i SET state='FAILED',error_code=f.code FROM failed f WHERE i.id=f.id
                """);
    }

    private Optional<Task> claim() {
        if (!Boolean.TRUE.equals(jdbc.queryForObject("SELECT pg_try_advisory_xact_lock(61029025)", Boolean.class)))
            return Optional.empty();
        UUID token = UUID.randomUUID();
        return jdbc.query("""
                WITH candidate AS (
                    SELECT i.id,o.actor_id FROM image_recovery_item i JOIN image_recovery_operation o ON o.id=i.operation_id
                    WHERE (i.state='PENDING' OR (i.state='DOWNLOADING' AND i.lease_until<=clock_timestamp()))
                    AND NOT EXISTS(SELECT 1 FROM image_recovery_item WHERE state='DOWNLOADING' AND lease_until>clock_timestamp())
                    AND NOT EXISTS(SELECT 1 FROM image_migration_apply_item WHERE state='DOWNLOADING' AND lease_until>clock_timestamp())
                    AND NOT EXISTS(SELECT 1 FROM image_migration_row WHERE state='DOWNLOADING' AND lease_until>clock_timestamp())
                    ORDER BY i.priority,o.created_at,i.id LIMIT 1 FOR UPDATE OF i SKIP LOCKED
                )
                UPDATE image_recovery_item i SET state='DOWNLOADING',lease_token=?,lease_until=clock_timestamp()+interval '5 minutes'
                FROM candidate c WHERE i.id=c.id RETURNING i.*,c.actor_id
                """, (r, n) -> new Task(r.getObject("id", UUID.class), r.getObject("media_id", UUID.class),
                        r.getObject("generation_id", UUID.class), token, r.getLong("actor_id"), r.getInt("priority")),
                token).stream().findFirst();
    }

    private void download(Task task) {
        try {
            var binding = transactions.execute(tx -> {
                recovery.requireOwner(task.actor());
                return recovery.current(task.media(), task.generation(), false);
            });
            var source = drive.download(binding.file(), task.token());
            if (!("staging/" + task.token() + "/input").equals(source.inputKey()) || !binding.hash().equals(source.sha256())
                    || !binding.version().equals(source.version()) || binding.bytes() != source.bytes()
                    || !binding.mime().equals(source.mime()) || !binding.hash().equals(store.originalHash(source.inputKey())))
                throw new AdminApiException(409, "SOURCE_CHANGED");
            transactions.executeWithoutResult(tx -> {
                recovery.requireOwner(task.actor());
                if (jdbc.queryForList("""
                        SELECT id FROM image_recovery_item WHERE id=? AND lease_token=? AND state='DOWNLOADING'
                            AND lease_until>clock_timestamp() FOR UPDATE
                        """, UUID.class, task.id(), task.token()).isEmpty()) throw ImageRecoveryService.stale();
                var current = recovery.current(task.media(), task.generation(), true);
                if (current.bindingVersion() != binding.bindingVersion()) throw ImageRecoveryService.stale();
                UUID job = jobs.enqueue(task.media(), task.generation(), JobKind.REBUILD, source.inputKey(),
                        current.recipe(), "rebuild:" + task.generation() + ":" + current.recipe(), task.priority());
                jdbc.update("""
                        UPDATE image_recovery_item SET state='QUEUED',job_id=?,binding_version=?,lease_token=NULL,lease_until=NULL
                        WHERE id=?
                        """, job, current.bindingVersion(), task.id());
            });
        } catch (SourceAccessException e) {
            fail(task, e.code());
        } catch (AdminApiException e) {
            fail(task, e.error);
        } catch (IOException | RuntimeException e) {
            fail(task, "RECOVERY_DOWNLOAD_FAILED");
        }
    }

    private void fail(Task task, String code) {
        jdbc.update("""
                UPDATE image_recovery_item SET state='FAILED',error_code=?,lease_token=NULL,lease_until=NULL
                WHERE id=? AND state='DOWNLOADING' AND lease_token=? AND lease_until>clock_timestamp()
                """, code, task.id(), task.token());
    }

    @PreDestroy void stop() { executor.shutdownNow(); }
}
