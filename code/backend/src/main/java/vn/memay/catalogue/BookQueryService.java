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
    private static final String MISSING_FIELDS = """
            array_remove(array[
              case when nullif(btrim(b.title),'') is null then 'Tên sách' end,
              case when c.code is null then 'Thể loại' end,
              case when c.code <> 'BOARD_BOOK' and b.binding is null then 'Kiểu bìa' end,
              case when nullif(btrim(b.publisher),'') is null then 'Nhà xuất bản' end,
              case when nullif(btrim(b.author),'') is null then 'Tác giả' end,
              case when nullif(btrim(b.language),'') is null then 'Ngôn ngữ' end,
              case when l.price_min_vnd is null or l.price_max_vnd is null then 'Khoảng giá' end,
              case when b.weight_g is null then 'Trọng lượng' end,
              case when b.unit_price_per_kg_vnd is null then 'Đơn giá/kg' end,
              case when nullif(btrim(l.description),'') is null then 'Mô tả' end,
              case when not exists(select 1 from listing_age_group a where a.listing_id=l.id) then 'Nhóm tuổi' end,
              case when nullif(btrim(l.reading_level),'') is null then 'Trình độ đọc' end,
              case when nullif(btrim(l.reading_video_url),'') is null then 'Link video' end,
              case when not exists(select 1 from listing_collection lc where lc.listing_id=l.id) then 'Bộ sưu tập' end,
              case when not exists(select 1 from listing_feature lf where lf.listing_id=l.id) then 'Đặc điểm' end,
              case when not exists(select 1 from book_media m where m.book_copy_id=b.id and m.role='FRONT' and m.state='ACTIVE') then 'Ảnh bìa' end,
              case when not exists(select 1 from book_media m where m.book_copy_id=b.id and m.role='BACK' and m.state='ACTIVE') then 'Ảnh lưng' end
            ],null)
            """;
    private static final String ADMIN_ORDER = "b.updated_at desc,b.id desc";

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

    public boolean titleDuplicate(AdminUser actor,String title,Long excludeId) {
        String name=BookValidation.trim(title);
        if(name==null) return false;
        if(name.length()>300 || excludeId!=null && excludeId<1)
            throw AdminApiException.field("title","Invalid title lookup");
        if(excludeId==null)
            return Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from book_copy where lower(trim(title))=lower(?))",Boolean.class,name));
        return Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from book_copy where lower(trim(title))=lower(?) and id<>?)",Boolean.class,name,excludeId));
    }

    public static void page(int page, int size) {
        if (page < 0)
            throw AdminApiException.field("page", "Trang không hợp lệ");
        if (size < 1 || size > 100)
            throw AdminApiException.field("size", "Chọn từ 1 đến 100");
    }

    @Transactional(readOnly = true, isolation = org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public Page<BookSummary> list(AdminUser actor, BookFilter filter) {
        page(filter.page(), filter.size());
        String q = BookValidation.trim(filter.q());
        if (q != null && q.length() > 200)
            throw AdminApiException.field("q", "Tối đa 200 ký tự");
        var where = new StringBuilder(" from book_copy b join listing l on l.book_copy_id=b.id left join category c on c.id=l.category_id where b.deleted_at is null");
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
        if(Boolean.TRUE.equals(filter.unpublishedOnly()))where.append(" and l.publication_status='ARCHIVED' and l.published_at is null");
        if (filter.category() != null) {
            where.append(" and c.code=?");
            args.add(filter.category());
        }
        if (filter.binding() != null) {
            where.append(" and b.binding=?");
            args.add(filter.binding());
        }
        boolean missingOnly = Boolean.TRUE.equals(filter.missingOnly());
        if (missingOnly) where.append(" and cardinality(").append(MISSING_FIELDS).append(")>0");
        long total = jdbc.queryForObject("select count(*)" + where, Long.class, args.toArray());
        int requestedPage = filter.page();
        if (filter.focusId() != null) {
            var focusArgs = new ArrayList<>(args);
            focusArgs.add(filter.focusId());
            var ranks = jdbc.queryForList("select ordinal from (select b.id, row_number() over(order by "
                    + ADMIN_ORDER + ") - 1 ordinal" + where + ") ranked where id=?", Long.class, focusArgs.toArray());
            if (!ranks.isEmpty()) requestedPage = Math.toIntExact(ranks.getFirst() / filter.size());
            else requestedPage = (int) Math.min(requestedPage, Math.max(0, (total - 1) / filter.size()));
        }
        args.add(filter.size());
        args.add((long) requestedPage * filter.size());
        var items = jdbc.query(
                "select b.id,b.book_code,b.title,l.price_min_vnd,l.price_max_vnd,l.publication_status,l.published_at,b.availability,b.version,b.updated_at,(select coalesce(sum(v.stock),0) from book_variant v where v.book_copy_id=b.id) total_stock,exists(select 1 from book_media m where m.book_copy_id=b.id and m.role='FRONT' and m.state='ACTIVE') has_front"
                        + ", " + MISSING_FIELDS + " missing_fields"
                        + where + " order by " + ADMIN_ORDER + " limit ? offset ?",
                (r, n) -> new BookSummary(r.getString("id"), r.getString("book_code"), r.getString("title"),
                        r.getObject("price_min_vnd", Long.class), r.getObject("price_max_vnd", Long.class),
                        Publication.valueOf(r.getString("publication_status")),
                        Availability.valueOf(r.getString("availability")), r.getLong("version"),
                        r.getTimestamp("updated_at").toInstant(),
                        r.getBoolean("has_front") ? "/api/v1/admin/books/" + r.getString("id") + "/media/FRONT/content"
                                : null,
                        r.getLong("total_stock"),r.getTimestamp("published_at")==null?null:r.getTimestamp("published_at").toInstant(),
                        Arrays.asList((String[]) r.getArray("missing_fields").getArray())),
                args.toArray());
        return new Page<>(items, requestedPage, filter.size(), total,
                (int) ((total + filter.size() - 1) / filter.size()));
    }

    public PreviewBook preview(long id, AdminUser actor) {
        var b = detail(id, actor);
        return new PreviewBook(b.bookCode(), b.slug(), b.title(), b.publisher(), b.author(), b.ageGroups(),
                b.categoryCode(), b.binding(), null, null, b.priceMinVnd(), b.priceMaxVnd(),
                b.weightG(), b.description(),
                b.readingLevel(), b.readingVideoUrl(), b.availability(),
                b.media().stream().filter(MediaView::visibleOnProduct).map(m -> new PreviewMedia(m.id(), m.role(), m.alt(), m.contentPath())).toList(),
                List.of(), 0, b.features());
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
