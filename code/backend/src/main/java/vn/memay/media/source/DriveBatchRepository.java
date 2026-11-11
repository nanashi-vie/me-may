package vn.memay.media.source;

import java.util.List;
import java.util.Optional;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import vn.memay.common.AdminApiException;

@Repository
@ConditionalOnProperty(prefix = "memay.media.local", name = "enabled", havingValue = "true")
public class DriveBatchRepository {
    final JdbcTemplate db;
    public DriveBatchRepository(JdbcTemplate db) { this.db = db; }
    Map<String, Object> owned(UUID id, long actor, String namespace, boolean lock) {
        return db.queryForList("SELECT * FROM drive_image_batch WHERE id=? AND actor_id=? AND namespace=?"
                + (lock ? " FOR UPDATE" : ""), id, actor, namespace).stream().findFirst()
                .orElseThrow(() -> new AdminApiException(404, "not_found"));
    }
    List<Map<String, Object>> items(UUID id) {
        return db.queryForList("SELECT * FROM drive_image_batch_item WHERE batch_id=? ORDER BY ordinal", id);
    }
    public record Lease(UUID itemId, UUID batchId, UUID token, String fileId, UUID mediaId,
                        UUID sessionId, long actorId, String mode) {}

    Optional<Lease> claim(String namespace) {
        if (!Boolean.TRUE.equals(db.queryForObject("SELECT pg_try_advisory_xact_lock(61029025)", Boolean.class)))
            return Optional.empty();
        db.update("""
                UPDATE drive_image_batch_item SET state='FAILED',error_code='lease_expired',
                  lease_token=NULL,lease_until=NULL
                WHERE state='DOWNLOADING' AND attempts>=3 AND lease_until<=clock_timestamp()
                """);
        expire();
        UUID token = UUID.randomUUID();
        return db.query("""
                WITH candidate AS (
                  SELECT i.id FROM drive_image_batch_item i JOIN drive_image_batch b ON b.id=i.batch_id
                  JOIN admin_user a ON a.id=b.actor_id AND a.active AND a.role='OWNER'
                  LEFT JOIN upload_session s ON s.id=b.session_id
                  WHERE b.namespace=? AND b.state IN ('PENDING','PROCESSING') AND b.expires_at>clock_timestamp()
                    AND (b.session_id IS NULL OR (s.state='OPEN' AND s.expires_at>clock_timestamp()))
                    AND i.attempts<3 AND ((i.state='PENDING' AND i.available_at<=clock_timestamp())
                        OR (i.state='DOWNLOADING' AND i.lease_until<=clock_timestamp()))
                    AND NOT EXISTS(SELECT 1 FROM drive_image_batch_item
                        WHERE state='DOWNLOADING' AND lease_until>clock_timestamp())
                    AND NOT EXISTS(SELECT 1 FROM image_migration_row
                        WHERE state='DOWNLOADING' AND lease_until>clock_timestamp())
                    AND NOT EXISTS(SELECT 1 FROM image_migration_apply_item
                        WHERE state='DOWNLOADING' AND lease_until>clock_timestamp())
                    AND NOT EXISTS(SELECT 1 FROM image_recovery_item
                        WHERE state='DOWNLOADING' AND lease_until>clock_timestamp())
                  ORDER BY b.created_at,i.ordinal LIMIT 1 FOR UPDATE OF i SKIP LOCKED
                )
                UPDATE drive_image_batch_item i SET state='DOWNLOADING',attempts=i.attempts+1,
                  lease_token=?,lease_until=clock_timestamp()+interval '5 minutes',error_code=NULL
                FROM candidate c,drive_image_batch b WHERE i.id=c.id AND b.id=i.batch_id
                RETURNING i.id,i.batch_id,i.file_id,i.media_id,b.session_id,b.actor_id,b.mode
                """, (rs,n) -> new Lease(rs.getObject("id",UUID.class), rs.getObject("batch_id",UUID.class),
                    token, rs.getString("file_id"), rs.getObject("media_id",UUID.class),
                    rs.getObject("session_id",UUID.class), rs.getLong("actor_id"), rs.getString("mode")),
                namespace,token).stream().findFirst();
    }
    Map<String,Object> lockLease(Lease lease) {
        return db.queryForList("""
                SELECT i.* FROM drive_image_batch_item i JOIN drive_image_batch b ON b.id=i.batch_id
                JOIN admin_user a ON a.id=b.actor_id AND a.active AND a.role='OWNER'
                LEFT JOIN upload_session s ON s.id=b.session_id
                WHERE i.id=? AND i.batch_id=? AND i.lease_token=? AND i.state='DOWNLOADING'
                  AND i.lease_until>clock_timestamp() AND b.expires_at>clock_timestamp()
                  AND b.state IN ('PENDING','PROCESSING')
                  AND (b.session_id IS NULL OR (s.state='OPEN' AND s.expires_at>clock_timestamp()))
                FOR UPDATE OF i
                """,lease.itemId(),lease.batchId(),lease.token()).stream().findFirst()
                .orElseThrow(DriveBatchService::conflict);
    }
    void fail(Lease lease,String code,boolean retryable) {
        db.queryForObject("SELECT id FROM drive_image_batch WHERE id=? FOR UPDATE",UUID.class,lease.batchId());
        var item=lockLease(lease);
        boolean retry=retryable && ((Number)item.get("attempts")).intValue()<3;
        db.update("""
                UPDATE drive_image_batch_item SET state=?,error_code=?,lease_token=NULL,lease_until=NULL,
                  available_at=clock_timestamp()+interval '5 seconds' WHERE id=?
                """,retry?"PENDING":"FAILED",code,lease.itemId());
        if (!retry && lease.mediaId()!=null) releaseMedia(lease.mediaId());
        refresh(lease.batchId());
    }
    void releaseMedia(UUID media) {
        db.update("""
                UPDATE temporary_media SET state='DELETE_PENDING',delete_after=clock_timestamp()
                WHERE id=? AND state IN ('UPLOADING','READY')
                """,media);
    }

