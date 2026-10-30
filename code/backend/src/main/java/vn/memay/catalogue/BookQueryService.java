package vn.memay.catalogue;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.ObjectMapper;
import java.util.*;
import vn.memay.auth.AdminUser;
import vn.memay.common.AdminApiException;
import vn.memay.listing.ListingRepository;
import vn.memay.catalogue.BookDtos.*;

@Service
@Transactional(readOnly = true)
public class BookQueryService {
    private final JdbcTemplate jdbc;
    private final BookCopyRepository books;
    private final ListingRepository listings;
    private final BookMapper mapper;
    private final ObjectMapper json;

    public BookQueryService(JdbcTemplate jdbc, BookCopyRepository books, ListingRepository listings, BookMapper mapper,
            ObjectMapper json) {
        this.jdbc = jdbc;
        this.books = books;
        this.listings = listings;
        this.mapper = mapper;
        this.json = json;
    }

    public BookDetail detail(long id, AdminUser actor) {
        var b = books.findById(id).orElseThrow(() -> new AdminApiException(404, "not_found"));
        return mapper.detail(b, listings.findByBookCopyId(id).orElseThrow());
    }

    public static void page(int page, int size) {
        if (page < 0)
            throw AdminApiException.field("page", "Trang không hợp lệ");
        if (size < 1 || size > 100)
            throw AdminApiException.field("size", "Chọn từ 1 đến 100");
    }

    public Page<BookSummary> list(AdminUser actor, BookFilter filter) {
        page(filter.page(), filter.size());
        String q = BookValidation.trim(filter.q());
        if (q != null && q.length() > 200)
            throw AdminApiException.field("q", "Tối đa 200 ký tự");
        var where = new StringBuilder(" from book_copy b join listing l on l.book_copy_id=b.id where true");
        List<Object> args = new ArrayList<>();
        if (q != null) {
            where.append(" and (lower(b.book_code)=lower(?) or lower(b.title) like lower(?) escape '\\')");
            args.add(q);
            args.add("%" + q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%");
        }
        if (filter.publication() != null) {
            where.append(" and l.publication_status=?");
            args.add(filter.publication().name());
        }
        if (filter.availability() != null) {
            where.append(" and b.availability=?");
            args.add(filter.availability().name());
        }
        long total = jdbc.queryForObject("select count(*)" + where, Long.class, args.toArray());
        args.add(filter.size());
        args.add((long) filter.page() * filter.size());
        var items = jdbc.query(
                "select b.id,b.book_code,b.title,l.price_min_vnd,l.price_max_vnd,l.publication_status,b.availability,b.version,b.updated_at,(select coalesce(sum(v.stock),0) from book_variant v where v.book_copy_id=b.id) total_stock,exists(select 1 from book_media m where m.book_copy_id=b.id and m.role='FRONT' and m.state='ACTIVE') has_front"
                        + where + " order by b.updated_at desc,b.id desc limit ? offset ?",
                (r, n) -> new BookSummary(r.getString("id"), r.getString("book_code"), r.getString("title"),
                        r.getObject("price_min_vnd", Long.class), r.getObject("price_max_vnd", Long.class),
                        Publication.valueOf(r.getString("publication_status")),
                        Availability.valueOf(r.getString("availability")), r.getLong("version"),
                        r.getTimestamp("updated_at").toInstant(),
                        r.getBoolean("has_front") ? "/api/v1/admin/books/" + r.getString("id") + "/media/FRONT/content"
                                : null,
                        r.getLong("total_stock")),
                args.toArray());
        return new Page<>(items, filter.page(), filter.size(), total,
                (int) ((total + filter.size() - 1) / filter.size()));
    }

    public PreviewBook preview(long id, AdminUser actor) {
        var b = detail(id, actor);
        return new PreviewBook(b.bookCode(), b.slug(), b.title(), b.publisher(), b.author(), b.ageGroups(),
                b.categoryCode(), b.binding(), b.conditionGrade(), b.conditionNote(), b.priceMinVnd(), b.priceMaxVnd(),
                b.weightG(), b.description(),
                b.readingLevel(), b.readingVideoUrl(), b.availability(),
                b.media().stream().map(m -> new PreviewMedia(m.id(), m.role(), m.alt(), m.contentPath())).toList(),
                b.variants(), b.totalStock());
    }

    public Page<AuditSummary> audit(long id, AdminUser actor, int page, int size) {
        page(page, size);
        detail(id, actor);
        long total = jdbc.queryForObject("select count(*) from audit_event where target_type='BOOK' and target_id=?",
                Long.class, id);
        var items = jdbc.query(
                "select * from audit_event where target_type='BOOK' and target_id=? order by created_at desc,id desc limit ? offset ?",
                (r, n) -> new AuditSummary(r.getString("id"), r.getString("actor_id"), r.getString("action"),
                        json.readValue(r.getString("before_data"), Map.class),
                        json.readValue(r.getString("after_data"), Map.class), r.getLong("aggregate_version"),
                        r.getTimestamp("created_at").toInstant()),
                id, size, (long) page * size);
        return new Page<>(items, page, size, total, (int) ((total + size - 1) / size));
    }
}
