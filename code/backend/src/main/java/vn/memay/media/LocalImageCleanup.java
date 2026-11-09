package vn.memay.media;

import java.io.IOException;
import java.time.Clock;
import java.sql.Timestamp;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

@Component
@ConditionalOnProperty(prefix = "memay.media.local", name = "enabled", havingValue = "true")
class LocalImageCleanup {
    private static final org.slf4j.Logger LOG = org.slf4j.LoggerFactory.getLogger(LocalImageCleanup.class);
    private final JdbcTemplate jdbc;
    private final LocalImageStore store;
    private final Clock clock;
    private final TransactionTemplate transactions;

    LocalImageCleanup(JdbcTemplate jdbc, LocalImageStore store, Clock clock,
                      org.springframework.transaction.PlatformTransactionManager manager) {
        this.jdbc = jdbc;
        this.store = store;
        this.clock = clock;
        this.transactions = new TransactionTemplate(manager);
    }

    void runOnce() {
        var cutoff = Timestamp.from(clock.instant().minusSeconds(3600));
        var pending = jdbc.queryForList("""
                SELECT id FROM temporary_media WHERE provider='LOCAL' AND state='DELETE_PENDING' AND delete_after<=?
                UNION
                SELECT id FROM book_media WHERE provider='LOCAL' AND state='DELETE_PENDING' AND updated_at<=?
                LIMIT 100
                """, UUID.class, cutoff, cutoff);
        for (var media : pending) {
            try {
                transactions.executeWithoutResult(tx -> cleanup(media));
            } catch (RuntimeException e) {
                LOG.warn("Local image cleanup deferred: {}", media);
            }
        }
        var retired = jdbc.queryForList("""
                SELECT i.id FROM image_migration_apply_item i JOIN image_migration_apply_book b USING(operation_id,book_id)
                JOIN image_generation g ON g.id=i.id LEFT JOIN image_job j ON j.id=i.job_id
                WHERE b.state IN ('FAILED','ROLLED_BACK') AND b.updated_at<=?
                    AND (j.id IS NULL OR j.status IN ('READY','FAILED','CANCELLED')) LIMIT 100
                """, UUID.class, cutoff);
        for (UUID generation : retired) {
            try {
                transactions.executeWithoutResult(tx -> retireMigration(generation));
            } catch (RuntimeException e) {
                LOG.warn("Local migration generation cleanup deferred: {}", generation);
            }
        }
        // Preserve the owner-scoped receipt tombstone so expired URLs still return 410.
        jdbc.update("""
                DELETE FROM image_migration_row WHERE id IN (
                    SELECT r.id FROM image_migration_row r JOIN image_migration_receipt p ON p.id=r.receipt_id
                    WHERE p.expires_at<=clock_timestamp() AND (r.lease_until IS NULL OR r.lease_until<=clock_timestamp())
                    LIMIT 100 FOR UPDATE OF r SKIP LOCKED)
                """);
        try {
            int deleted = 0;
            for (var staging : store.stagingBefore(cutoff.toInstant())) {
                boolean referenced = Boolean.TRUE.equals(jdbc.queryForObject("""
                        SELECT EXISTS(SELECT 1 FROM image_job j
                          LEFT JOIN temporary_media m ON m.id=j.media_id
                          LEFT JOIN upload_session s ON s.id=m.session_id
                          WHERE (j.lease_token=? AND j.status='PROCESSING' AND j.lease_until>clock_timestamp())
                          OR (j.input_key=? AND (j.status IN ('PENDING','PROCESSING','RETRYING')
                              OR (j.status='FAILED' AND m.state='UPLOADING' AND s.state='OPEN'
                                  AND s.expires_at>clock_timestamp()))))
                        OR EXISTS(SELECT 1 FROM image_migration_row r JOIN image_migration_receipt p ON p.id=r.receipt_id
                          WHERE (r.lease_token=? AND r.lease_until>clock_timestamp())
                            OR (p.expires_at>clock_timestamp()
                              AND ((r.input_id=? AND r.state IN ('QUEUED','PROCESSING','READY')) OR r.preview_id=?)))
                        OR EXISTS(SELECT 1 FROM image_migration_apply_item
                            WHERE lease_token=? AND state='DOWNLOADING' AND lease_until>clock_timestamp())
                        """, Boolean.class, staging, "staging/" + staging + "/input", staging, staging, staging, staging));
                if (!referenced) {
                    store.discardStaging(staging);
                    if (++deleted == 100) break;
                }
            }
        } catch (IOException e) {
            LOG.warn("Image staging cleanup deferred");
        }
    }

