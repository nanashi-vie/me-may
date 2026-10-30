package vn.memay.catalogue;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.util.*;
import vn.memay.catalogue.BookDtos.*;
import vn.memay.auth.AdminUser;
import vn.memay.audit.AuditService;
import vn.memay.media.*;
import tools.jackson.databind.ObjectMapper;
import vn.memay.listing.*;
import vn.memay.taxonomy.CategoryRepository;
import vn.memay.common.AdminApiException;

@Service
public class BookCommandService {
    private final BookCopyRepository books;
    private final BookVariantStore variants;
    private final ListingRepository listings;
    private final CategoryRepository categories;
    private final BookCodeGenerator codes;
    private final BookValidation validation;
    private final BookAccess access;
    private final BookMapper mapper;
    private final AuditService audit;
    private final JdbcTemplate jdbc;
    private final Clock clock;
    private final EntityManager em;
    private final UploadSessionTransactions uploads;
    private final BookMediaRepository images;
    private final ObjectMapper json;

    public BookCommandService(BookCopyRepository books, ListingRepository listings, CategoryRepository categories,
            BookCodeGenerator codes, BookValidation validation, BookAccess access, BookMapper mapper,
            AuditService audit, JdbcTemplate jdbc, Clock clock, EntityManager em, UploadSessionTransactions uploads,
            BookMediaRepository images, ObjectMapper json, BookVariantStore variants) {
        this.books = books;
        this.variants = variants;
        this.listings = listings;
        this.categories = categories;
        this.codes = codes;
        this.validation = validation;
        this.access = access;
        this.mapper = mapper;
        this.audit = audit;
        this.jdbc = jdbc;
        this.clock = clock;
        this.em = em;
        this.uploads = uploads;
        this.images = images;
        this.json = json;
    }

    private BookDetail createAggregate(AdminUser actor, BookWrite input) {
        var w = validation.normalize(input);
        validation.validateWrite(w);
        var b = new BookCopy();
        b.bookCode = codes.nextCode();
        b.availability = availability(w);
        b.createdAt = clock.instant();
        b.updatedAt = b.createdAt;
        var l = new Listing();
        l.publicationStatus = Publication.ARCHIVED;
        l.slug = b.bookCode.toLowerCase(Locale.ROOT);
        l.updatedAt = b.updatedAt;
        apply(b, l, w);
        books.saveAndFlush(b);
        l.bookCopyId = b.id;
        listings.saveAndFlush(l);
        mappings(l, w);
        variants.save(b.id, w.variants());
        em.flush();
        var result = mapper.detail(b, l);
        return result;
    }

