package vn.memay.media;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import vn.memay.media.ImageTypes.SourceBinding;
import vn.memay.media.ImageTypes.SourceStatus;

@Repository
public class SourceBindingRepository {
    private final JdbcTemplate jdbc;

    public SourceBindingRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void requireVerifiedForBook(long bookId) {
        var roles = jdbc.queryForList("""
                SELECT m.role FROM book_media m
                JOIN image_generation g ON g.id=m.serving_generation
                LEFT JOIN image_source_binding b ON b.media_id=m.id
                WHERE m.book_copy_id=? AND m.state='ACTIVE' AND m.provider='LOCAL'
                    AND (b.status IS DISTINCT FROM 'VERIFIED' OR g.input_sha256 IS NULL
                        OR b.sha256 IS DISTINCT FROM g.input_sha256)
                ORDER BY m.role
                """, String.class, bookId);
        if (!roles.isEmpty()) throw new vn.memay.common.AdminApiException(409, "image_source_unverified",
                java.util.Map.of("media", roles), null);
    }

    public void saveVerified(UUID mediaId, String fileId, String hash, String version, long bytes,
                             String mime, long expectedVersion) {
        int updated = jdbc.update("""
                INSERT INTO image_source_binding(media_id,file_id,sha256,source_version,source_bytes,
                    mime,status,binding_version,verified_at)
                VALUES (?,?,?,?,?,?,'VERIFIED',?+1,clock_timestamp())
                ON CONFLICT (media_id) DO UPDATE SET file_id=excluded.file_id, sha256=excluded.sha256,
                    source_version=excluded.source_version, source_bytes=excluded.source_bytes, mime=excluded.mime,
                    status='VERIFIED', binding_version=excluded.binding_version, verified_at=excluded.verified_at
                WHERE image_source_binding.binding_version=?
                """, mediaId, fileId, hash, version, bytes, mime, expectedVersion, expectedVersion);
        if (updated != 1) throw new vn.memay.common.AdminApiException(409, "source_binding_conflict");
    }

    public Optional<SourceBinding> find(UUID mediaId) {
        return jdbc.query("""
                SELECT file_id, sha256, source_version, source_bytes, mime, status, binding_version, verified_at
                FROM image_source_binding WHERE media_id = ?
                """, (rs, row) -> {
            var verified = rs.getObject("verified_at", OffsetDateTime.class);
            return new SourceBinding(mediaId, rs.getString("file_id"), rs.getString("sha256"),
                    rs.getString("source_version"), rs.getLong("source_bytes"), rs.getString("mime"),
                    SourceStatus.valueOf(rs.getString("status")), rs.getLong("binding_version"),
                    verified == null ? null : verified.toInstant());
        }, mediaId).stream().findFirst();
    }
}
