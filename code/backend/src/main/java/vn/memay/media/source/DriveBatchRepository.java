package vn.memay.media.source;

import java.util.List;
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
