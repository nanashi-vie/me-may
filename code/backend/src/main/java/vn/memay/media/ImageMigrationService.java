package vn.memay.media;

import java.io.IOException;
import java.io.InputStream;
import java.io.StringWriter;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.apache.commons.csv.CSVFormat;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import vn.memay.auth.AdminUser;
import vn.memay.catalogue.BookAccess;
import vn.memay.common.AdminApiException;
import vn.memay.media.ImageMigrationDtos.*;

@Service
@ConditionalOnProperty(prefix = "memay.media.local", name = "enabled", havingValue = "true")
public class ImageMigrationService {
    static final String PATH = "/api/v1/admin/image-migrations";
    static final int MAX_CSV_BYTES = 65_536;
    private static final int MAX_ROWS = 100;
    private static final List<String> HEADER = List.of("media_id", "book_code", "role", "drive_file_id", "expected_book_version");
    private static final String ELIGIBLE = """
             FROM book_media m JOIN book_copy b ON b.id=m.book_copy_id
             WHERE m.provider='CLOUDINARY' AND m.state='ACTIVE' AND b.deleted_at IS NULL
            """;
    private static final String FIELDS = "m.id,b.id AS book_id,b.book_code,b.version,m.role,m.storage_public_id";
    private final JdbcTemplate jdbc;
    private final BookAccess access;
    private final LocalImageStore store;
    private final MediaReadService reads;
    private final ObjectMapper json;
    private final String recipe;

    public ImageMigrationService(JdbcTemplate jdbc, BookAccess access, LocalImageStore store,
                                 MediaReadService reads, ObjectMapper json,
                                 @Value("${memay.media.local.recipe:v1}") String recipe) {
        this.jdbc = jdbc;
        this.access = access;
        this.store = store;
        this.reads = reads;
        this.json = json;
        this.recipe = recipe;
    }

    record Template(String csv, UUID next) {}
    private record Photo(UUID id, long bookId, String code, long version, String role, String key) {}
    private record Line(int number, UUID id, String code, String role, String fileId, Long version, String error) {}
    private record Receipt(Instant expiry, boolean expired) {}

