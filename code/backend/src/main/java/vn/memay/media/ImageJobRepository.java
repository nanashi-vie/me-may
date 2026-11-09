package vn.memay.media;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import vn.memay.common.AdminApiException;
import vn.memay.media.ImageTypes.JobKind;
import vn.memay.media.ImageTypes.JobLease;
import vn.memay.media.ImageTypes.Manifest;

@Repository
public class ImageJobRepository {
    private final JdbcTemplate jdbc;

    public ImageJobRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional
    public UUID enqueue(UUID media, UUID generation, JobKind kind, String input, String recipe,
                        String dedupe, int priority) {
        jdbc.update("INSERT INTO image_asset(media_id) VALUES (?) ON CONFLICT DO NOTHING", media);
        jdbc.update("""
                INSERT INTO image_generation(id, media_id, recipe_version) VALUES (?, ?, ?)
                ON CONFLICT (id) DO NOTHING
                """, generation, media, recipe);
        return jdbc.query("""
                INSERT INTO image_job(id, media_id, generation_id, kind, input_key, dedupe_key, priority)
                SELECT ?, media_id, id, ?, ?, ?, ? FROM image_generation
                WHERE id = ? AND media_id = ? AND recipe_version = ?
                ON CONFLICT (dedupe_key) WHERE status IN ('PENDING', 'PROCESSING', 'RETRYING')
                DO UPDATE SET dedupe_key = excluded.dedupe_key
                WHERE image_job.generation_id = excluded.generation_id
                  AND image_job.kind = excluded.kind AND image_job.input_key = excluded.input_key
                RETURNING id
                """, (rs, row) -> rs.getObject("id", UUID.class), UUID.randomUUID(), kind.name(), input,
                dedupe, priority, generation, media, recipe).stream().findFirst()
                .orElseThrow(() -> new AdminApiException(409, "image_job_conflict"));
    }

    @Transactional
    public Optional<JobLease> claim() {
        jdbc.update("""
                UPDATE image_job SET status='FAILED', lease_token=NULL, lease_until=NULL, error_code='lease_expired'
                WHERE id IN (SELECT id FROM image_job WHERE status='PROCESSING'
                    AND attempts >= 3 AND lease_until <= clock_timestamp() FOR UPDATE SKIP LOCKED)
                """);
        return jdbc.query("""
                WITH candidate AS (
                    SELECT id FROM image_job
                    WHERE attempts < 3 AND (
                        (status IN ('PENDING','RETRYING') AND available_at <= clock_timestamp())
                        OR (status='PROCESSING' AND lease_until <= clock_timestamp()))
                    ORDER BY priority, available_at, created_at, id
                    LIMIT 1 FOR UPDATE SKIP LOCKED
                )
                UPDATE image_job j SET status='PROCESSING', attempts=j.attempts+1,
                    lease_token=?, lease_until=clock_timestamp()+interval '5 minutes', error_code=NULL
                FROM candidate c, image_generation g
                WHERE j.id=c.id AND g.id=j.generation_id
                RETURNING j.*, g.recipe_version
                """, ImageJobRepository::lease, UUID.randomUUID()).stream().findFirst();
    }

    public Instant heartbeat(UUID id, UUID token) {
        return jdbc.query("""
                UPDATE image_job SET lease_until=clock_timestamp()+interval '5 minutes'
                WHERE id=? AND lease_token=? AND status='PROCESSING' AND lease_until>clock_timestamp()
                RETURNING lease_until
                """, (rs, row) -> rs.getObject(1, OffsetDateTime.class).toInstant(), id, token)
                .stream().findFirst().orElseThrow(ImageJobRepository::stale);
    }

    public void fail(UUID id, UUID token, String code, boolean retryable) {
        requireUpdated(jdbc.update("""
                UPDATE image_job SET status=CASE WHEN ? AND attempts<3 THEN 'RETRYING' ELSE 'FAILED' END,
                    available_at=clock_timestamp()+CASE WHEN attempts=1 THEN interval '10 seconds' ELSE interval '60 seconds' END,
                    error_code=?, lease_token=NULL, lease_until=NULL
                WHERE id=? AND lease_token=? AND status='PROCESSING' AND lease_until>clock_timestamp()
                """, retryable, code, id, token));
    }

    JobLease lockLease(UUID id, UUID token) {
        return jdbc.query("""
                SELECT j.*, g.recipe_version FROM image_job j JOIN image_generation g ON g.id=j.generation_id
                WHERE j.id=? AND j.lease_token=? AND j.status='PROCESSING' AND j.lease_until>clock_timestamp()
                FOR UPDATE OF j
                """, ImageJobRepository::lease, id, token).stream().findFirst().orElseThrow(ImageJobRepository::stale);
    }

    boolean lockUpload(UUID media) {
        return !jdbc.queryForList("""
                SELECT m.id FROM temporary_media m JOIN upload_session s ON s.id=m.session_id
                WHERE m.id=? AND m.state='UPLOADING' AND s.state='OPEN' AND s.expires_at>clock_timestamp()
                FOR UPDATE OF s,m
                """, UUID.class, media).isEmpty();
    }

    void ready(UUID id, UUID token, Manifest manifest) {
        requireUpdated(jdbc.update("""
                UPDATE image_job SET status='READY', lease_token=NULL, lease_until=NULL
                WHERE id=? AND lease_token=? AND status='PROCESSING' AND lease_until>clock_timestamp()
                """, id, token));
        jdbc.update("UPDATE image_generation SET published_at=clock_timestamp() WHERE id=?", manifest.generationId());
        for (var v : manifest.variants()) {
            jdbc.update("""
                    INSERT INTO image_variant(generation_id,name,storage_key,mime,width,height,bytes,sha256)
                    VALUES(?,?,?,?,?,?,?,?)
                    """, manifest.generationId(), v.name(), v.key(), v.mime(), v.width(), v.height(), v.bytes(), v.sha256());
        }
    }

    private static JobLease lease(ResultSet rs, int row) throws SQLException {
        return new JobLease(rs.getObject("id", UUID.class), rs.getObject("lease_token", UUID.class),
                rs.getObject("media_id", UUID.class), rs.getObject("generation_id", UUID.class),
                JobKind.valueOf(rs.getString("kind")), rs.getString("input_key"),
                rs.getString("recipe_version"), rs.getObject("lease_until", OffsetDateTime.class).toInstant());
    }

    private static void requireUpdated(int count) {
        if (count != 1) throw stale();
    }

    private static AdminApiException stale() {
        return new AdminApiException(409, "image_lease_lost");
    }
}
