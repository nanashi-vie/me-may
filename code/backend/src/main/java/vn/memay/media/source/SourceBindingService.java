package vn.memay.media.source;

import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import vn.memay.auth.AdminUser;
import vn.memay.common.AdminApiException;
import vn.memay.media.ImageJobRepository;
import vn.memay.media.ImageTypes.JobKind;
import vn.memay.media.ImageTypes.JobLease;
import vn.memay.media.SourceBindingRepository;

@Service
@ConditionalOnProperty(prefix = "memay.media.local", name = "enabled", havingValue = "true")
public class SourceBindingService {
    private final JdbcTemplate jdbc;
    private final SourceBindingRepository bindings;
    private final ImageJobRepository jobs;
    private final ObjectMapper json;

    public SourceBindingService(JdbcTemplate jdbc, SourceBindingRepository bindings, ImageJobRepository jobs,
                                ObjectMapper json) {
        this.jdbc = jdbc;
        this.bindings = bindings;
        this.jobs = jobs;
        this.json = json;
    }

    record Target(UUID generation, String sha, String recipe, Long bookId, Long bookVersion) {}
    record Candidate(long actor, UUID key, String fileId, long bindingVersion, Long bookId, Long bookVersion) {}
    public record Status(String status, long bindingVersion, Long bookVersion) {}

    @Transactional
    public UUID verify(UUID mediaId, String fileId, long expectedBindingVersion, Long expectedBookVersion,
                       UUID requestKey, AdminUser actor) {
        requireOwner(actor);
        if (fileId == null || !fileId.matches("[A-Za-z0-9_-]{1,200}") || requestKey == null
                || expectedBindingVersion < 0 || (expectedBookVersion != null && expectedBookVersion < 0))
            throw new AdminApiException(400, "invalid_source_request");
        lockOwner(actor.getId());
        var previous = jdbc.query("""
                SELECT j.id,j.media_id,v.file_id,v.binding_version,v.book_version
                FROM image_source_verification v JOIN image_job j ON j.id=v.job_id
                WHERE v.actor_id=? AND v.request_key=?
                """, (rs, row) -> {
            if (!mediaId.equals(rs.getObject("media_id", UUID.class)) || !fileId.equals(rs.getString("file_id"))
                    || expectedBindingVersion != rs.getLong("binding_version")
                    || !Objects.equals(expectedBookVersion, rs.getObject("book_version", Long.class)))
                throw conflict();
            return rs.getObject("id", UUID.class);
        }, actor.getId(), requestKey).stream().findFirst();
        if (previous.isPresent()) return previous.get();

        Target target = target(mediaId, actor.getId());
        checkVersion(mediaId, target, expectedBindingVersion, expectedBookVersion);
        UUID id = jobs.enqueue(mediaId, target.generation(), JobKind.VERIFY,
                "staging/" + requestKey + "/input", target.recipe(), "verify:" + actor.getId() + ":" + requestKey, 0);
        jdbc.update("""
                INSERT INTO image_source_verification(job_id,actor_id,request_key,file_id,binding_version,book_id,book_version)
                VALUES (?,?,?,?,?,?,?)
                """, id, actor.getId(), requestKey, fileId, expectedBindingVersion, target.bookId(), target.bookVersion());
        return id;
    }

    @Transactional
    public Status status(UUID mediaId, AdminUser actor) {
        requireOwner(actor);
        var target = target(mediaId, actor.getId());
        return bindings.find(mediaId).map(binding ->
                new Status(binding.status() == vn.memay.media.ImageTypes.SourceStatus.VERIFIED
                        && !target.sha().equals(binding.sha256()) ? "SOURCE_CHANGED" : binding.status().name(),
                        binding.bindingVersion(), target.bookVersion()))
                .orElseGet(() -> new Status("UNVERIFIED", 0, target.bookVersion()));
    }

    @Transactional
    public Candidate candidateForDownload(JobLease lease) {
        var current = jobs.lockLease(lease.jobId(), lease.token());
        if (current.kind() != JobKind.VERIFY) throw conflict();
        var candidate = candidate(current.jobId());
        checkTarget(current, candidate);
        return candidate;
    }

    Candidate candidate(UUID jobId) {
        return jdbc.query("""
                SELECT actor_id,request_key,file_id,binding_version,book_id,book_version
                FROM image_source_verification WHERE job_id=?
                """, (rs, row) -> new Candidate(rs.getLong("actor_id"), rs.getObject("request_key", UUID.class),
                rs.getString("file_id"), rs.getLong("binding_version"), rs.getObject("book_id", Long.class),
                rs.getObject("book_version", Long.class)), jobId).stream().findFirst().orElseThrow(SourceBindingService::conflict);
    }