    Template template(AdminUser actor, UUID after) {
        requireOwner(actor);
        var photos = jdbc.query("SELECT " + FIELDS + ELIGIBLE +
                " AND (CAST(? AS uuid) IS NULL OR m.id>?) ORDER BY m.id LIMIT 101",
                ImageMigrationService::photo, after, after);
        var text = new StringWriter();
        try (var printer = CSVFormat.RFC4180.print(text)) {
            printer.printRecord(HEADER);
            for (var photo : photos.stream().limit(MAX_ROWS).toList())
                printer.printRecord(photo.id(), photo.code(), photo.role(), "", photo.version());
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
        return new Template(text.toString(), photos.size() > MAX_ROWS ? photos.get(MAX_ROWS - 1).id() : null);
    }

    @Transactional
    public Accepted preview(AdminUser actor, byte[] csv) {
        requireOwner(actor);
        var lines = parse(csv);
        var ids = new HashMap<UUID, Integer>();
        for (var line : lines) if (line.id() != null) ids.merge(line.id(), 1, Integer::sum);
        Map<UUID, Photo> photos = new HashMap<>();
        if (!ids.isEmpty()) {
            String placeholders = String.join(",", java.util.Collections.nCopies(ids.size(), "?"));
            for (var photo : jdbc.query("SELECT " + FIELDS + ELIGIBLE + " AND m.id IN (" + placeholders + ")",
                    ImageMigrationService::photo, ids.keySet().toArray())) photos.put(photo.id(), photo);
        }
        var receipt = UUID.randomUUID();
        jdbc.update("INSERT INTO image_migration_receipt(id,actor_id,recipe_version) VALUES (?,?,?)",
                receipt, actor.getId(), recipe);
        jdbc.batchUpdate("""
                INSERT INTO image_migration_row(id,receipt_id,line,media_id,book_id,book_code,role,book_version,
                    file_id,cloud_key,state,error_code) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
                """, lines.stream().map(line -> {
                    var photo = photos.get(line.id());
                    String error = guard(line, photo, ids.getOrDefault(line.id(), 0));
                    return new Object[]{UUID.randomUUID(), receipt, line.number(), line.id(),
                        photo == null ? null : photo.bookId(), line.code(), line.role(), line.version(),
                        line.fileId(), error == null ? photo.key() : null, error == null ? "PENDING" : "INVALID", error};
                }).toList());
        return new Accepted(receipt, PATH + "/" + receipt);
    }

    @Transactional(readOnly = true)
    public MigrationPreview status(AdminUser actor, UUID id) {
        var receipt = receipt(actor, id);
        var rows = jdbc.query("SELECT * FROM image_migration_row WHERE receipt_id=? ORDER BY line", (r, i) -> {
            UUID media = r.getObject("media_id", UUID.class);
            String state = r.getString("state");
            String path = state.equals("READY") ? PATH + "/" + id + "/photos/" + media : null;
            return new PreviewRow(r.getInt("line"), media, r.getObject("book_id", Long.class), r.getString("book_code"),
                    r.getObject("book_version", Long.class), r.getString("role"), r.getString("file_id"),
                    r.getString("source_sha256"), r.getString("source_version"),
                    path == null ? null : path + "/current", path, r.getString("error_code"), state);
        }, id);
        boolean complete = rows.stream().allMatch(row -> row.status().equals("READY") || row.status().equals("INVALID"));
        return new MigrationPreview(id, complete ? digest(rows) : null, rows, receipt.expiry(), complete ? "READY" : "PENDING");
    }

    InputStream photo(AdminUser actor, UUID receipt, UUID media, boolean current) {
        receipt(actor, receipt);
        var rows = jdbc.queryForList("""
                SELECT preview_id,book_id,book_code,book_version,role,cloud_key FROM image_migration_row
                WHERE receipt_id=? AND media_id=? AND state='READY'
                """, receipt, media);
        if (rows.isEmpty()) throw new AdminApiException(404, "not_found");
        var row = rows.getFirst();
        if (current) {
            var keys = jdbc.queryForList("SELECT m.storage_public_id" + ELIGIBLE + """
                     AND m.id=? AND b.id=? AND b.book_code=? AND b.version=? AND m.role=? AND m.storage_public_id=?
                    """, String.class, media, row.get("book_id"), row.get("book_code"),
                    row.get("book_version"), row.get("role"), row.get("cloud_key"));
            if (keys.isEmpty()) throw new AdminApiException(409, "book_version_conflict");
            return reads.openAdmin(media, null, keys.getFirst(), 1280);
        }
        try {
            return store.openMigrationPreview((UUID) row.get("preview_id"));
        } catch (IOException e) {
            throw new AdminApiException(404, "not_found");
        }
    }

    private Receipt receipt(AdminUser actor, UUID id) {
        requireOwner(actor);
        var receipt = jdbc.query("""
                SELECT expires_at,expires_at<=clock_timestamp() AS expired FROM image_migration_receipt
                WHERE id=? AND actor_id=?
                """, (r, i) -> new Receipt(r.getObject(1, OffsetDateTime.class).toInstant(), r.getBoolean(2)),
                id, actor.getId()).stream().findFirst().orElseThrow(() -> new AdminApiException(404, "not_found"));
        if (receipt.expired()) throw new AdminApiException(410, "image_migration_expired");
        return receipt;
    }

    private void requireOwner(AdminUser actor) {
        access.requireOwner(actor);
        if (!actor.isActive()) throw new AdminApiException(403, "forbidden");
    }

    private String digest(List<PreviewRow> rows) {
        try {
            var canonical = rows.stream().map(row -> java.util.Arrays.asList(row.line(), row.mediaId(),
                    row.bookId(), row.bookCode(), row.bookVersion(), row.role(), row.fileId(), row.sourceSha256(),
                    row.sourceVersion(), row.errorCode(), row.status())).toList();
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(json.writeValueAsBytes(canonical)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static Photo photo(ResultSet r, int i) throws SQLException {
        return new Photo(r.getObject("id", UUID.class), r.getLong("book_id"), r.getString("book_code"),
                r.getLong("version"), r.getString("role"), r.getString("storage_public_id"));
    }

    private static List<Line> parse(byte[] bytes) {
        if (bytes.length > MAX_CSV_BYTES) throw new AdminApiException(413, "manifest_too_large");
        try {
            String text = StandardCharsets.UTF_8.newDecoder().decode(ByteBuffer.wrap(bytes)).toString();
            if (text.startsWith("\uFEFF")) text = text.substring(1);
            var format = CSVFormat.RFC4180.builder().setHeader().setSkipHeaderRecord(true).get();
            try (var csv = format.parse(new java.io.StringReader(text))) {
                if (!csv.getHeaderNames().equals(HEADER)) throw AdminApiException.field("file", "Header CSV không đúng mẫu");
                var lines = new ArrayList<Line>();
                for (var row : csv) {
                    int number = Math.toIntExact(row.getRecordNumber()) + 1;
                    if (lines.size() == MAX_ROWS)
                        throw new AdminApiException(422, "manifest_too_many_rows", Map.of("row_" + number, List.of("Tối đa 100 ảnh")), null);
                    if (row.size() != HEADER.size()) {
                        lines.add(new Line(number, null, null, null, null, null, "invalid_columns"));
                        continue;
                    }
                    var id = uuid(row.get(0).strip());
                    String code = row.get(1).strip(), role = row.get(2).strip(), file = row.get(3).strip();
                    Long version = version(row.get(4).strip());
                    String error = id == null ? "invalid_media_id" : code.isEmpty() ? "missing_book_code"
                            : role.isEmpty() ? "missing_role" : file.isEmpty() ? "missing_drive_file_id"
                            : !file.matches("[A-Za-z0-9_-]{1,200}") ? "invalid_drive_file_id"
                            : version == null ? "invalid_book_version" : null;
                    lines.add(new Line(number, id, bounded(code, 32), bounded(role, 16),
                            file.matches("[A-Za-z0-9_-]{1,200}") ? file : null, version, error));
                }
                if (lines.isEmpty()) throw AdminApiException.field("file", "CSV chưa có ảnh");
                return lines;
            }
        } catch (CharacterCodingException e) {
            throw AdminApiException.field("file", "CSV phải dùng UTF-8");
        } catch (IOException | java.io.UncheckedIOException | IllegalArgumentException e) {
            throw AdminApiException.field("file", "CSV không hợp lệ");
        }
    }

    private static String bounded(String value, int max) {
        return value.length() <= max ? value : null;
    }

    private static UUID uuid(String value) {
        try {
            UUID id = UUID.fromString(value);
            return id.toString().equalsIgnoreCase(value) ? id : null;
        } catch (IllegalArgumentException e) { return null; }
    }

    private static Long version(String value) {
        try { return value.matches("[0-9]{1,19}") ? Long.parseLong(value) : null; }
        catch (NumberFormatException e) { return null; }
    }

    private static String guard(Line line, Photo photo, int occurrences) {
        if (line.error() != null) return line.error();
        if (occurrences > 1) return "duplicate_media_id";
        if (photo == null) return "media_not_eligible";
        if (!photo.code().equals(line.code())) return "book_code_mismatch";
        if (!photo.role().equals(line.role())) return "role_mismatch";
        return photo.version() == line.version() ? null : "book_version_conflict";
    }
}
