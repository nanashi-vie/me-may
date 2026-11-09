package vn.memay.media;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import vn.memay.common.AdminApiException;

@Service
public class MediaReadService {
    private final JdbcTemplate jdbc;
    private final MediaGateway cloud;
    private final ObjectProvider<LocalMediaGateway> local;

    public MediaReadService(JdbcTemplate jdbc, MediaGateway cloud, ObjectProvider<LocalMediaGateway> local) {
        this.jdbc = jdbc;
        this.cloud = cloud;
        this.local = local;
    }

    public record Variant(int size, String format, int width, int height) {}

    public Map<UUID, List<Variant>> publicVariants(long bookId) {
        var gateway = local.getIfAvailable();
        if (gateway == null) return Map.of();
        return jdbc.query("""
                SELECT m.id, g.id AS generation, v.name, v.mime, v.width, v.height, v.bytes
                FROM book_media m JOIN image_generation g ON g.id=m.serving_generation AND g.media_id=m.id
                JOIN image_variant v ON v.generation_id=g.id
                WHERE m.book_copy_id=? AND m.state='ACTIVE' AND g.published_at IS NOT NULL
                  AND v.name IN ('320','480','640','1400') AND v.mime IN ('image/jpeg','image/webp')
                ORDER BY v.name::int, v.mime
                """, rows -> {
                    Map<UUID, List<Variant>> result = new HashMap<>();
                    while (rows.next()) {
                        UUID media = rows.getObject("id", UUID.class);
                        UUID generation = rows.getObject("generation", UUID.class);
                        int size = rows.getInt("name");
                        String format = rows.getString("mime").equals("image/jpeg") ? "jpg" : "webp";
                        long bytes = rows.getLong("bytes");
                        if (gateway.available(media, generation, size, format, bytes))
                            result.computeIfAbsent(generation, id -> new ArrayList<>())
                                    .add(new Variant(size, format, rows.getInt("width"), rows.getInt("height")));
                    }
                    return result;
                }, bookId);
    }

    public record Content(InputStream stream, long bytes) {}

    public Content openPublic(UUID media, UUID generation, String key, int size, String format) {
        if (generation != null) return openLocal(media, generation, size, format);
        if (size != 320 && size != 640)
            throw AdminApiException.field("variant", "Kích thước hoặc định dạng ảnh không hợp lệ");
        return new Content(cloud.openPublicPreview(key, size, format), -1);
    }

    InputStream openAdmin(UUID media, UUID generation, String key, int size) {
        if (generation == null) return cloud.openAdminPreview(key, size);
        return openLocal(media, generation, size, "jpg").stream();
    }

    private Content openLocal(UUID media, UUID generation, int size, String format) {
        var gateway = local.getIfAvailable();
        if (gateway == null) throw new AdminApiException(404, "not_found");
        String mime = format.equals("jpg") ? "image/jpeg" : "image/webp";
        var bytes = jdbc.queryForList("""
                SELECT v.bytes FROM image_variant v JOIN image_generation g ON g.id=v.generation_id
                WHERE g.id=? AND g.media_id=? AND g.published_at IS NOT NULL AND v.name=? AND v.mime=?
                """, Long.class, generation, media, Integer.toString(size), mime);
        if (bytes.isEmpty() || !gateway.available(media, generation, size, format, bytes.getFirst()))
            throw new AdminApiException(404, "not_found");
        return new Content(gateway.open(media, generation, size, format, bytes.getFirst()), bytes.getFirst());
    }
}
