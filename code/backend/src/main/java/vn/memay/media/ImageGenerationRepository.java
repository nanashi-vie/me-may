package vn.memay.media;

import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ImageGenerationRepository {
    private final JdbcTemplate jdbc;

    public ImageGenerationRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public UUID currentGeneration(UUID mediaId) {
        return jdbc.queryForObject("SELECT serving_generation FROM book_media WHERE id = ?", UUID.class, mediaId);
    }

    public boolean switchGeneration(UUID mediaId, UUID expectedGeneration, UUID generation) {
        return jdbc.update("""
                UPDATE book_media SET provider = 'LOCAL', serving_generation = ?
                WHERE id = ? AND state = 'ACTIVE' AND serving_generation IS NOT DISTINCT FROM ?::uuid
                  AND EXISTS (SELECT 1 FROM image_generation g
                              WHERE g.id = ? AND g.media_id = book_media.id AND g.published_at IS NOT NULL)
                """, generation, mediaId, expectedGeneration, generation) == 1;
    }

    public List<UUID> unservedPublishedGenerations() {
        return jdbc.queryForList("""
                SELECT g.id FROM image_generation g
                WHERE g.published_at IS NOT NULL
                  AND NOT EXISTS (SELECT 1 FROM book_media m WHERE m.serving_generation = g.id)
                ORDER BY g.created_at, g.id
                """, UUID.class);
    }
}
