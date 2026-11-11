package vn.memay.media.source;

import static vn.memay.media.source.DriveBatchDtos.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import vn.memay.auth.AdminUser;
import vn.memay.common.AdminApiException;
import vn.memay.media.SourceBindingRepository;
import vn.memay.media.UploadSessionTransactions;

@Service
@ConditionalOnProperty(prefix = "memay.media.local", name = "enabled", havingValue = "true")
public class DriveBatchService {
    final JdbcTemplate db;
    final UploadSessionTransactions sessions;
    final SourceBindingService sources;
    final SourceBindingRepository bindings;
    final ObjectMapper json;
    final String namespace;
    final String recipe;
    final DriveBatchRepository repository;

    public DriveBatchService(JdbcTemplate db, UploadSessionTransactions sessions, SourceBindingService sources,
                             SourceBindingRepository bindings, ObjectMapper json,
                             @Value("${memay.media.namespace:memay/dev}") String namespace,
                             @Value("${memay.media.local.recipe:v1}") String recipe) {
        this.db = db; this.sessions = sessions; this.sources = sources; this.bindings = bindings;
        this.json = json; this.namespace = namespace; this.recipe = recipe;
        this.repository = new DriveBatchRepository(db);
    }

    @Transactional
    public View create(Create input, AdminUser actor) {
        // Acquire the exclusive owner lock before requireOwner takes a shared lock.
        db.queryForObject("SELECT id FROM admin_user WHERE id=? FOR UPDATE", Long.class, actor.getId());
        sessions.requireOwner(actor);
        if (input == null || input.mode() == null || input.requestKey() == null || input.fileIds() == null
                || input.fileIds().isEmpty() || input.fileIds().size() > 8
                || input.fileIds().stream().anyMatch(id -> id == null || !id.matches("[A-Za-z0-9_-]{1,200}"))
                || new HashSet<>(input.fileIds()).size() != input.fileIds().size()
                || (input.sessionId() == null) == (input.bookId() == null)
                || (input.bookId() == null) != (input.bookVersion() == null))
            throw invalid();
        String fingerprint = hash(input);
        var previous = db.queryForList("SELECT id,fingerprint FROM drive_image_batch WHERE actor_id=? AND request_key=?",
                actor.getId(), input.requestKey());
        if (!previous.isEmpty()) {
            if (!fingerprint.equals(previous.getFirst().get("fingerprint"))) throw conflict();
            return status((UUID)previous.getFirst().get("id"), actor);
        }
        Instant expiry = Instant.now().plusSeconds(86400);
        if (input.sessionId() != null) {
            var session = sessions.lock(input.sessionId(), actor, true);
            expiry = ((Timestamp)session.get("expires_at")).toInstant();
        }
        if (!Boolean.TRUE.equals(db.queryForObject("SELECT EXISTS(SELECT 1 FROM image_recipe WHERE version=?)",
                Boolean.class, recipe))) throw new AdminApiException(503, "image_recipe_unavailable");
        List<Snapshot> snapshots = new ArrayList<>();
        if (input.mode() == Mode.IMPORT) {
            if (input.sessionId() == null || (input.targets() != null && !input.targets().isEmpty())) throw invalid();
        } else {
            if (input.targets() == null || input.targets().isEmpty() || input.targets().size() > 8) throw invalid();
            Set<UUID> seen = new HashSet<>();
            for (Target target : input.targets()) {
                if (target == null || target.mediaId() == null || !seen.add(target.mediaId())) throw invalid();
                var current = sources.target(target.mediaId(), actor.getId());
                sources.checkVersion(target.mediaId(), current, target.bindingVersion(), input.bookVersion());
                if (!Objects.equals(current.bookId(), input.bookId())
                        || !Objects.equals(current.generation(), target.generationId())) throw conflict();
                if (input.sessionId() != null && !Boolean.TRUE.equals(db.queryForObject(
                        "SELECT EXISTS(SELECT 1 FROM temporary_media WHERE id=? AND session_id=?)",
                        Boolean.class, target.mediaId(), input.sessionId()))) throw invalid();
                snapshots.add(new Snapshot(target.mediaId(), current.generation(), target.bindingVersion(),
                        current.sha(), current.recipe()));
            }
        }
        UUID id = UUID.randomUUID();
        db.update("""
                INSERT INTO drive_image_batch(id,actor_id,namespace,mode,session_id,book_id,book_version,
                  targets,request_key,fingerprint,expires_at) VALUES(?,?,?,?,?,?,?,cast(? as jsonb),?,?,?)
                """, id, actor.getId(), namespace, input.mode().name(), input.sessionId(), input.bookId(),
                input.bookVersion(), json.writeValueAsString(snapshots), input.requestKey(), fingerprint,
                Timestamp.from(expiry));
        for (int ordinal = 0; ordinal < input.fileIds().size(); ordinal++) {
            UUID item = UUID.randomUUID(), media = null;
            if (input.mode() == Mode.IMPORT) {
                media = sessions.beginLocal(input.sessionId(), actor, null, null, null, item, "drive:" + item).id();
            }
            db.update("INSERT INTO drive_image_batch_item(id,batch_id,ordinal,file_id,media_id) VALUES(?,?,?,?,?)",
                    item, id, ordinal, input.fileIds().get(ordinal), media);
        }
        return status(id, actor);
    }