    void expire() {
        db.update("""
                UPDATE drive_image_batch b SET state=CASE WHEN b.expires_at<=clock_timestamp()
                  THEN 'EXPIRED' ELSE 'CANCELLED' END
                WHERE b.state IN ('PENDING','PROCESSING','READY') AND (
                  b.expires_at<=clock_timestamp()
                  OR NOT EXISTS(SELECT 1 FROM admin_user a WHERE a.id=b.actor_id AND a.active AND a.role='OWNER')
                  OR (b.session_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM upload_session s
                    WHERE s.id=b.session_id AND s.state='OPEN' AND s.expires_at>clock_timestamp())))
                """);
        db.update("""
                UPDATE temporary_media m SET state='DELETE_PENDING',delete_after=clock_timestamp()
                FROM drive_image_batch_item i JOIN drive_image_batch b ON b.id=i.batch_id
                WHERE i.media_id=m.id AND NOT i.admitted AND b.mode='IMPORT'
                  AND (b.state IN ('CANCELLED','EXPIRED') OR i.state IN ('FAILED','CANCELLED'))
                  AND m.state IN ('UPLOADING','READY')
                """);
        db.update("""
                UPDATE drive_image_batch_item i SET state='CANCELLED',lease_token=NULL,lease_until=NULL
                FROM drive_image_batch b WHERE b.id=i.batch_id AND b.state IN ('CANCELLED','EXPIRED')
                  AND NOT i.admitted AND i.state NOT IN ('CANCELLED','FAILED')
                """);
    }

    void refresh(UUID id) {
        db.update("""
                UPDATE drive_image_batch_item i SET state=CASE WHEN j.status='READY' THEN 'READY' ELSE 'FAILED' END,
                  error_code=j.error_code
                FROM image_job j WHERE i.batch_id=? AND i.state='ENCODING'
                  AND j.generation_id=i.generation_id AND j.kind='PROCESS' AND j.status IN ('READY','FAILED','CANCELLED')
                """, id);
        db.update("""
                UPDATE drive_image_batch SET state=CASE WHEN EXISTS(
                    SELECT 1 FROM drive_image_batch_item WHERE batch_id=? AND state IN ('PENDING','DOWNLOADING','ENCODING')
                ) THEN 'PROCESSING' ELSE 'READY' END
                WHERE id=? AND state IN ('PENDING','PROCESSING')
                """, id, id);
    }
}
