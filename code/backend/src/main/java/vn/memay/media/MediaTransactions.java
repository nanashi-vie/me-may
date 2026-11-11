package vn.memay.media;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import jakarta.persistence.*;
import java.time.Clock;
import java.util.*;
import vn.memay.catalogue.*;
import vn.memay.catalogue.BookDtos.*;
import vn.memay.auth.AdminUser;
import vn.memay.listing.*;
import vn.memay.audit.AuditService;
import vn.memay.common.AdminApiException;
import static vn.memay.media.MediaDtos.*;

@Service
public class MediaTransactions {
    public record Intent(UUID id, String publicId) {
    }
    public record DownloadPhoto(MediaRole role, UUID id, UUID generation, String key) {}
    public record DownloadBook(String code, List<DownloadPhoto> photos) {}

    @Transactional(readOnly = true)
    public List<DownloadBook> downloadPhotos(List<Long> ids) {
        Map<Long, String> codes = new HashMap<>();
        books.findAllById(ids).forEach(book -> codes.put(book.id, book.bookCode));
        if (codes.size() != ids.size()) {
            throw new AdminApiException(404, "not_found");
        }
        Map<Long, List<DownloadPhoto>> photos = new HashMap<>();
        for (var image : images.findByBookCopyIdInAndState(ids, MediaState.ACTIVE)) {
            photos.computeIfAbsent(image.bookCopyId, id -> new ArrayList<>())
                    .add(new DownloadPhoto(image.role, image.id, image.servingGeneration, image.storagePublicId));
        }
        return ids.stream().map(id -> new DownloadBook(codes.get(id),
                photos.getOrDefault(id, List.of()).stream()
                        .sorted(Comparator.comparing(DownloadPhoto::role)).toList())).toList();
    }

    private final vn.memay.auth.AdminUserRepository users;
    private final BookCopyRepository books;
    private final ListingRepository listings;
    private final BookMediaRepository images;
    private final BookAccess access;
    private final BookMapper mapper;
    private final AuditService audit;
    private final Clock clock;
    private final SourceBindingRepository sources;
    private final UploadSessionTransactions sessions;
    private final EntityManager em;
    private final JdbcTemplate jdbc;

    public MediaTransactions(vn.memay.auth.AdminUserRepository users, BookCopyRepository books,
            ListingRepository listings, BookMediaRepository images, BookAccess access, BookMapper mapper,
            AuditService audit, Clock clock, EntityManager em, JdbcTemplate jdbc, SourceBindingRepository sources,
            UploadSessionTransactions sessions) {
        this.users = users;
        this.books = books;
        this.listings = listings;
        this.images = images;
        this.access = access;
        this.mapper = mapper;
        this.audit = audit;
        this.clock = clock;
        this.sources = sources;
        this.sessions = sessions;
        this.em = em;
        this.jdbc = jdbc;
    }

    private BookCopy book(long id, long version, AdminUser actor) {
        actor = users.findById(actor.getId()).filter(AdminUser::isActive)
                .orElseThrow(() -> new AdminApiException(401, "unauthorized"));
        var b = books.findById(id).orElseThrow(() -> new AdminApiException(404, "not_found"));
        if (b.version != version)
            throw AdminApiException.conflict(b.version);
        access.requireWritable(actor, listings.findByBookCopyId(id).orElseThrow().publicationStatus);
        return b;
    }

    private String text(String key, String value, int max) {
        value = BookValidation.trim(value);
        if (value != null && value.length() > max)
            throw AdminApiException.field(key, "Tối đa " + max + " ký tự");
        return value;
    }

    private String alt(String value, MediaRole role, String code) {
        value = text("alt", value, 300);
        return value != null ? value : role.label() + " " + code;
    }

    @Transactional
    public Intent begin(long bookId, MediaRole role, long version, AdminUser actor, String alt, String sourceRef,
            String namespace) {
        var b = book(bookId, version, actor);
        var m = new BookMedia();
        m.id = UUID.randomUUID();
        m.bookCopyId = bookId;
        m.role = role;
        m.state = MediaState.UPLOADING;
        m.storagePublicId = namespace + "/" + m.id;
        m.alt = alt(alt, role, b.bookCode);
        m.sourceRef = text("sourceRef", sourceRef, 500);
        m.createdAt = clock.instant();
        m.updatedAt = m.createdAt;
        images.saveAndFlush(m);
        return new Intent(m.id, m.storagePublicId);
    }

