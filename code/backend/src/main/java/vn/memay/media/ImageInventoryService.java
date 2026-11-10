package vn.memay.media;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.HashSet;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import vn.memay.common.AdminApiException;
import vn.memay.media.ImageTypes.Variant;

@Service
@ConditionalOnProperty(prefix = "memay.media.local", name = "enabled", havingValue = "true")
class ImageInventoryService {
    static final int LIMIT = 100;
    static final String ELIGIBLE = """
            m.state='ACTIVE' AND m.provider='LOCAL'
            AND (b.deleted_at IS NULL OR b.deleted_at>clock_timestamp()-interval '7 days')
            """;
    private static final String TARGETS = """
            SELECT m.id,m.serving_generation,CASE WHEN b.deleted_at IS NOT NULL THEN 23
                WHEN l.publication_status='PUBLISHED' AND m.role='FRONT' THEN 20
                WHEN l.publication_status='PUBLISHED' THEN 21 ELSE 22 END AS priority
            FROM book_media m JOIN book_copy b ON b.id=m.book_copy_id JOIN listing l ON l.book_copy_id=b.id
            WHERE
            """;

    private final JdbcTemplate jdbc;
    private final LocalImageStore store;

    ImageInventoryService(JdbcTemplate jdbc, LocalImageStore store) {
        this.jdbc = jdbc;
        this.store = store;
    }

    record Selection(List<UUID> mediaIds, String scope, UUID after) {
        Selection {
            mediaIds = mediaIds == null ? List.of() : mediaIds;
            if (mediaIds.size() > LIMIT || mediaIds.stream().anyMatch(java.util.Objects::isNull)
                    || new HashSet<>(mediaIds).size() != mediaIds.size()
                    || (!mediaIds.isEmpty() && (scope != null || after != null))
                    || (scope != null && !List.of("published", "all").contains(scope)))
                throw new AdminApiException(400, "invalid_recovery_scope");
            mediaIds = mediaIds.stream().sorted().toList();
            if (scope == null && mediaIds.isEmpty()) scope = "published";
        }
    }

    record VariantHealth(String size, String mime, String status) {}
    record MediaHealth(UUID mediaId, UUID generation, int priority, String status, List<VariantHealth> variants) {}
    record Untracked(UUID mediaId, UUID generation, String reason) {}
    record Inventory(List<MediaHealth> media, UUID next, List<Untracked> untracked, String nextDisk, boolean unexpectedDiskLayout) {}

    private record Target(UUID media, UUID generation, int priority) {}

    Inventory inventory(Selection selection, boolean scanDisk, String afterDisk) {
        var media = inspect(selection);
        if (!scanDisk) return media;
        if (afterDisk != null && !afterDisk.matches("[0-9a-f-]{36}:[0-9a-f-]{36}"))
            throw new AdminApiException(400, "invalid_disk_cursor");
        var untracked = new ArrayList<Untracked>();
        try {
            var diskPage = store.diskPage(afterDisk, LIMIT + 1);
            var page = diskPage.generations();
            for (var disk : page.stream().limit(LIMIT).toList()) {
                var paths = variants(disk.media(), disk.generation());
                if (paths.isEmpty()) {
                    untracked.add(new Untracked(disk.media(), disk.generation(), "NO_MANIFEST"));
                } else {
                    var names = new HashSet<String>();
                    for (var path : paths) names.add(path.name() + (path.mime().equals("image/jpeg") ? ".jpg" : ".webp"));
                    if (store.hasUnexpectedFiles(disk, names))
                        untracked.add(new Untracked(disk.media(), disk.generation(), "UNTRACKED_FILE"));
                }
            }
            return new Inventory(media.media(), media.next(), untracked, page.size() > LIMIT ? page.get(LIMIT - 1).cursor() : null,
                    diskPage.unexpectedLayout());
        } catch (IOException e) {
            throw new AdminApiException(503, "image_inventory_unavailable");
        }
    }

    private Inventory inspect(Selection selection) {
        var args = new ArrayList<Object>();
        StringBuilder sql = new StringBuilder(TARGETS).append(ELIGIBLE);
        if (!selection.mediaIds().isEmpty()) {
            sql.append(" AND m.id IN (").append(String.join(",", java.util.Collections.nCopies(selection.mediaIds().size(), "?"))).append(")");
            args.addAll(selection.mediaIds());
        } else {
            if ("published".equals(selection.scope())) sql.append(" AND b.deleted_at IS NULL AND l.publication_status='PUBLISHED'");
            if (selection.after() != null) {
                sql.append(" AND m.id>?");
                args.add(selection.after());
            }
        }
        sql.append(" ORDER BY m.id LIMIT 101");
        var targets = jdbc.query(sql.toString(), (r, i) -> new Target(r.getObject(1, UUID.class),
                r.getObject(2, UUID.class), r.getInt(3)), args.toArray());
        var result = new ArrayList<MediaHealth>();
        for (var target : targets.stream().limit(LIMIT).toList()) {
            var variants = variants(target.media(), target.generation()).stream().map(v ->
                    new VariantHealth(v.name(), v.mime(), store.integrity(target.media(), target.generation(), v))).toList();
            String status = variants.isEmpty() ? "NO_MANIFEST"
                    : variants.stream().anyMatch(v -> v.status().equals("CORRUPT")) ? "CORRUPT"
                    : variants.stream().anyMatch(v -> v.status().equals("MISSING")) ? "MISSING" : "OK";
            result.add(new MediaHealth(target.media(), target.generation(), target.priority(), status, variants));
        }
        var found = result.stream().map(MediaHealth::mediaId).collect(java.util.stream.Collectors.toSet());
        for (UUID missing : selection.mediaIds())
            if (!found.contains(missing)) result.add(new MediaHealth(missing, null, 23, "NOT_ELIGIBLE", List.of()));
        return new Inventory(result, targets.size() > LIMIT ? targets.get(LIMIT - 1).media() : null, List.of(), null, false);
    }

    List<Variant> variants(UUID media, UUID generation) {
        return jdbc.query("""
                SELECT v.* FROM image_variant v JOIN image_generation g ON g.id=v.generation_id
                WHERE g.id=? AND g.media_id=? AND g.published_at IS NOT NULL ORDER BY v.name,v.mime
                """, (r, i) -> new Variant(r.getString("name"), r.getString("storage_key"), r.getString("mime"),
                        r.getInt("width"), r.getInt("height"), r.getLong("bytes"), r.getString("sha256")), generation, media);
    }
}
