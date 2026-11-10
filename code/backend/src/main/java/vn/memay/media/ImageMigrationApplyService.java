package vn.memay.media;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.memay.audit.AuditService;
import vn.memay.auth.AdminUser;
import vn.memay.auth.AdminUserRepository;
import vn.memay.catalogue.BookAccess;
import vn.memay.common.AdminApiException;
import vn.memay.media.ImageMigrationDtos.*;

@Service
@ConditionalOnProperty(prefix = "memay.media.local", name = "enabled", havingValue = "true")
class ImageMigrationApplyService {
    private final JdbcTemplate jdbc;
    private final ImageMigrationService previews;
    private final BookAccess access;
    private final AdminUserRepository users;
    private final SourceBindingRepository sources;
    private final AuditService audit;

    ImageMigrationApplyService(JdbcTemplate jdbc, ImageMigrationService previews, BookAccess access,
            AdminUserRepository users, SourceBindingRepository sources, AuditService audit) {
        this.jdbc = jdbc;
        this.previews = previews;
        this.access = access;
        this.users = users;
        this.sources = sources;
        this.audit = audit;
    }

    @Transactional
    public ApplyAccepted apply(AdminUser actor, UUID receipt, Apply request) {
        if (request == null || request.requestKey() == null || request.digest() == null
                || !request.digest().matches("[a-f0-9]{64}") || request.confirmedMediaIds() == null
                || request.confirmedMediaIds().isEmpty() || request.confirmedMediaIds().size() > 100
                || request.confirmedMediaIds().stream().anyMatch(java.util.Objects::isNull)
                || new HashSet<>(request.confirmedMediaIds()).size() != request.confirmedMediaIds().size())
            throw new AdminApiException(400, "invalid_image_migration_apply");
        access.requireOwner(actor);
        lockOwner(actor.getId());
        String selection = request.confirmedMediaIds().stream().sorted().map(UUID::toString)
                .collect(java.util.stream.Collectors.joining(","));
        var existing = jdbc.queryForList("""
                SELECT id,receipt_id,digest,selection FROM image_migration_apply WHERE actor_id=? AND request_key=?
                """, actor.getId(), request.requestKey());
        if (!existing.isEmpty()) {
            var row = existing.getFirst();
            if (!receipt.equals(row.get("receipt_id")) || !request.digest().equals(row.get("digest"))
                    || !selection.equals(row.get("selection"))) throw conflict("image_request_changed");
            return accepted(receipt, (UUID) row.get("id"));
        }
        if (operation(actor.getId(), receipt) != null) throw conflict("image_migration_already_submitted");

        var preview = previews.status(actor, receipt);
        if (!request.digest().equals(preview.digest())) throw conflict("image_migration_preview_changed");
        var confirmed = new HashSet<>(request.confirmedMediaIds());
        var selected = jdbc.queryForList("""
                SELECT * FROM image_migration_row WHERE receipt_id=? AND state='READY' ORDER BY line FOR UPDATE
                """, receipt).stream().filter(row -> confirmed.contains(row.get("media_id"))).toList();
        if (selected.size() != confirmed.size()) throw conflict("image_migration_selection_changed");
        var groups = new TreeMap<Long, List<Map<String, Object>>>();
        for (var row : selected) groups.computeIfAbsent((Long) row.get("book_id"), key -> new ArrayList<>()).add(row);

        for (var group : groups.entrySet()) {
            long book = group.getKey();
            long version = (Long) group.getValue().getFirst().get("book_version");
            lockBook(book, version);
            for (var photo : group.getValue()) {
                if (!Long.valueOf(version).equals(photo.get("book_version"))) throw conflict("book_version_conflict");
                requirePhoto(book, (UUID) photo.get("media_id"), (String) photo.get("role"), (String) photo.get("cloud_key"), null);
            }
        }
        UUID id = UUID.randomUUID();
        int inserted = jdbc.update("""
                INSERT INTO image_migration_apply(id,receipt_id,actor_id,request_key,digest,selection,recipe_version)
                SELECT ?,id,actor_id,?,?,?,recipe_version FROM image_migration_receipt
                WHERE id=? AND actor_id=? AND expires_at>clock_timestamp()
                """, id, request.requestKey(), request.digest(), selection, receipt, actor.getId());
        if (inserted != 1) throw new AdminApiException(410, "image_migration_expired");
        for (var group : groups.entrySet()) {
            jdbc.update("INSERT INTO image_migration_apply_book(operation_id,book_id,expected_version) VALUES (?,?,?)",
                    id, group.getKey(), group.getValue().getFirst().get("book_version"));
            jdbc.batchUpdate("""
                    INSERT INTO image_migration_apply_item(id,operation_id,book_id,media_id,role,cloud_key,
                        file_id,source_sha256,source_version,source_mime,source_bytes)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?)
                    """, group.getValue().stream().map(row -> new Object[]{UUID.randomUUID(), id, group.getKey(),
                            row.get("media_id"), row.get("role"), row.get("cloud_key"), row.get("file_id"),
                            row.get("source_sha256"), row.get("source_version"), row.get("source_mime"),
                            row.get("source_bytes")}).toList());
        }
        return accepted(receipt, id);
    }