    @Transactional
    public BookDetail createPublished(AdminUser actor, BookCreate input) {
        access.requireOwner(actor);
        if (input == null || input.uploadSessionId() == null)
            throw AdminApiException.field("uploadSessionId", "Thiếu phiên ảnh");
        var w = validation.normalize(input.write());
        var assignments = assignments(input.media());
        var canonical = new BookCreate(w, input.uploadSessionId(), assignments, input.confirmedActualCopy());
        String fingerprint;
        try {
            fingerprint = java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256")
                    .digest(json.writeValueAsBytes(canonical)));
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
        var session = uploads.lock(input.uploadSessionId(), actor, false);
        if ("CONSUMED".equals(session.get("state"))) {
            if (!fingerprint.equals(session.get("request_fingerprint")))
                throw new AdminApiException(409, "upload_session_consumed");
            long id = ((Number) session.get("book_id")).longValue();
            return mapper.detail(books.findById(id).orElseThrow(), listings.findByBookCopyId(id).orElseThrow());
        }
        uploads.lock(input.uploadSessionId(), actor, true);
        validation.validateWrite(w);
        if (!input.confirmedActualCopy())
            throw AdminApiException.field("confirmedActualCopy", "Xác nhận đúng ảnh và tình trạng cuốn sách");
        var ready = jdbc.queryForList("select * from temporary_media where session_id=? and state='READY' for update",
                input.uploadSessionId());
        var selected = new LinkedHashMap<UUID, Map<String, Object>>();
        for (var assignment : assignments) {
            var photo = ready.stream().filter(m -> assignment.mediaId().equals(m.get("id"))).findFirst()
                    .orElseThrow(
                            () -> AdminApiException.field("media", "Ảnh chưa sẵn sàng hoặc không thuộc phiên này"));
            selected.put(assignment.mediaId(), photo);
        }
        var aggregate = createAggregate(actor, w);
        long id = Long.parseLong(aggregate.id());
        for (var assignment : assignments) {
            var m = selected.get(assignment.mediaId());
            jdbc.update(
                    "insert into book_media(id,book_copy_id,role,state,storage_public_id,asset_id,format,bytes,width,height,alt,source_ref,created_at,updated_at) values(?,?,?,'ACTIVE',?,?,?,?,?,?,?,?,?,?)",
                    assignment.mediaId(), id, assignment.role().name(), m.get("storage_public_id"), m.get("asset_id"),
                    m.get("format"), m.get("bytes"), m.get("width"), m.get("height"),
                    m.get("alt") == null ? assignment.role().label() + " " + aggregate.bookCode() : m.get("alt"),
                    m.get("source_ref"), m.get("created_at"), m.get("updated_at"));
            jdbc.update("delete from temporary_media where id=?", assignment.mediaId());
        }
        var b = books.findById(id).orElseThrow();
        var l = listings.findByBookCopyId(id).orElseThrow();
        validation.validatePublished(mapper.detail(b, l));
        l.publicationStatus = Publication.PUBLISHED;
        l.publishedAt = clock.instant().truncatedTo(java.time.temporal.ChronoUnit.MICROS);
        em.flush();
        var result = mapper.detail(b, l);
        var snapshot = audit.snapshot(result);
        snapshot.put("confirmedActualCopy", true);
        audit.record(actor, "BOOK", id, "CREATE", Map.of(), snapshot, b.version);
        audit.record(actor, "BOOK", id, "PUBLISHED", Map.of(), snapshot, b.version);
        jdbc.update("update upload_session set state='CONSUMED',book_id=?,request_fingerprint=? where id=?", id,
                fingerprint, input.uploadSessionId());
        jdbc.update(
                "update temporary_media set delete_after=case when state='UPLOADING' then delete_after else ? end,state='DELETE_PENDING' where session_id=?",
                java.sql.Timestamp.from(clock.instant()), input.uploadSessionId());
        return result;
    }

    private List<MediaAssignment> assignments(List<MediaAssignment> input) {
        if (input == null || input.size() < 2 || input.size() > 6
                || input.stream().anyMatch(m -> m == null || m.mediaId() == null || m.role() == null))
            throw AdminApiException.field("media", "Cần từ 2 đến 6 ảnh hợp lệ");
        if (input.stream().map(MediaAssignment::mediaId).distinct().count() != input.size()
                || input.stream().map(MediaAssignment::role).distinct().count() != input.size()
                || !input.stream().map(MediaAssignment::role).toList()
                        .containsAll(List.of(MediaDtos.MediaRole.FRONT, MediaDtos.MediaRole.BACK)))
            throw AdminApiException.field("media", "Ảnh/vai trò không được trùng, bắt buộc bìa và lưng");
        return input.stream().sorted(Comparator.comparingInt(m -> m.role().ordinal())).toList();
    }

    @Transactional
    public BookDetail update(long id, long version, AdminUser actor, BookWrite input) {
        return update(id, version, actor, input, null);
    }

