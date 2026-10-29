package vn.memay.catalogue;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.util.*;
import vn.memay.catalogue.BookDtos.*;
import vn.memay.listing.*;
import vn.memay.audit.AuditService;
import vn.memay.auth.AdminUser;
import vn.memay.common.AdminApiException;

@Service
public class BookStatusService {
    private final BookCopyRepository books;
    private final ListingRepository listings;
    private final BookMapper mapper;
    private final BookAccess access;
    private final BookValidation validation;
    private final AuditService audit;
    private final Clock clock;
    private final EntityManager em;

    public BookStatusService(BookCopyRepository books, ListingRepository listings, BookMapper mapper, BookAccess access,
            BookValidation validation, AuditService audit, Clock clock, EntityManager em) {
        this.books = books;
        this.listings = listings;
        this.mapper = mapper;
        this.access = access;
        this.validation = validation;
        this.audit = audit;
        this.clock = clock;
        this.em = em;
    }

    @Transactional
    public BookDetail publication(long id, long version, AdminUser actor, Publication target,
            boolean confirmedActualCopy) {
        access.requireOwner(actor);
        var b = find(id, version);
        var l = listings.findByBookCopyId(id).orElseThrow();
        var before = mapper.detail(b, l);
        if (target == null)
            throw AdminApiException.field("status", "Chọn trạng thái");
        if (target == l.publicationStatus)
            return before;
        boolean valid = (l.publicationStatus == Publication.ARCHIVED && target == Publication.PUBLISHED)
                || (l.publicationStatus == Publication.PUBLISHED && target == Publication.ARCHIVED);
        if (!valid)
            throw new AdminApiException(409, "transition_conflict");
        if (target == Publication.PUBLISHED) {
            if (!confirmedActualCopy)
                throw AdminApiException.field("confirmedActualCopy", "Xác nhận đúng ảnh và tình trạng cuốn sách");
            validation.validatePublished(before);
            validation.validateWrite(mapper.write(before));
            if (l.publishedAt == null)
                l.publishedAt = clock.instant().truncatedTo(java.time.temporal.ChronoUnit.MICROS);
        }
        l.publicationStatus = target;
        b.touch(clock.instant());
        l.updatedAt = b.updatedAt;
        em.flush();
        var result = mapper.detail(b, l);
        var after = audit.snapshot(result);
        if (target == Publication.PUBLISHED)
            after.put("confirmedActualCopy", true);
        audit.record(actor, "BOOK", id, "PUBLICATION_CHANGED", audit.snapshot(before), after, b.version);
        return result;
    }

    @Transactional
    public BookDetail availability(long id, long version, AdminUser actor, Availability target) {
        access.requireOwner(actor);
        if (target == null)
            throw AdminApiException.field("availability", "Chọn trạng thái");
        var b = find(id, version);
        var l = listings.findByBookCopyId(id).orElseThrow();
        var before = mapper.detail(b, l);
        if (b.availability == target)
            return before;
        b.availability = target;
        b.touch(clock.instant());
        em.flush();
        var result = mapper.detail(b, l);
        audit.record(actor, "BOOK", id, "AVAILABILITY_CHANGED", audit.snapshot(before), audit.snapshot(result),
                b.version);
        return result;
    }

    private BookCopy find(long id, long version) {
        var b = books.findById(id).orElseThrow(() -> new AdminApiException(404, "not_found"));
        if (b.version != version)
            throw AdminApiException.conflict(b.version);
        return b;
    }
}
