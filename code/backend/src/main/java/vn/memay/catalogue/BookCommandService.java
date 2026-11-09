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
    @org.springframework.beans.factory.annotation.Autowired
    private vn.memay.common.PerformanceTimings timings = new vn.memay.common.PerformanceTimings(false);

    @org.springframework.beans.factory.annotation.Autowired private BookFeatureStore features;
    private final BookCopyRepository books;
    private final BookVariantStore variants;
    private final ListingRepository listings;
    private final CategoryRepository categories;
    private final BookCodeGenerator codes;
    private final BookValidation validation;
    private final BookAccess access;
    @org.springframework.beans.factory.annotation.Autowired private BookStorageBoxes storageBoxes;
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

    private record CreatedAggregate(BookCopy book, Listing listing) {
    }

    private CreatedAggregate createAggregate(AdminUser actor, BookWrite input) {
        return createAggregate(actor,input,null);
    }

    private CreatedAggregate createAggregate(AdminUser actor, BookWrite input, Long unitPrice) {
        return createAggregate(actor,input,unitPrice,false,null);
    }

    private CreatedAggregate createAggregate(AdminUser actor, BookWrite input, Long unitPrice, boolean archived, Integer storageBox) {
        var w = validation.normalize(input);
        timings.measure("validation", () -> {
            if(archived) validation.validateArchived(w); else validation.validateWrite(w);
            return null;
        });
        var b = new BookCopy();
        b.bookCode = codes.nextCode();
        b.unitPricePerKgVnd=unitPrice;
        b.storageBoxNumber=storageBox;
        b.availability = availability(w);
        b.createdAt = clock.instant()
                .truncatedTo(java.time.temporal.ChronoUnit.MICROS);
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
        return new CreatedAggregate(b, l);
    }

    BookDetail createImported(AdminUser actor, BookWrite input, UUID batchId) {
        return createImported(actor,input,batchId,1);
    }

    BookDetail createImported(AdminUser actor, BookWrite input, UUID batchId, int schemaVersion) {
        return createImported(actor,input,batchId,schemaVersion,null);
    }

    BookDetail createImported(AdminUser actor, BookWrite input, UUID batchId, int schemaVersion, Long unitPrice) {
        access.requireOwner(actor);
        var required = schemaVersion>=3?validation.importMetadataErrors(input):validation.metadataErrors(input);
        if (!required.isEmpty())
            throw new AdminApiException(400, "validation_error", required, null);
        if (BookValidation.trim(input.language()) == null || input.conditionGrade()!=null && !Set.of("HIGH_FRESHNESS", "MINOR_FLAWS")
                .contains(input.conditionGrade()))
            throw AdminApiException.field("import", "Kiểm tra ngôn ngữ và tình trạng trong file.");
        var aggregate = createAggregate(actor, input, unitPrice);
        var result = mapper.detail(aggregate.book(), aggregate.listing());
        var snapshot = audit.snapshot(result);
        snapshot.put("source", "IMPORT");
        snapshot.put("importBatchId", batchId.toString());
        audit.record(actor, "BOOK", aggregate.book().id, "CREATE", Map.of(), snapshot, aggregate.book().version);
        return result;
    }

    @Transactional
    public BookDetail createPublished(AdminUser actor, BookCreate input) {
        return createPublished(actor,input,BookEntryInput.Options.legacy());
    }

    @Transactional
    public BookDetail createPublished(AdminUser actor, BookCreate input, BookEntryInput.Options options) {
        return createPublished(actor,input,options,null);
    }

    @Transactional
    public BookDetail createPublished(AdminUser actor, BookCreate input, BookEntryInput.Options options, Publication publication) {
        Publication target=publication==null?Publication.PUBLISHED:publication;
        access.requireOwner(actor);
        if (input == null || input.uploadSessionId() == null)
            throw AdminApiException.field("uploadSessionId", "Thiếu phiên ảnh");
        var w = timings.measure("validation", () -> validation.normalize(BookEntryInput.resolve(input.write(),null,options,variants)));
        var assignments = assignments(input.media());
        var canonical = new BookCreate(w, input.uploadSessionId(), assignments, input.confirmedActualCopy());
        Object fingerprintInput=options.unitSupplied()?java.util.Arrays.asList(canonical,options.unitPrice()):canonical;
        if(publication!=null || options.featuresSupplied())
            fingerprintInput=java.util.Arrays.asList(fingerprintInput,publication,options.featuresSupplied()?options.featureCodes():null);
        if (options.storageBoxNumber() != null)
            fingerprintInput = List.of(fingerprintInput, "storageBoxNumber", options.storageBoxNumber());
        final Object normalizedFingerprint=fingerprintInput;
        String fingerprint = timings.measure("fingerprint", () -> {
            try {
                return java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256")
                        .digest(json.writeValueAsBytes(normalizedFingerprint)));
            } catch (java.security.NoSuchAlgorithmException e) {
                throw new IllegalStateException(e);
            }
        });
        var session = uploads.lock(input.uploadSessionId(), actor, false);
        if ("CONSUMED".equals(session.get("state"))) {
            if (!fingerprint.equals(session.get("request_fingerprint")))
                throw new AdminApiException(409, "upload_session_consumed");
            long id = ((Number) session.get("book_id")).longValue();
            return mapper.detail(books.findById(id).orElseThrow(() -> new AdminApiException(404,"not_found")), listings.findByBookCopyId(id).orElseThrow());
        }
        uploads.lock(input.uploadSessionId(), actor, true);
        if (target==Publication.PUBLISHED && !input.confirmedActualCopy())
            throw AdminApiException.field("confirmedActualCopy", "Xác nhận bộ ảnh của mục sách");
        var ready = jdbc.queryForList("select * from temporary_media where session_id=? and state='READY' for update",
                input.uploadSessionId());
        var selected = new LinkedHashMap<UUID, Map<String, Object>>();
        for (var assignment : assignments) {
            var photo = ready.stream().filter(m -> assignment.mediaId().equals(m.get("id"))).findFirst()
                    .orElseThrow(
                            () -> AdminApiException.field("media", "Ảnh chưa sẵn sàng hoặc không thuộc phiên này"));
            selected.put(assignment.mediaId(), photo);
        }
        if(target==Publication.ARCHIVED && w.title()==null && assignments.isEmpty())
            throw AdminApiException.field("title","Nhập tên sách hoặc ít nhất một ảnh");
        storageBoxes.requireExisting(options.storageBoxNumber());
        var codes=features.validate(options.featureCodes(),List.of());
        var aggregate = createAggregate(actor, w, options.unitPrice(),target==Publication.ARCHIVED,options.storageBoxNumber());
        features.save(aggregate.listing().id,codes);
        var b = aggregate.book();
        var l = aggregate.listing();
        long id = b.id;
        for (var assignment : assignments) {
            var m = selected.get(assignment.mediaId());
            jdbc.update(
                    "insert into book_media(id,book_copy_id,role,state,storage_public_id,asset_id,format,bytes,width,height,alt,source_ref,created_at,updated_at) values(?,?,?,'ACTIVE',?,?,?,?,?,?,?,?,?,?)",
                    assignment.mediaId(), id, assignment.role().canonical().name(), m.get("storage_public_id"), m.get("asset_id"),
                    m.get("format"), m.get("bytes"), m.get("width"), m.get("height"),
                    m.get("alt") == null ? assignment.role().label() + " " + b.bookCode : m.get("alt"),
                    m.get("source_ref"), m.get("created_at"), m.get("updated_at"));
            jdbc.update("delete from temporary_media where id=?", assignment.mediaId());
        }
        var prepared = mapper.detail(b, l);
        if(target==Publication.PUBLISHED) {
            validation.validatePublished(prepared);
            l.publicationStatus = Publication.PUBLISHED;
            l.publishedAt = clock.instant().truncatedTo(java.time.temporal.ChronoUnit.MICROS);
            em.flush();
        }
        var result = target==Publication.PUBLISHED?mapper.published(prepared, l.publishedAt):prepared;
        var snapshot = audit.snapshot(result);
        snapshot.put("confirmedActualCopy", input.confirmedActualCopy());
        audit.record(actor, "BOOK", id, "CREATE", Map.of(), snapshot, b.version);
        if(target==Publication.PUBLISHED) audit.record(actor, "BOOK", id, "PUBLISHED", Map.of(), snapshot, b.version);
        jdbc.update("update upload_session set state='CONSUMED',book_id=?,request_fingerprint=? where id=?", id,
                fingerprint, input.uploadSessionId());
        jdbc.update(
                "update temporary_media set delete_after=case when state='UPLOADING' then delete_after else ? end,state='DELETE_PENDING' where session_id=?",
                java.sql.Timestamp.from(clock.instant()), input.uploadSessionId());
        return result;
    }

    private List<MediaAssignment> assignments(List<MediaAssignment> input) {
        if (input == null || input.size() > 8
                || input.stream().anyMatch(m -> m == null || m.mediaId() == null || m.role() == null))
            throw AdminApiException.field("media", "Tối đa 8 ảnh hợp lệ");
        if (input.stream().map(MediaAssignment::mediaId).distinct().count() != input.size()
                || input.stream().map(a -> a.role().canonical()).distinct().count() != input.size())
            throw AdminApiException.field("media", "Ảnh/vai trò không được trùng");
        return input.stream().sorted(Comparator.comparingInt(m -> m.role().canonical().ordinal())).toList();
    }

    @Transactional
    public BookDetail update(long id, long version, AdminUser actor, BookWrite input) {
        return update(id, version, actor, input, null);
    }

    @Transactional
    public BookDetail update(long id, long version, AdminUser actor, BookWrite input, List<MediaAssignment> media) {
        return update(id,version,actor,input,media,BookEntryInput.Options.legacy());
    }

    @Transactional
    public BookDetail update(long id, long version, AdminUser actor, BookWrite input, List<MediaAssignment> media, BookEntryInput.Options options) {
        return update(id,version,actor,input,media,options,false,false,List.of());
    }

    @Transactional
    public BookDetail update(long id, long version, AdminUser actor, BookWrite input, List<MediaAssignment> media, BookEntryInput.Options options, boolean publishAfterSave, boolean confirmedActualCopy, List<MediaMetadata> mediaMetadata) {
        var b = books.findById(id).orElseThrow(() -> new AdminApiException(404, "not_found"));
        var l = listings.findByBookCopyId(id).orElseThrow();
        access.requireWritable(actor, l.publicationStatus);
        if (b.version != version)
            throw AdminApiException.conflict(b.version);
        var before = mapper.detail(b, l);
        var w = validation.normalize(BookEntryInput.resolve(input,before,options,variants));
        Integer storageBox = options.storageBoxSupplied() ? options.storageBoxNumber() : b.storageBoxNumber;
        storageBoxes.requireExisting(storageBox);
        Long unitPrice=options.unitSupplied()?options.unitPrice():b.unitPricePerKgVnd;
        timings.measure("validation", () -> {
            if (l.publicationStatus == Publication.ARCHIVED) {
                validation.validateArchived(w);
            } else {
                validation.validateWrite(w);
                if (before.binding() != null || !Objects.equals(before.categoryCode(), w.categoryCode()))
                    validation.requireBinding(w.categoryCode(), w.binding());
            }
            return null;
        });
        var codes=options.featuresSupplied()?features.validate(options.featureCodes(),before.features()):before.features().stream().map(Feature::code).toList();
        boolean metadataChanged=metadataChanged(before,mediaMetadata);
        boolean featureChanged=!codes.equals(before.features().stream().map(Feature::code).toList());
        boolean publishing=publishAfterSave && l.publicationStatus==Publication.ARCHIVED;
        if(publishing && !confirmedActualCopy) throw AdminApiException.field("confirmedActualCopy","Xác nhận bộ ảnh của mục sách");
        var reordered = media == null ? null : assignments(media);
        boolean mediaChanged = reordered != null && (reordered.size() != before.media().size() ||
                reordered.stream().anyMatch(a -> before.media().stream().noneMatch(m ->
                        a.mediaId().toString().equals(m.id()) && a.role().canonical()==m.role())));
        if (mapper.write(before).equals(w) && !mediaChanged && !featureChanged && !metadataChanged && !publishing && Objects.equals(unitPrice,b.unitPricePerKgVnd)
                && Objects.equals(storageBox,b.storageBoxNumber))
            return before;
        apply(b, l, w);
        b.unitPricePerKgVnd=unitPrice;
        b.availability = availability(w);
        b.storageBoxNumber = storageBox;
        mappings(l, w);
        variants.save(id, w.variants());
        if(featureChanged) features.save(l.id,codes);
        if(metadataChanged) {
            var active=images.findByBookCopyIdAndState(id,MediaDtos.MediaState.ACTIVE);
            for(var metadata:mediaMetadata) {
                var photo=active.stream().filter(m->m.id.equals(metadata.mediaId())).findFirst().orElseThrow();
                photo.alt=BookValidation.trim(metadata.alt());photo.sourceRef=BookValidation.trim(metadata.sourceRef());photo.updatedAt=clock.instant();
            }
        }
        b.touch(clock.instant());
        l.updatedAt = b.updatedAt;
        em.flush();
        if (mediaChanged)
            reorder(id, reordered);
        var after = mapper.detail(b, l);
        if (l.publicationStatus == Publication.PUBLISHED || publishing) {
            validation.validateWrite(w);
            validation.validatePublished(after);
        }
        if(publishing) {
            l.publicationStatus=Publication.PUBLISHED;
            if(l.publishedAt==null) l.publishedAt=clock.instant().truncatedTo(java.time.temporal.ChronoUnit.MICROS);
            em.flush();
            after=mapper.published(after,l.publishedAt);
            var published=audit.snapshot(after);published.put("confirmedActualCopy",true);
            audit.record(actor,"BOOK",id,"PUBLICATION_CHANGED",audit.snapshot(before),published,b.version);
        }
        audit.record(actor, "BOOK", id, "UPDATE", audit.snapshot(before), audit.snapshot(after), b.version);
        return after;
    }

    private boolean metadataChanged(BookDetail before,List<MediaMetadata> metadata) {
        if(metadata==null || metadata.size()>8) throw AdminApiException.field("mediaMetadata","Tối đa 8 ảnh");
        var ids=new HashSet<UUID>();boolean changed=false;
        for(var row:metadata) {
            if(row==null || row.mediaId()==null || !ids.add(row.mediaId())) throw AdminApiException.field("mediaMetadata","ID ảnh không hợp lệ hoặc trùng");
            var photo=before.media().stream().filter(m->m.id().equals(row.mediaId().toString())).findFirst()
                .orElseThrow(()->AdminApiException.field("mediaMetadata","Ảnh không thuộc sách"));
            var alt=BookValidation.trim(row.alt());var source=BookValidation.trim(row.sourceRef());
            if(alt!=null && alt.length()>300 || source!=null && source.length()>500) throw AdminApiException.field("mediaMetadata","Mô tả tối đa 300 ký tự, nguồn tối đa 500 ký tự");
            changed|=!Objects.equals(photo.alt(),alt) || !Objects.equals(photo.sourceRef(),source);
        }
        return changed;
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
            var assignment = assignments.stream().filter(a -> a.mediaId().equals(m.id)).findFirst().orElseThrow();
            m.role = assignment.role().canonical();
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
