package vn.memay.media;

import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import vn.memay.audit.AuditService;
import vn.memay.auth.AdminUser;
import vn.memay.auth.AdminUserRepository;
import vn.memay.catalogue.BookAccess;
import vn.memay.common.AdminApiException;
import vn.memay.media.ImageInventoryService.Selection;
import vn.memay.media.ImageTypes.*;

@Service
@ConditionalOnProperty(prefix = "memay.media.local", name = "enabled", havingValue = "true")
class ImageRecoveryService {
    static final String PATH = "/api/v1/admin/image-recovery";
    private final JdbcTemplate jdbc;
    private final LocalImageStore store;
    private final ImageInventoryService inventory;
    private final BookAccess access;
    private final MediaRecoveryMode mode;
    private final TransactionTemplate transactions;
    private final ImageJobRepository jobs;
    private final AuditService audit;
    private final AdminUserRepository users;

    ImageRecoveryService(JdbcTemplate jdbc, LocalImageStore store, ImageInventoryService inventory, BookAccess access,
            MediaRecoveryMode mode, org.springframework.transaction.PlatformTransactionManager manager,
            ImageJobRepository jobs, AuditService audit, AdminUserRepository users) {
        this.jdbc = jdbc;
        this.store = store;
        this.inventory = inventory;
        this.access = access;
        this.mode = mode;
        this.transactions = new TransactionTemplate(manager);
        this.jobs = jobs;
        this.audit = audit;
        this.users = users;
    }

    record Accepted(UUID operationId, String statusPath, UUID next) {}
    record Item(UUID mediaId, UUID generation, String status, String errorCode) {}
    record Report(UUID operationId, String status, long ready, long failed, long skipped, List<Item> items) {}

    ImageInventoryService.Inventory inventory(AdminUser actor, Selection selection, boolean scan, String afterDisk) {
        access.requireOwner(actor);
        return inventory.inventory(selection, scan, afterDisk);
    }

    Accepted rebuild(AdminUser actor, Selection selection, UUID request) {
        access.requireOwner(actor);
        mode.requireActive();
        if (request == null) throw new AdminApiException(400, "recovery_request_key_required");
        String fingerprint = selection.toString();
        var previous = replay(actor.getId(), request, fingerprint);
        if (previous != null) return previous;
        // Filesystem verification does not hold database write locks.
        var plan = inventory.inventory(selection, false, null);
        return transactions.execute(tx -> {
            requireOwner(actor.getId());
            var replay = replay(actor.getId(), request, fingerprint);
            if (replay != null) return replay;
            UUID operation = UUID.randomUUID();
            jdbc.update("INSERT INTO image_recovery_operation(id,actor_id,request_key,selection) VALUES (?,?,?,?)",
                    operation, actor.getId(), request, fingerprint + "\n" + (plan.next() == null ? "" : plan.next()));
            for (var item : plan.media()) {
                boolean damaged = "MISSING".equals(item.status()) || "CORRUPT".equals(item.status());
                UUID id = UUID.randomUUID();
                int inserted = insertItem(id, operation, item, damaged ? "PENDING" : "SKIPPED",
                        damaged || "OK".equals(item.status()) ? null : item.status());
                if (inserted == 0) insertItem(id, operation, item, "SKIPPED", "ALREADY_QUEUED");
            }
            return accepted(operation, plan.next());
        });
    }

    private int insertItem(UUID id, UUID operation, ImageInventoryService.MediaHealth item, String state, String error) {
        return jdbc.update("""
                INSERT INTO image_recovery_item(id,operation_id,media_id,generation_id,priority,state,error_code)
                VALUES (?,?,?,?,?,?,?) ON CONFLICT (generation_id) WHERE state IN ('PENDING','DOWNLOADING','QUEUED')
                DO NOTHING
                """, id, operation, item.mediaId(), item.generation(), item.priority(), state, error);
    }

    Report status(AdminUser actor, UUID id) {
        access.requireOwner(actor);
        if (jdbc.queryForList("SELECT id FROM image_recovery_operation WHERE id=? AND actor_id=?",
                UUID.class, id, actor.getId()).isEmpty()) throw new AdminApiException(404, "not_found");
        var items = jdbc.query("""
                SELECT i.media_id,i.generation_id,
                    CASE WHEN i.state='QUEUED' AND (j.id IS NULL OR j.status IN ('FAILED','CANCELLED'))
                         THEN 'FAILED' ELSE i.state END AS status,
                    CASE WHEN i.state='QUEUED' AND (j.id IS NULL OR j.status IN ('FAILED','CANCELLED'))
                         THEN coalesce(j.error_code,'IMAGE_JOB_MISSING') ELSE i.error_code END AS error
                FROM image_recovery_item i LEFT JOIN image_job j ON j.id=i.job_id
                WHERE i.operation_id=? ORDER BY i.priority,i.media_id
                """, (r, i) -> {
                    String error = r.getString("error");
                    return new Item(r.getObject(1, UUID.class), r.getObject(2, UUID.class),
                            r.getString("status"), error == null ? null : error.toUpperCase(Locale.ROOT));
                }, id);
        long ready = items.stream().filter(item -> item.status().equals("READY")).count();
        long failed = items.stream().filter(item -> item.status().equals("FAILED")).count();
        long skipped = items.stream().filter(item -> item.status().equals("SKIPPED")).count();
        return new Report(id, ready + failed + skipped == items.size() ? "COMPLETE" : "PENDING",
                ready, failed, skipped, items);
    }