    public ApplyStatus status(AdminUser actor, UUID receipt) {
        access.requireOwner(actor);
        return result(requireOperation(actor.getId(), receipt));
    }

    @Transactional
    public ApplyStatus rollback(AdminUser actor, UUID receipt, Rollback request) {
        if (request == null || request.requestKey() == null || request.expectedBookVersions() == null
                || request.expectedBookVersions().isEmpty() || request.expectedBookVersions().size() > 100
                || request.expectedBookVersions().entrySet().stream().anyMatch(e ->
                    e.getKey() == null || e.getKey() <= 0 || e.getValue() == null || e.getValue() < 0))
            throw new AdminApiException(400, "invalid_image_migration_rollback");
        access.requireOwner(actor);
        lockOwner(actor.getId());
        UUID id = requireOperation(actor.getId(), receipt);
        var versions = new TreeMap<>(request.expectedBookVersions());
        String fingerprint = versions.toString();
        var replay = jdbc.queryForList("""
                SELECT operation_id,versions FROM image_migration_rollback WHERE actor_id=? AND request_key=?
                """, actor.getId(), request.requestKey());
        if (!replay.isEmpty()) {
            var saved = replay.getFirst();
            if (!id.equals(saved.get("operation_id")) || !fingerprint.equals(saved.get("versions")))
                throw conflict("image_request_changed");
            return result(id);
        }
        for (var entry : versions.entrySet()) {
            long book = entry.getKey(), expected = entry.getValue();
            var state = lockGroup(id, book);
            if (!"APPLIED".equals(state.get("state")) || !Long.valueOf(expected).equals(state.get("applied_version")))
                throw conflict("book_version_conflict");
            lockBook(book, expected);
            var photos = items(id, book);
            for (var photo : photos) {
                requirePhoto(book, photo.media(), photo.role(), photo.key(), photo.generation());
                restoreBinding(photo);
                jdbc.update("""
                        UPDATE book_media SET provider='CLOUDINARY',serving_generation=NULL,updated_at=clock_timestamp()
                        WHERE id=?
                        """, photo.media());
            }
            long version = touchBook(book);
            jdbc.update("""
                    UPDATE image_migration_apply_book SET state='ROLLED_BACK',rollback_version=?,updated_at=clock_timestamp()
                    WHERE operation_id=? AND book_id=?
                    """, version, id, book);
            record(actor, book, photos, "LOCAL", "CLOUDINARY", "IMAGE_MIGRATION_ROLLED_BACK", version);
        }
        jdbc.update("INSERT INTO image_migration_rollback(actor_id,request_key,operation_id,versions) VALUES (?,?,?,?)",
                actor.getId(), request.requestKey(), id, fingerprint);
        return result(id);
    }