    @Transactional
    public void completeDownload(DriveBatchRepository.Lease lease, DownloadedSource source,
                                 AdminUser actor, vn.memay.media.LocalUploadService uploads) {
        sessions.requireOwner(actor);
        if (actor.getId()!=lease.actorId()) throw conflict();
        if (lease.sessionId()!=null) sessions.lock(lease.sessionId(),actor,true);
        var batch=repository.owned(lease.batchId(),actor.getId(),namespace,true);
        repository.lockLease(lease);
        UUID generation=null;
        List<UUID> candidates;
        String state;
        if ("IMPORT".equals(lease.mode())) {
            var staged=new vn.memay.media.LocalImageStore.StagedInput(source.inputKey(),source.bytes(),source.sha256());
            var operation=uploads.enqueueStaged(lease.sessionId(),lease.mediaId(),actor,staged,"LOCAL:"+recipe);
            generation=db.queryForObject("SELECT generation_id FROM image_job WHERE id=?",UUID.class,operation.jobId());
            candidates=List.of(lease.mediaId());
            state="ENCODING";
        } else {
            var snapshots=json.readValue(batch.get("targets").toString(),Snapshot[].class);
            candidates=Arrays.stream(snapshots).filter(t->t.sha256().equals(source.sha256())).map(Snapshot::mediaId).toList();
            state=candidates.isEmpty()?"FAILED":"READY";
        }
        db.update("""
                UPDATE drive_image_batch_item SET state=?,generation_id=?,input_key=?,sha256=?,
                  source_version=?,source_bytes=?,mime=?,candidates=cast(? as jsonb),
                  error_code=?,lease_token=NULL,lease_until=NULL WHERE id=?
                """,state,generation,"IMPORT".equals(lease.mode())?source.inputKey():null,
                source.sha256(),source.version(),source.bytes(),source.mime(),json.writeValueAsString(candidates),
                candidates.isEmpty()?"source_hash_mismatch":null,lease.itemId());
        repository.refresh(lease.batchId());
    }

    @Transactional
    public View status(UUID id, AdminUser actor) {
        sessions.requireOwner(actor);
        var row = repository.owned(id, actor.getId(), namespace, true);
        if (!"CONFIRMED".equals(row.get("state")) && !((Timestamp)row.get("expires_at")).toInstant().isAfter(Instant.now()))
            throw new AdminApiException(410, "drive_batch_expired");
        repository.refresh(id);
        row = repository.owned(id, actor.getId(), namespace, false);
        if (row.get("receipt") != null) return json.readValue(row.get("receipt").toString(), View.class);
        String mode = row.get("mode").toString();
        UUID session = (UUID)row.get("session_id");
        List<ItemView> items = repository.items(id).stream().map(item -> {
            UUID media = (UUID)item.get("media_id");
            List<UUID> candidates = List.of(json.readValue(item.get("candidates").toString(), UUID[].class));
            if (Mode.IMPORT.name().equals(mode) && media != null && "READY".equals(item.get("state")))
                candidates = List.of(media);
            String path = media == null ? null : "/api/v1/admin/upload-sessions/" + session + "/media/" + media;
            if ("MATCH".equals(mode)) path = null;
            return new ItemView((UUID)item.get("id"), item.get("file_id").toString(), item.get("state").toString(),
                    (String)item.get("error_code"), media, path, candidates);
        }).toList();
        String digest = hash(List.of(row.get("targets").toString(), repository.items(id).stream()
                .map(item -> Arrays.asList(item.get("id"), item.get("state"), item.get("generation_id"),
                        item.get("sha256"), item.get("source_version"), item.get("candidates").toString())).toList()));
        return new View(id, Mode.valueOf(row.get("mode").toString()), row.get("state").toString(),
                ((Timestamp)row.get("expires_at")).toInstant(), digest, items, (Long)row.get("book_version"), List.of());
    }
    String hash(Object value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(json.writeValueAsString(value).getBytes(StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
    static AdminApiException invalid() { return new AdminApiException(400, "invalid_drive_batch"); }
    static AdminApiException conflict() { return new AdminApiException(409, "drive_batch_conflict"); }
}
