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
        try {
            for (var staging : store.stagingBefore(cutoff.toInstant())) {
                boolean referenced = Boolean.TRUE.equals(jdbc.queryForObject("""
                        SELECT EXISTS(SELECT 1 FROM image_job j
                          LEFT JOIN temporary_media m ON m.id=j.media_id
                          LEFT JOIN upload_session s ON s.id=m.session_id
                          WHERE (j.lease_token=? AND j.status='PROCESSING' AND j.lease_until>clock_timestamp())
                          OR (j.input_key=? AND (j.status IN ('PENDING','PROCESSING','RETRYING')
                              OR (j.status='FAILED' AND m.state='UPLOADING' AND s.state='OPEN'
                                  AND s.expires_at>clock_timestamp()))))
                        """, Boolean.class, staging, "staging/" + staging + "/input"));
                if (!referenced) store.discardStaging(staging);
            }
        } catch (IOException e) {
            LOG.warn("Image staging cleanup deferred");
        }
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