    @Transactional
    public void finishBook(UUID id, long book, long actorId) {
        lockOwner(actorId);
        var group = lockGroup(id, book);
        if (!"PENDING".equals(group.get("state"))) return;
        var photoFailure = jdbc.queryForList("""
                SELECT CASE WHEN i.state='QUEUED' AND j.id IS NULL THEN 'image_job_missing'
                            ELSE coalesce(i.error_code,j.error_code,'image_encode_failed') END
                FROM image_migration_apply_item i LEFT JOIN image_job j ON j.id=i.job_id
                WHERE i.operation_id=? AND i.book_id=? AND (i.state='FAILED' OR j.status IN ('FAILED','CANCELLED')
                    OR (i.state='QUEUED' AND j.id IS NULL))
                ORDER BY i.id LIMIT 1
                """, String.class, id, book);
        if (!photoFailure.isEmpty()) {
            failBook(id, book, photoFailure.getFirst());
            return;
        }
        var photos = items(id, book);
        boolean ready = Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT NOT EXISTS(SELECT 1 FROM image_migration_apply_item i LEFT JOIN image_job j ON j.id=i.job_id
                    WHERE i.operation_id=? AND i.book_id=? AND j.status IS DISTINCT FROM 'READY')
                """, Boolean.class, id, book));
        if (!ready) return;
        lockBook(book, (Long) group.get("expected_version"));
        for (var photo : photos) {
            requirePhoto(book, photo.media(), photo.role(), photo.key(), null);
            var prior = jdbc.queryForList("""
                    SELECT to_jsonb(b)::text FROM image_source_binding b WHERE media_id=? FOR UPDATE
                    """, String.class, photo.media());
            long bindingVersion = sources.find(photo.media()).map(ImageTypes.SourceBinding::bindingVersion).orElse(0L);
            jdbc.update("UPDATE image_migration_apply_item SET previous_binding=CAST(? AS jsonb) WHERE id=?",
                    prior.isEmpty() ? null : prior.getFirst(), photo.generation());
            sources.saveVerified(photo.media(), photo.file(), photo.hash(), photo.sourceVersion(), photo.bytes(),
                    photo.mime(), bindingVersion);
            jdbc.update("""
                    UPDATE book_media SET provider='LOCAL',serving_generation=?,updated_at=clock_timestamp() WHERE id=?
                    """, photo.generation(), photo.media());
        }
        if (Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM listing WHERE book_copy_id=? AND publication_status='PUBLISHED')
                """, Boolean.class, book))) sources.requireVerifiedForBook(book);
        long version = touchBook(book);
        jdbc.update("""
                UPDATE image_migration_apply_book SET state='APPLIED',applied_version=?,updated_at=clock_timestamp()
                WHERE operation_id=? AND book_id=?
                """, version, id, book);
        var actor = users.findById(actorId).orElseThrow(() -> new AdminApiException(403, "forbidden"));
        record(actor, book, photos, "CLOUDINARY", "LOCAL", "IMAGE_MIGRATION_APPLIED", version);
    }

    void failBook(UUID id, long book, String code) {
        jdbc.update("""
                UPDATE image_migration_apply_book SET state='FAILED',error_code=?,updated_at=clock_timestamp()
                WHERE operation_id=? AND book_id=? AND state='PENDING'
                """, code, id, book);
    }

    private void restoreBinding(Item photo) {
        if (photo.priorBinding() == null) {
            jdbc.update("DELETE FROM image_source_binding WHERE media_id=?", photo.media());
        } else {
            jdbc.update("""
                    UPDATE image_source_binding b SET file_id=p.file_id,sha256=p.sha256,
                        source_version=p.source_version,source_bytes=p.source_bytes,mime=p.mime,
                        status=p.status,binding_version=b.binding_version+1,verified_at=p.verified_at
                    FROM jsonb_populate_record(NULL::image_source_binding,CAST(? AS jsonb)) p
                    WHERE b.media_id=?
                    """, photo.priorBinding(), photo.media());
        }
    }

    private record Item(UUID generation, UUID media, String role, String key, String file, String hash,
                        String sourceVersion, String mime, long bytes, String priorBinding) {}

    private List<Item> items(UUID id, long book) {
        return jdbc.query("""
                SELECT *,previous_binding::text AS prior FROM image_migration_apply_item
                WHERE operation_id=? AND book_id=? ORDER BY media_id
                """, (r, i) -> new Item(r.getObject("id", UUID.class), r.getObject("media_id", UUID.class),
                        r.getString("role"), r.getString("cloud_key"), r.getString("file_id"), r.getString("source_sha256"),
                        r.getString("source_version"), r.getString("source_mime"), r.getLong("source_bytes"),
                        r.getString("prior")), id, book);
    }

    private void lockOwner(long actor) {
        if (jdbc.queryForList("SELECT id FROM admin_user WHERE id=? AND active AND role='OWNER' FOR UPDATE",
                Long.class, actor).isEmpty()) throw new AdminApiException(403, "forbidden");
    }

    private void lockBook(long book, long version) {
        if (jdbc.queryForList("SELECT id FROM book_copy WHERE id=? AND version=? AND deleted_at IS NULL FOR UPDATE",
                Long.class, book, version).isEmpty()) throw conflict("book_version_conflict");
    }

    private long touchBook(long book) {
        return jdbc.queryForObject("""
                UPDATE book_copy SET version=version+1,updated_at=clock_timestamp() WHERE id=? RETURNING version
                """, Long.class, book);
    }

    private Map<String, Object> lockGroup(UUID id, long book) {
        return jdbc.queryForList("""
                SELECT state,expected_version,applied_version FROM image_migration_apply_book
                WHERE operation_id=? AND book_id=? FOR UPDATE
                """, id, book).stream().findFirst().orElseThrow(() -> conflict("book_version_conflict"));
    }

    private void requirePhoto(long book, UUID media, String role, String key, UUID generation) {
        String provider = generation == null ? "CLOUDINARY" : "LOCAL";
        if (jdbc.queryForList("""
                SELECT id FROM book_media WHERE id=? AND book_copy_id=? AND role=? AND state='ACTIVE'
                    AND storage_public_id=? AND provider=? AND serving_generation IS NOT DISTINCT FROM CAST(? AS uuid)
                FOR UPDATE
                """, UUID.class, media, book, role, key, provider, generation).isEmpty())
            throw conflict("image_migration_media_changed");
    }

    private UUID operation(long actor, UUID receipt) {
        return jdbc.queryForList("SELECT id FROM image_migration_apply WHERE receipt_id=? AND actor_id=?",
                UUID.class, receipt, actor).stream().findFirst().orElse(null);
    }

    private UUID requireOperation(long actor, UUID receipt) {
        UUID id = operation(actor, receipt);
        if (id == null) throw new AdminApiException(404, "not_found");
        return id;
    }

    private ApplyStatus result(UUID id) {
        var books = jdbc.query("""
                SELECT book_id,coalesce(rollback_version,applied_version) AS book_version,state,error_code
                FROM image_migration_apply_book WHERE operation_id=? ORDER BY book_id
                """, (r, i) -> new BookResult(r.getLong("book_id"), r.getObject("book_version", Long.class),
                        r.getString("state"), r.getString("error_code")), id);
        String state = books.stream().anyMatch(book -> book.status().equals("PENDING")) ? "PENDING"
                : books.stream().map(BookResult::status).distinct().count() == 1 ? books.getFirst().status() : "PARTIAL";
        return new ApplyStatus(id, state, books);
    }

    private void record(AdminUser actor, long book, List<Item> photos, String before, String after, String action, long version) {
        audit.record(actor, "BOOK", book, action, auditMedia(photos, before), auditMedia(photos, after), version);
    }

    private static Map<String, Object> auditMedia(List<Item> photos, String provider) {
        return Map.of("media", photos.stream().map(photo ->
                Map.of("id", photo.media(), "role", photo.role(), "provider", provider)).toList());
    }

    private static ApplyAccepted accepted(UUID receipt, UUID operation) {
        return new ApplyAccepted(operation, ImageMigrationService.PATH + "/" + receipt + "/apply");
    }

    private static AdminApiException conflict(String code) { return new AdminApiException(409, code); }
}