    @Transactional
    public BookDetail update(long id, long version, AdminUser actor, BookWrite input, List<MediaAssignment> media) {
        var b = books.findById(id).orElseThrow(() -> new AdminApiException(404, "not_found"));
        var l = listings.findByBookCopyId(id).orElseThrow();
        access.requireWritable(actor, l.publicationStatus);
        if (b.version != version)
            throw AdminApiException.conflict(b.version);
        var w = validation.normalize(input);
        validation.validateWrite(w);
        var before = mapper.detail(b, l);
        var reordered = media == null ? null : assignments(media);
        boolean mediaChanged = reordered != null && !reordered.equals(
                before.media().stream().map(m -> new MediaAssignment(UUID.fromString(m.id()), m.role())).toList());
        if (mapper.write(before).equals(w) && !mediaChanged)
            return before;
        apply(b, l, w);
        b.availability = availability(w);
        mappings(l, w);
        variants.save(id, w.variants());
        b.touch(clock.instant());
        l.updatedAt = b.updatedAt;
        em.flush();
        if (mediaChanged)
            reorder(id, reordered);
        var after = mapper.detail(b, l);
        if (l.publicationStatus == Publication.PUBLISHED)
            validation.validatePublished(after);
        audit.record(actor, "BOOK", id, "UPDATE", audit.snapshot(before), audit.snapshot(after), b.version);
        return after;
    }

    private void reorder(long id, List<MediaAssignment> assignments) {
        var active = images.findByBookCopyIdAndState(id, MediaDtos.MediaState.ACTIVE);
        if (active.size() != assignments.size()
                || !active.stream().map(m -> m.id).collect(java.util.stream.Collectors.toSet()).equals(assignments
                        .stream().map(MediaAssignment::mediaId).collect(java.util.stream.Collectors.toSet())))
            throw AdminApiException.field("media", "Chỉ sắp xếp ảnh đang thuộc cuốn này");
        for (var m : active) {
            m.state = MediaDtos.MediaState.UPLOADING;
            m.updatedAt = clock.instant();
        }
        em.flush();
        for (var m : active) {
            m.role = assignments.stream().filter(a -> a.mediaId().equals(m.id)).findFirst().orElseThrow().role();
            m.state = MediaDtos.MediaState.ACTIVE;
        }
        em.flush();
    }

    private Availability availability(BookWrite w) {
        return w.variants().stream().mapToLong(VariantWrite::stock).sum() == 0 ? Availability.SOLD
                : Availability.AVAILABLE;
    }

    private void apply(BookCopy b, Listing l, BookWrite w) {
        b.title = w.title();
        b.isbn = w.isbn();
        b.publisher = w.publisher();
        b.author = w.author();
        b.language = w.language();
        b.binding = w.binding();
        b.conditionGrade = w.conditionGrade();
        b.conditionNote = w.conditionNote();
        l.priceMinVnd = w.priceMinVnd();
        l.priceMaxVnd = w.priceMaxVnd();
        b.weightG = w.weightG();
        l.description = w.description();
        l.categoryId = w.categoryCode() == null ? null
                : categories.findByCode(w.categoryCode())
                        .orElseThrow(() -> AdminApiException.field("categoryCode", "Thể loại không hợp lệ")).id;
        l.readingLevel = w.readingLevel();
        l.readingVideoUrl = w.readingVideoUrl();
    }

    private void mappings(Listing l, BookWrite w) {
        Set<String> previous = new HashSet<>(jdbc.queryForList(
                "select collection_id::text from listing_collection where listing_id=?", String.class, l.id));
        for (String value : w.collectionIds()) {
            long id;
            try {
                id = Long.parseLong(value);
            } catch (RuntimeException e) {
                throw AdminApiException.field("collectionIds", "ID không hợp lệ");
            }
            var active = jdbc.queryForList("select active from collection where id=?", Boolean.class, id);
            if (active.isEmpty() || (!active.getFirst() && !previous.contains(value)))
                throw AdminApiException.field("collectionIds", "Bộ sưu tập không hoạt động");
        }
        jdbc.update("delete from listing_age_group where listing_id=?", l.id);
        for (String age : w.ageGroups())
            jdbc.update("insert into listing_age_group values (?,?)", l.id, age);
        jdbc.update("delete from listing_collection where listing_id=?", l.id);
        for (String value : w.collectionIds())
            jdbc.update("insert into listing_collection values (?,?)", l.id, Long.parseLong(value));
    }
}
