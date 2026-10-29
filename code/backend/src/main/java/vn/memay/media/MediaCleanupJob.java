package vn.memay.media;

import org.springframework.stereotype.Component;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.jdbc.core.JdbcTemplate;
import java.time.Clock;
import java.util.UUID;

@Component
public class MediaCleanupJob {
    private final JdbcTemplate jdbc;
    private final MediaGateway gateway;
    private final Clock clock;
    private final UploadSessionTransactions sessions;

    public MediaCleanupJob(JdbcTemplate jdbc, MediaGateway gateway, Clock clock, UploadSessionTransactions sessions) {
        this.jdbc = jdbc;
        this.gateway = gateway;
        this.clock = clock;
        this.sessions = sessions;
    }

    @Scheduled(fixedDelayString = "${memay.media.cleanup-delay-ms:600000}", initialDelayString = "${memay.media.cleanup-delay-ms:600000}")
    public void runOnce() {
        sessions.expire();
        var temporary = jdbc.queryForList("select id from temporary_media where state='DELETE_PENDING' and delete_after<=? order by delete_after,id limit 100", UUID.class, java.sql.Timestamp.from(clock.instant()));
        for (UUID id : temporary) {
            var keys = jdbc.queryForList("select storage_public_id from temporary_media where id=? and state='DELETE_PENDING'", String.class, id);
            if (keys.isEmpty()) continue;
            try {
                gateway.delete(keys.getFirst());
                jdbc.update("delete from temporary_media where id=? and state='DELETE_PENDING'", id);
            } catch (RuntimeException e) {
                org.slf4j.LoggerFactory.getLogger(MediaCleanupJob.class).warn("Temporary media cleanup deferred: {}", id);
            }
        }
        // Conditional claim shares the row lock used by attach. ACTIVE can never be
        // claimed.
        jdbc.update(
                "update book_media set state='DELETE_PENDING',updated_at=? where id in (select id from book_media where state='UPLOADING' and updated_at<? order by updated_at,id limit 100 for update skip locked) and state='UPLOADING'",
                java.sql.Timestamp.from(clock.instant()), java.sql.Timestamp.from(clock.instant().minusSeconds(3600)));
        var pending = jdbc.queryForList(
                "select id from book_media where state='DELETE_PENDING' order by updated_at,id limit 100", UUID.class);
        for (var id : pending)
            cleanupPending(id);
    }

    // Same cleanup path, scoped to one operation for safe test/manual recovery.
    void cleanupPending(UUID id) {
        var keys = jdbc.queryForList("select storage_public_id from book_media where id=? and state='DELETE_PENDING'",
                String.class, id);
        if (keys.isEmpty())
            return;
        try {
            gateway.delete(keys.getFirst());
            jdbc.update("delete from book_media where id=? and state='DELETE_PENDING'", id);
        } catch (RuntimeException e) {
            org.slf4j.LoggerFactory.getLogger(MediaCleanupJob.class).warn("Media cleanup deferred: {}", id);
        }
    }
}