    @Transactional
    public void complete(JobLease lease, DownloadedSource source) {
        var current = jobs.lockLease(lease.jobId(), lease.token());
        if (current.kind() != JobKind.VERIFY) throw conflict();
        var candidate = candidate(current.jobId());
        var target = checkTarget(current, candidate);
        if (!target.sha().equals(source.sha256()))
            throw new AdminApiException(409, "source_hash_mismatch");
        bindings.saveVerified(current.mediaId(), candidate.fileId(), source.sha256(), source.version(),
                source.bytes(), source.mime(), candidate.bindingVersion());
        Long version = target.bookVersion();
        if (target.bookId() != null) {
            version = jdbc.queryForObject("""
                    UPDATE book_copy SET version=version+1, updated_at=clock_timestamp()
                    WHERE id=? RETURNING version
                    """, Long.class, target.bookId());
        }
        jdbc.update("""
                INSERT INTO audit_event(actor_id,target_type,target_id,action,before_data,after_data,aggregate_version,created_at)
                VALUES (?, ?, ?, 'SOURCE_VERIFIED', '{}', cast(? as jsonb), ?, clock_timestamp())
                """, candidate.actor(), target.bookId() == null ? "MEDIA_SOURCE" : "BOOK",
                target.bookId() == null ? 0L : target.bookId(),
                json.writeValueAsString(Map.of("mediaId", current.mediaId(), "bindingVersion", candidate.bindingVersion() + 1)),
                version == null ? candidate.bindingVersion() + 1 : version);
        jobs.markReady(current.jobId(), current.token());
    }

    private Target checkTarget(JobLease current, Candidate candidate) {
        lockOwner(candidate.actor());
        var target = target(current.mediaId(), candidate.actor());
        if (!current.generationId().equals(target.generation()) || !Objects.equals(candidate.bookId(), target.bookId()))
            throw conflict();
        checkVersion(current.mediaId(), target, candidate.bindingVersion(), candidate.bookVersion());
        return target;
    }

    Target target(UUID mediaId, long actor) {
        var book = jdbc.query("""
                SELECT g.id,g.input_sha256,g.recipe_version,b.id AS book_id,b.version AS book_version
                FROM book_media m JOIN book_copy b ON b.id=m.book_copy_id
                JOIN image_generation g ON g.id=m.serving_generation
                WHERE m.id=? AND m.state='ACTIVE' AND m.provider='LOCAL' AND b.deleted_at IS NULL
                  AND g.published_at IS NOT NULL AND g.input_sha256 IS NOT NULL
                FOR UPDATE OF b,m
                """, SourceBindingService::targetRow, mediaId).stream().findFirst();
        if (book.isPresent()) return book.get();
        return jdbc.query("""
                SELECT g.id,g.input_sha256,g.recipe_version,NULL::bigint AS book_id,NULL::bigint AS book_version
                FROM temporary_media m JOIN upload_session s ON s.id=m.session_id
                JOIN image_generation g ON g.media_id=m.id
                WHERE m.id=? AND m.state IN ('UPLOADING','READY') AND s.owner_id=?
                  AND s.state='OPEN' AND s.expires_at>clock_timestamp()
                  AND g.published_at IS NOT NULL AND g.input_sha256 IS NOT NULL
                ORDER BY g.created_at DESC,g.id DESC LIMIT 1 FOR UPDATE OF s,m
                """, SourceBindingService::targetRow, mediaId, actor).stream().findFirst()
                .orElseThrow(() -> new AdminApiException(404, "local_media_not_found"));
    }

    private static Target targetRow(java.sql.ResultSet rs, int row) throws java.sql.SQLException {
        return new Target(rs.getObject("id", UUID.class), rs.getString("input_sha256"), rs.getString("recipe_version"),
                rs.getObject("book_id", Long.class), rs.getObject("book_version", Long.class));
    }

    void checkVersion(UUID media, Target target, long bindingVersion, Long bookVersion) {
        if (!Objects.equals(target.bookVersion(), bookVersion)
                || bindings.find(media).map(b -> b.bindingVersion()).orElse(0L) != bindingVersion)
            throw conflict();
    }

    private void lockOwner(long actorId) {
        if (jdbc.queryForList("SELECT id FROM admin_user WHERE id=? AND active AND role='OWNER' FOR UPDATE",
                Long.class, actorId).isEmpty()) throw new AdminApiException(403, "forbidden");
    }

    private static void requireOwner(AdminUser actor) {
        if (!actor.isActive() || actor.getRole() != AdminUser.Role.OWNER) throw new AdminApiException(403, "forbidden");
    }

    private static AdminApiException conflict() {
        return new AdminApiException(409, "source_binding_conflict");
    }
}