    @Transactional
    public BookDetail attach(Intent intent, long bookId, long version, AdminUser actor,
            MediaGateway.UploadedMedia uploaded) {
        var b = book(bookId, version, actor);
        var l = listings.findByBookCopyId(bookId).orElseThrow();
        var before = mapper.detail(b, l);
        // Flush aggregate version first: concurrent mutation loses before changing the
        // active slot.
        b.touch(clock.instant());
        em.flush();
        var m = em.find(BookMedia.class, intent.id(), LockModeType.PESSIMISTIC_WRITE);
        if (m == null || m.state != MediaState.UPLOADING || !java.util.Objects.equals(m.bookCopyId, bookId))
            throw new AdminApiException(409, "media_conflict");
        if (!m.storagePublicId.equals(uploaded.publicId()) || uploaded.assetId() == null || uploaded.format() == null
                || uploaded.bytes() < 1 || uploaded.width() < 1 || uploaded.height() < 1)
            throw new AdminApiException(502, "media_provider_error");
        for (var previous : images.findByBookCopyIdAndState(bookId, MediaState.ACTIVE))
            if (previous.role == m.role) {
                previous.state = MediaState.DELETE_PENDING;
                previous.updatedAt = clock.instant();
            }
        em.flush();
        m.state = MediaState.ACTIVE;
        m.assetId = uploaded.assetId();
        m.format = uploaded.format();
        m.bytes = uploaded.bytes();
        m.width = uploaded.width();
        m.height = uploaded.height();
        m.updatedAt = clock.instant();
        em.flush();
        if (l.publicationStatus == Publication.PUBLISHED)
            sources.requireVerifiedForBook(bookId);
        var result = mapper.detail(b, l);
        audit.record(actor, "BOOK", bookId,
                before.media().stream().anyMatch(v -> v.role() == m.role) ? "MEDIA_REPLACED" : "MEDIA_ATTACHED",
                audit.snapshot(before), audit.snapshot(result), b.version);
        return result;
    }

