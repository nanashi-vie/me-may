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
