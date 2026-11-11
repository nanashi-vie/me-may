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
                long bindingVersion = target.generationId() == null
                        ? bindings.find(target.mediaId()).map(b -> b.bindingVersion()).orElse(0L) : target.bindingVersion();
                sources.checkVersion(target.mediaId(), current, bindingVersion, input.bookVersion());
                if (!Objects.equals(current.bookId(), input.bookId())
                        || (target.generationId() != null && !Objects.equals(current.generation(), target.generationId()))) throw conflict();
                if (input.sessionId() != null && !Boolean.TRUE.equals(db.queryForObject(
                        "SELECT EXISTS(SELECT 1 FROM temporary_media WHERE id=? AND session_id=?)",
                        Boolean.class, target.mediaId(), input.sessionId()))) throw invalid();
                snapshots.add(new Snapshot(target.mediaId(), current.generation(), bindingVersion,
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
    @Transactional
    public List<DriveSourceMetadata> prepareConfirmation(UUID id, Confirm input, AdminUser actor) {
        var view=status(id,actor);
        if ("CONFIRMED".equals(view.state())) return List.of();
        validateConfirmation(view,input);
        var items=repository.items(id);
        return input.selections().stream().map(selection-> {
            var item=items.stream().filter(i->selection.itemId().equals(i.get("id"))).findFirst().orElseThrow(DriveBatchService::invalid);
            return new DriveSourceMetadata(item.get("file_id").toString(),(String)item.get("source_version"),
                    ((Number)item.get("source_bytes")).longValue(),(String)item.get("mime"));
        }).toList();
    }

    @Transactional
    public View confirmChecked(UUID id, Confirm input, AdminUser actor, List<DriveSourceMetadata> metadata) {
        db.queryForObject("SELECT id FROM admin_user WHERE id=? FOR UPDATE",Long.class,actor.getId());
        sessions.requireOwner(actor);
        // Session/book locks precede the receipt lock, including on replays.
        var initial=repository.owned(id,actor.getId(),namespace,false);
        if (!"CONFIRMED".equals(initial.get("state")) && initial.get("session_id")!=null)
            sessions.lock((UUID)initial.get("session_id"),actor,true);
        if (initial.get("book_id")!=null)
            db.queryForObject("SELECT id FROM book_copy WHERE id=? FOR UPDATE",Long.class,initial.get("book_id"));
        var row=repository.owned(id,actor.getId(),namespace,true);
        String fingerprint=hash(input);
        if ("CONFIRMED".equals(row.get("state"))) {
            if (input==null || !Objects.equals(row.get("confirm_key"),input.requestKey())
                    || !fingerprint.equals(row.get("confirm_fingerprint"))) throw conflict();
            return json.readValue(row.get("receipt").toString(),View.class);
        }
        var view=status(id,actor);
        validateConfirmation(view,input);
        var items=repository.items(id);
        var snapshots=List.of(json.readValue(row.get("targets").toString(),Snapshot[].class));
        boolean importing=view.mode()==Mode.IMPORT;
        Long bookVersion=view.bookVersion();
        if (bookVersion!=null) {
            Long current=db.queryForObject("SELECT version FROM book_copy WHERE id=? AND deleted_at IS NULL",
                    Long.class,row.get("book_id"));
            if (!bookVersion.equals(current)) throw conflict();
            bookVersion++;
        }
        for (Selection selection:input.selections()) {
            var item=items.stream().filter(i->selection.itemId().equals(i.get("id"))).findFirst().orElseThrow(DriveBatchService::invalid);
            var expected=new DriveSourceMetadata(item.get("file_id").toString(),(String)item.get("source_version"),
                    ((Number)item.get("source_bytes")).longValue(),(String)item.get("mime"));
            if (!metadata.contains(expected)) throw new AdminApiException(409,"SOURCE_CHANGED");
            var target=sources.target(selection.mediaId(),actor.getId());
            long bindingVersion;
            if (importing) {
                if (!Objects.equals(item.get("generation_id"),target.generation())
                        || !Objects.equals(target.recipe(),recipe)
                        || !Boolean.TRUE.equals(db.queryForObject("""
                            SELECT EXISTS(SELECT 1 FROM image_job WHERE media_id=? AND generation_id=?
                              AND kind='PROCESS' AND status='READY')
                            """,Boolean.class,selection.mediaId(),target.generation()))) throw conflict();
                bindingVersion=0;
            } else {
                var snapshot=snapshots.stream().filter(t->t.mediaId().equals(selection.mediaId()))
                        .findFirst().orElseThrow(DriveBatchService::invalid);
                if (!snapshot.generationId().equals(target.generation()) || !snapshot.sha256().equals(target.sha())
                        || !Objects.equals(target.bookId(),row.get("book_id"))) throw conflict();
                bindingVersion=snapshot.bindingVersion();
            }
            if (!target.sha().equals(item.get("sha256"))) throw new AdminApiException(409,"source_hash_mismatch");
            sources.checkVersion(selection.mediaId(),target,bindingVersion,view.bookVersion());
            bindings.saveVerified(selection.mediaId(),expected.fileId(),target.sha(),expected.version(),expected.bytes(),
                    expected.mime(),bindingVersion);
            db.update("UPDATE drive_image_batch_item SET admitted=true WHERE id=?",selection.itemId());
            db.update("""
                    INSERT INTO audit_event(actor_id,target_type,target_id,action,before_data,after_data,
                      aggregate_version,created_at) VALUES(?, ?, ?, 'SOURCE_VERIFIED', '{}',cast(? as jsonb),?,clock_timestamp())
                    """,actor.getId(),row.get("book_id")==null?"MEDIA_SOURCE":"BOOK",
                    row.get("book_id")==null?0L:row.get("book_id"),
                    json.writeValueAsString(Map.of("mediaId",selection.mediaId(),"bindingVersion",bindingVersion+1)),
                    bookVersion==null?bindingVersion+1:bookVersion);
        }
        if (bookVersion!=null) db.update("UPDATE book_copy SET version=?,updated_at=clock_timestamp() WHERE id=?",
                bookVersion,row.get("book_id"));
        if (importing) {
            for (var item:items) if (input.selections().stream().noneMatch(s->s.itemId().equals(item.get("id")))) {
                repository.releaseMedia((UUID)item.get("media_id"));
                db.update("UPDATE drive_image_batch_item SET state='CANCELLED' WHERE id=?",item.get("id"));
            }
        }
        var result=new View(id,view.mode(),"CONFIRMED",view.expiresAt(),view.digest(),
                status(id,actor).items(),bookVersion,List.copyOf(input.selections()));
        db.update("""
                UPDATE drive_image_batch SET state='CONFIRMED',confirm_key=?,confirm_fingerprint=?,receipt=cast(? as jsonb)
                WHERE id=?
                """,input.requestKey(),fingerprint,json.writeValueAsString(result),id);
        return result;
    }
    private void validateConfirmation(View view, Confirm input) {
        if (input==null || input.requestKey()==null || input.selections()==null || input.selections().isEmpty()
                || input.selections().size()>8 || !Objects.equals(view.digest(),input.digest())
                || !"READY".equals(view.state())) throw conflict();
        Set<UUID> selectedItems=new HashSet<>(),selectedMedia=new HashSet<>();
        Set<vn.memay.media.MediaDtos.MediaRole> roles=new HashSet<>();
        for (Selection selection:input.selections()) {
            if (selection==null || selection.itemId()==null || selection.mediaId()==null
                    || !selectedItems.add(selection.itemId()) || !selectedMedia.add(selection.mediaId())) throw invalid();
            var item=view.items().stream().filter(i->i.id().equals(selection.itemId())).findFirst().orElseThrow(DriveBatchService::invalid);
            if (!"READY".equals(item.state()) || !item.candidates().contains(selection.mediaId())) throw invalid();
            if (view.mode()==Mode.IMPORT && (selection.role()==null || !roles.add(selection.role().canonical()))) throw invalid();
        }
    }

    @Transactional
    public void cancel(UUID id, AdminUser actor) {
        sessions.requireOwner(actor);
        var initial=repository.owned(id,actor.getId(),namespace,false);
        if (initial.get("session_id")!=null) sessions.lock((UUID)initial.get("session_id"),actor,true);
        var row=repository.owned(id,actor.getId(),namespace,true);
        if ("CONFIRMED".equals(row.get("state"))) throw conflict();
        db.update("UPDATE drive_image_batch SET state='CANCELLED' WHERE id=?",id);
        repository.expire();
    }
    String hash(Object value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(json.writeValueAsString(value).getBytes(StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
    static AdminApiException invalid() { return new AdminApiException(400, "invalid_drive_batch"); }
    static AdminApiException conflict() { return new AdminApiException(409, "drive_batch_conflict"); }
}