    @Transactional
    public BookDetail commitReplacement(long bookId, UUID mediaId, long version, MediaRole role,
                                        UUID requestKey, AdminUser actor) {
        if (version < 0 || role == null || requestKey == null)
            throw new AdminApiException(400, "invalid_image_replacement");
        jdbc.queryForList("SELECT id FROM admin_user WHERE id=? FOR UPDATE", Long.class, actor.getId());
        sessions.requireOwner(actor);
        role = role.canonical();
        var replay = jdbc.queryForList("SELECT * FROM local_image_commit WHERE actor_id=? AND request_key=?",
                actor.getId(), requestKey);
        if (!replay.isEmpty()) {
            var saved = replay.getFirst();
            if (!mediaId.equals(saved.get("media_id")) || !Long.valueOf(bookId).equals(saved.get("book_id"))
                    || !Long.valueOf(version).equals(saved.get("book_version")) || !role.name().equals(saved.get("role")))
                throw new AdminApiException(409, "image_request_changed");
            return mapper.detail(books.findById(bookId).orElseThrow(() -> new AdminApiException(404, "not_found")),
                    listings.findByBookCopyId(bookId).orElseThrow());
        }
        var rows = jdbc.queryForList("SELECT session_id FROM temporary_media WHERE id=? AND provider='LOCAL'",
                UUID.class, mediaId);
        if (rows.isEmpty()) throw new AdminApiException(404, "not_found");
        UUID session = rows.getFirst();
        sessions.lock(session, actor, true);
        sessions.requireAdmitted(mediaId);
        if (!Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM temporary_media WHERE id=? AND session_id=?
                    AND state='READY' AND provider='LOCAL' AND generation_id IS NOT NULL)
                """, Boolean.class, mediaId, session))) throw new AdminApiException(409, "media_not_ready");

        var b = book(bookId, version, actor);
        var l = listings.findByBookCopyId(bookId).orElseThrow();
        var before = mapper.detail(b, l);
        b.touch(clock.instant());
        em.flush();
        for (var old : images.findByBookCopyIdAndState(bookId, MediaState.ACTIVE)) {
            if (old.role == role) {
                old.state = MediaState.DELETE_PENDING;
                old.updatedAt = clock.instant();
            }
        }
        em.flush();
        sessions.consumeReady(mediaId, bookId, role, role.label() + " " + b.bookCode);
        if (l.publicationStatus == Publication.PUBLISHED) sources.requireVerifiedForBook(bookId);
        var after = mapper.detail(b, l);
        audit.record(actor, "BOOK", bookId, "MEDIA_REPLACED", audit.snapshot(before), audit.snapshot(after), b.version);
        jdbc.update("""
                INSERT INTO local_image_commit(media_id,actor_id,book_id,book_version,role,request_key)
                VALUES (?,?,?,?,?,?)
                """, mediaId, actor.getId(), bookId, version, role.name(), requestKey);
        return after;
    }

    @Transactional
    public void fail(UUID id) {
        jdbc.update("update book_media set state='DELETE_PENDING',updated_at=? where id=? and state='UPLOADING'",
                java.sql.Timestamp.from(clock.instant()), id);
    }

    @Transactional
    public BookDetail metadata(long bookId, MediaRole role, long version, AdminUser actor, String alt,
            String sourceRef) {
        var b = book(bookId, version, actor);
        var l = listings.findByBookCopyId(bookId).orElseThrow();
        var before = mapper.detail(b, l);
        var m = active(bookId, role);
        String nextAlt = alt(alt, role, b.bookCode), nextSource = text("sourceRef", sourceRef, 500);
        if (Objects.equals(nextAlt, m.alt) && Objects.equals(nextSource, m.sourceRef))
            return before;
        b.touch(clock.instant());
        em.flush();
        m.alt = nextAlt;
        m.sourceRef = nextSource;
        m.updatedAt = clock.instant();
        em.flush();
        var result = mapper.detail(b, l);
        audit.record(actor, "BOOK", bookId, "MEDIA_UPDATED", audit.snapshot(before), audit.snapshot(result), b.version);
        return result;
    }

    @Transactional
    public BookDetail remove(long bookId, MediaRole role, long version, AdminUser actor) {
        var b = book(bookId, version, actor);
        var l = listings.findByBookCopyId(bookId).orElseThrow();
        if (l.publicationStatus == Publication.PUBLISHED && (role == MediaRole.FRONT || role == MediaRole.BACK))
            throw new AdminApiException(409, "publication_requires_media");
        var before = mapper.detail(b, l);
        var m = active(bookId, role);
        b.touch(clock.instant());
        em.flush();
        m.state = MediaState.DELETE_PENDING;
        m.updatedAt = clock.instant();
        em.flush();
        var result = mapper.detail(b, l);
        audit.record(actor, "BOOK", bookId, "MEDIA_REMOVED", audit.snapshot(before), audit.snapshot(result), b.version);
        return result;
    }

    private BookMedia active(long bookId, MediaRole role) {
        return images.findByBookCopyIdAndState(bookId, MediaState.ACTIVE).stream().filter(m -> m.role == role)
                .findFirst().orElseThrow(() -> new AdminApiException(404, "not_found"));
    }

    record Preview(UUID media, UUID generation, String key) {}

    @Transactional(readOnly = true)
    public Preview activePreview(long bookId, MediaRole role) {
        return jdbc.query("""
                SELECT m.id,m.serving_generation,m.storage_public_id
                FROM book_media m JOIN book_copy b ON b.id=m.book_copy_id
                WHERE b.id=? AND b.deleted_at IS NULL AND m.role=? AND m.state='ACTIVE'
                """, (r, i) -> new Preview(r.getObject("id", UUID.class), r.getObject("serving_generation", UUID.class),
                        r.getString("storage_public_id")), bookId, role.name()).stream().findFirst()
                .orElseThrow(() -> new AdminApiException(404, "not_found"));
    }
}