    private void retireMigration(UUID generation) {
        var jobs = jdbc.queryForList("""
                SELECT id FROM image_job WHERE generation_id=? AND kind='MIGRATE'
                    AND status IN ('READY','FAILED','CANCELLED') FOR UPDATE SKIP LOCKED
                """, UUID.class, generation);
        if (jobs.isEmpty() && Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM image_job WHERE generation_id=?)
                """, Boolean.class, generation))) return;
        var media = jdbc.queryForList("""
                SELECT media_id FROM image_generation WHERE id=? AND NOT EXISTS(
                    SELECT 1 FROM book_media WHERE serving_generation=?) FOR UPDATE SKIP LOCKED
                """, UUID.class, generation, generation);
        if (media.isEmpty()) return;
        try {
            store.discardGeneration(media.getFirst(), generation);
        } catch (IOException e) {
            throw new IllegalStateException("local_cleanup_failed", e);
        }
        if (!jobs.isEmpty()) jdbc.update("DELETE FROM image_job WHERE id=?", jobs.getFirst());
        jdbc.update("DELETE FROM image_generation WHERE id=?", generation);
    }

    private void cleanup(UUID media) {
        var jobs = jdbc.queryForList("""
                SELECT id,kind,input_key,(status='PROCESSING' AND lease_until>clock_timestamp()) AS active
                FROM image_job WHERE media_id=? FOR UPDATE SKIP LOCKED
                """, media);
        if (jobs.size() != jdbc.queryForObject("SELECT count(*) FROM image_job WHERE media_id=?", Integer.class, media)
                || jobs.stream().anyMatch(j -> Boolean.TRUE.equals(j.get("active")))) return;
        var temp = jdbc.queryForList("SELECT state FROM temporary_media WHERE id=? FOR UPDATE", String.class, media);
        var book = jdbc.queryForList("SELECT state FROM book_media WHERE id=? FOR UPDATE", String.class, media);
        if (temp.isEmpty() && book.isEmpty() || temp.stream().anyMatch(s -> !s.equals("DELETE_PENDING"))
                || book.stream().anyMatch(s -> !s.equals("DELETE_PENDING"))) return;
        // The locks prevent a new claim while filesystem work and row removal are in progress.
        jdbc.update("""
                UPDATE image_job SET status='CANCELLED',lease_token=NULL,lease_until=NULL
                WHERE media_id=? AND status IN ('PENDING','RETRYING','PROCESSING')
                """, media);
        try {
            for (UUID generation : jdbc.queryForList("SELECT id FROM image_generation WHERE media_id=?", UUID.class, media))
                store.discardGeneration(media, generation);
            for (var job : jobs) {
                String key = (String) job.get("input_key");
                if ("PROCESS".equals(job.get("kind")) && key.matches("staging/[a-f0-9-]{36}/input"))
                    store.discardStaging(UUID.fromString(key.split("/")[1]));
            }
        } catch (IOException e) {
            throw new IllegalStateException("local_cleanup_failed", e);
        }
        jdbc.update("DELETE FROM temporary_media WHERE id=? AND provider='LOCAL'", media);
        jdbc.update("DELETE FROM book_media WHERE id=? AND provider='LOCAL'", media);
        jdbc.update("DELETE FROM image_job WHERE media_id=?", media);
        jdbc.update("DELETE FROM image_generation WHERE media_id=?", media);
        jdbc.update("DELETE FROM image_source_binding WHERE media_id=?", media);
        jdbc.update("DELETE FROM image_asset WHERE media_id=?", media);
    }
}
