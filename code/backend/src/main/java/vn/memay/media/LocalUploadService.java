package vn.memay.media;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import tools.jackson.databind.ObjectMapper;
import vn.memay.auth.AdminUser;
import vn.memay.common.AdminApiException;
import vn.memay.media.ImageTypes.JobKind;

@Service
public class LocalUploadService {
    private final JdbcTemplate jdbc;
    private final UploadSessionTransactions sessions;
    private final ObjectProvider<LocalImageStore> stores;
    private final ObjectProvider<ImageJobService> workers;
    private final UploadLimiter limiter;
    private final ObjectMapper json;
    private final String recipe;

    public LocalUploadService(JdbcTemplate jdbc, UploadSessionTransactions sessions,
                              ObjectProvider<LocalImageStore> stores, ObjectProvider<ImageJobService> workers,
                              UploadLimiter limiter, ObjectMapper json,
                              @Value("${memay.media.local.recipe:v1}") String recipe) {
        this.jdbc = jdbc;
        this.sessions = sessions;
        this.stores = stores;
        this.workers = workers;
        this.limiter = limiter;
        this.json = json;
        this.recipe = recipe;
    }

    public record Capability(String provider, String revision, List<String> formats, long maxBytes) {}
    public record Operation(UUID mediaId, UUID jobId, String status, String statusPath, String errorCode) {}

    public Capability capabilities(AdminUser actor) {
        sessions.requireOwner(actor);
        boolean local = stores.getIfAvailable() != null;
        return new Capability(local ? "LOCAL" : "CLOUDINARY", local ? "LOCAL:" + recipe : "CLOUDINARY:1",
                local ? List.of("image/jpeg", "image/png", "image/webp") : List.of("image/jpeg", "image/png"),
                LocalImageStore.MAX_INPUT_BYTES);
    }

    @Transactional
    public Operation upload(UUID session, AdminUser actor, InputStream input, String alt, String source,
                            UUID replace, UUID requestKey, String revision) {
        var capability = capabilities(actor);
        if (!"LOCAL".equals(capability.provider()) || !capability.revision().equals(revision))
            throw new AdminApiException(409, "image_capability_changed");
        if (requestKey == null) throw new AdminApiException(400, "image_request_key_required");
        sessions.lock(session, actor, true);
        if (!Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM image_recipe WHERE version=?)",
                Boolean.class, recipe))) throw new AdminApiException(503, "image_recipe_unavailable");
        var store = stores.getObject();
        UUID staging = UUID.randomUUID();
        try (var limit = limiter.acquire(actor.getId())) {
            var staged = store.stage(staging, input);
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCompletion(int status) {
                    if (status != STATUS_COMMITTED) discard(store, staging);
                }
            });
            var digest = java.security.MessageDigest.getInstance("SHA-256");
            digest.update(staged.sha256().getBytes(java.nio.charset.StandardCharsets.US_ASCII));
            String fingerprint = java.util.HexFormat.of().formatHex(
                    digest.digest(json.writeValueAsBytes(java.util.Arrays.asList(alt, source, replace, revision))));
            var intent = sessions.beginLocal(session, actor, replace, alt, source, requestKey, fingerprint);
            var existing = jdbc.queryForList("SELECT id FROM image_job WHERE media_id=? AND kind='PROCESS'", UUID.class, intent.id());
            if (!existing.isEmpty()) {
                discard(store, staging);
                return operation(existing.getFirst(), actor, false);
            }
            UUID generation = UUID.randomUUID();
            UUID job = workers.getObject().enqueue(intent.id(), generation, JobKind.PROCESS,
                    staged.key(), recipe, "process:" + intent.id(), 0);
            jdbc.update("""
                    UPDATE temporary_media SET generation_id=?,delete_after=(SELECT expires_at FROM upload_session WHERE id=?)
                    WHERE id=?
                    """, generation, session, intent.id());
            return operation(job, actor, false);
        } catch (IOException e) {
            throw new AdminApiException(422, "image_input_unavailable");
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    @Transactional
    public Operation operation(UUID job, AdminUser actor, boolean retry) {
        sessions.requireOwner(actor);
        var row = jdbc.queryForList("""
                SELECT j.media_id,j.status,j.error_code,j.kind,s.id AS session_id,
                       v.actor_id AS verification_actor, m.state AS media_state
                FROM image_job j LEFT JOIN temporary_media m ON m.id=j.media_id
                LEFT JOIN upload_session s ON s.id=m.session_id
                LEFT JOIN image_source_verification v ON v.job_id=j.id
                WHERE j.id=? AND (s.owner_id=? OR v.actor_id=?)
                """, job, actor.getId(), actor.getId()).stream().findFirst()
                .orElseThrow(() -> new AdminApiException(404, "not_found"));
        UUID session = (UUID) row.get("session_id");
        if (session != null) sessions.lock(session, actor, true);
        String status = (String) row.get("status");
        if (retry) {
            if (!"FAILED".equals(status) || !"PROCESS".equals(row.get("kind"))
                    || !"UPLOADING".equals(row.get("media_state")))
                throw new AdminApiException(409, "image_retry_unavailable");
            int changed = jdbc.update("""
                    UPDATE image_job SET status='PENDING',attempts=0,error_code=NULL,available_at=clock_timestamp()
                    WHERE id=? AND status='FAILED' AND EXISTS (
                        SELECT 1 FROM temporary_media WHERE id=image_job.media_id AND state='UPLOADING')
                    """, job);
            if (changed != 1) throw new AdminApiException(409, "image_retry_unavailable");
            jdbc.update("""
                    INSERT INTO audit_event(actor_id,target_type,target_id,action,before_data,after_data,
                        aggregate_version,created_at)
                    VALUES (?,'MEDIA_SOURCE',0,'IMAGE_RETRY','{}',cast(? as jsonb),0,clock_timestamp())
                    """, actor.getId(), json.writeValueAsString(java.util.Map.of("jobId", job)));
            status = "PENDING";
        }
        return new Operation((UUID) row.get("media_id"), job, status,
                "/api/v1/admin/image-operations/" + job, retry ? null : (String) row.get("error_code"));
    }

    private static void discard(LocalImageStore store, UUID id) {
        try {
            store.discardInput(id);
        } catch (IOException ignored) {
            // An unreferenced staging directory can be reclaimed by the sweeper.
        }
    }
}