    void complete(JobLease lease, Manifest output) {
        var rows = jdbc.queryForList("""
                SELECT i.id,i.binding_version,o.actor_id FROM image_recovery_item i
                JOIN image_recovery_operation o ON o.id=i.operation_id
                WHERE i.job_id=? AND i.media_id=? AND i.generation_id=? AND i.state='QUEUED' FOR UPDATE OF i
                """, lease.jobId(), lease.mediaId(), lease.generationId());
        if (rows.isEmpty()) throw stale();
        var item = rows.getFirst();
        long actor = (Long) item.get("actor_id");
        requireOwner(actor);
        var current = current(lease.mediaId(), lease.generationId(), true);
        if (current.bindingVersion() != (Long) item.get("binding_version")) throw stale();
        var variants = inventory.variants(lease.mediaId(), lease.generationId());
        if (variants.isEmpty() || !lease.recipeVersion().equals(output.recipeVersion())
                || !current.worker().equals(output.workerDigest()) || !current.config().equals(output.configurationDigest())
                || variants.size() != output.variants().size()
                || !new HashSet<>(variants).equals(new HashSet<>(output.variants())))
            throw new AdminApiException(422, "RECIPE_MISMATCH");
        try {
            if (!current.hash().equals(store.originalHash(lease.inputKey())))
                throw new AdminApiException(422, "SOURCE_CHANGED");
            store.restoreAttempt(new Manifest(lease.mediaId(), lease.generationId(), lease.recipeVersion(), variants), lease.token());
        } catch (IOException e) {
            throw new AdminApiException(422, "recovery_output_not_publishable");
        }
        jobs.markReady(lease.jobId(), lease.token());
        jdbc.update("UPDATE image_recovery_item SET state='READY' WHERE id=?", item.get("id"));
        audit.record(users.findById(actor).orElseThrow(ImageRecoveryService::stale),
                "BOOK", current.book(), "IMAGE_REBUILT", Map.of(),
                Map.of("media", List.of(Map.of("id", lease.mediaId(), "generation", lease.generationId()))), current.bookVersion());
    }

    record Current(long book, long bookVersion, String recipe, String worker, String config, long bindingVersion,
                   String file, String hash, String version, long bytes, String mime) {}

    Current current(UUID media, UUID generation, boolean lock) {
        var result = jdbc.query("""
                SELECT b.id AS book,b.version AS book_version,g.recipe_version,g.input_sha256,r.worker_digest,
                    r.configuration->>'sha256' AS configuration
                FROM book_media m JOIN book_copy b ON b.id=m.book_copy_id
                JOIN image_generation g ON g.id=m.serving_generation AND g.media_id=m.id
                JOIN image_recipe r ON r.version=g.recipe_version
                WHERE m.id=? AND g.id=? AND g.published_at IS NOT NULL AND
                """ + ImageInventoryService.ELIGIBLE + (lock ? " FOR UPDATE OF b,m" : ""),
                (r, i) -> new Object[]{r.getLong("book"), r.getLong("book_version"), r.getString("recipe_version"),
                    r.getString("input_sha256"), r.getString("worker_digest"), r.getString("configuration")},
                media, generation);
        if (result.isEmpty()) throw stale();
        var row = result.getFirst();
        if (row[4] == null || !row[4].toString().matches("sha256:[a-f0-9]{64}")
                || row[5] == null || !row[5].toString().matches("[a-f0-9]{64}"))
            throw new AdminApiException(422, "RECIPE_MISMATCH");
        var binding = jdbc.queryForList("""
                SELECT file_id,sha256,source_version,source_bytes,mime,binding_version FROM image_source_binding
                WHERE media_id=? AND status='VERIFIED' AND sha256=? AND source_version IS NOT NULL
                """ + (lock ? " FOR UPDATE" : ""), media, row[3]);
        if (binding.isEmpty()) throw new AdminApiException(409, "SOURCE_UNVERIFIED");
        var source = binding.getFirst();
        return new Current((Long) row[0], (Long) row[1], (String) row[2], (String) row[4], (String) row[5],
                (Long) source.get("binding_version"), (String) source.get("file_id"), (String) source.get("sha256"),
                (String) source.get("source_version"), (Long) source.get("source_bytes"), (String) source.get("mime"));
    }

    void requireOwner(long actor) {
        if (jdbc.queryForList("SELECT id FROM admin_user WHERE id=? AND role='OWNER' AND active FOR UPDATE",
                Long.class, actor).isEmpty()) throw new AdminApiException(403, "forbidden");
    }

    private Accepted replay(long actor, UUID request, String fingerprint) {
        var existing = jdbc.queryForList("""
                SELECT id,selection FROM image_recovery_operation WHERE actor_id=? AND request_key=?
                """, actor, request);
        if (existing.isEmpty()) return null;
        String stored = (String) existing.getFirst().get("selection");
        int separator = stored.lastIndexOf('\n');
        if (separator < 0 || !fingerprint.equals(stored.substring(0, separator)))
            throw new AdminApiException(409, "image_request_changed");
        String next = stored.substring(separator + 1);
        return accepted((UUID) existing.getFirst().get("id"), next.isEmpty() ? null : UUID.fromString(next));
    }

    private static Accepted accepted(UUID id, UUID next) { return new Accepted(id, PATH + "/rebuild/" + id, next); }
    static AdminApiException stale() { return new AdminApiException(409, "image_recovery_media_changed"); }
}
