package vn.memay.catalogue;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.*;
import java.sql.ResultSet;
import java.sql.SQLException;
import vn.memay.common.AdminApiException;
import vn.memay.catalogue.PublicCatalogueDtos.*;
import vn.memay.catalogue.PublicCatalogueDtos.Collection;

@Service
@Transactional(readOnly = true)
public class PublicCatalogueService {
    private final JdbcTemplate jdbc;

    public PublicCatalogueService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static final String SALE = "(fs.enabled and current_timestamp>=fs.starts_at and current_timestamp<fs.ends_at and b.availability='AVAILABLE' and fi.sale_price_vnd<l.price_vnd)";
    private static final String PRICE = "case when " + SALE + " then fi.sale_price_vnd else l.price_vnd end";
    private static final String FROM = " from book_copy b join listing l on l.book_copy_id=b.id left join category c on c.id=l.category_id left join flash_sale fs on fs.id=1 left join flash_sale_item fi on fi.listing_id=l.id ";
    private static final String SELECT = "select b.id,b.book_code,b.title,b.publisher,b.author,b.binding,b.condition_grade,b.condition_note,b.availability,l.id listing_id,l.slug,"
            + PRICE + " price_vnd,case when " + SALE + " then l.price_vnd end original_price_vnd,case when " + SALE
            + " then fs.ends_at end sale_ends_at,l.description,l.reading_level,l.reading_video_url,c.code category_code";

    public BookDtos.Page<Book> list(String q, String category, String binding, List<String> ages, String sort, int page,
            String collection) {
        return list(q, category, binding, ages, sort, page, collection, false);
    }

    private BookDtos.Page<Book> list(String q, String category, String binding, List<String> ages, String sort,
            int page, String collection, boolean preferAvailable) {
        if (page < 0)
            throw AdminApiException.field("page", "Trang không hợp lệ");
        q = BookValidation.trim(q);
        if (q != null && q.length() > 200)
            throw AdminApiException.field("q", "Tối đa200 ký tự");
        if (!List.of("newest", "price_asc", "price_desc").contains(sort))
            throw AdminApiException.field("sort", "Thứ tự không hợp lệ");
        if (ages == null)
            ages = List.of();
        if (ages.size() > 4 || !BookValidation.AGES.containsAll(ages))
            throw AdminApiException.field("age", "Nhóm tuổi không hợp lệ");
        if (category != null
                && !jdbc.queryForObject("select exists(select 1 from category where code=?)", Boolean.class, category))
            throw AdminApiException.field("category", "Thể loại không hợp lệ");
        if (!"PICTURE_BOOK".equals(category))
            binding = null;
        if (binding != null && !List.of("ALL", "PAPERBACK", "HARDCOVER").contains(binding))
            throw AdminApiException.field("binding", "Kiểu bìa không hợp lệ");
        StringBuilder where = new StringBuilder(" where l.publication_status='PUBLISHED'");
        List<Object> args = new ArrayList<>();
        if (q != null) {
            where.append(" and (lower(b.book_code)=lower(?) or lower(b.title) like lower(?) escape '\\')");
            args.add(q);
            args.add("%" + q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%");
        }
        if (category != null) {
            where.append(" and c.code=?");
            args.add(category);
        }
        if (binding != null && !binding.equals("ALL")) {
            where.append(" and b.binding=?");
            args.add(binding);
        }
        if (!ages.isEmpty()) {
            where.append(" and exists(select 1 from listing_age_group a where a.listing_id=l.id and a.age_group in ("
                    + String.join(",", Collections.nCopies(ages.size(), "?")) + "))");
            args.addAll(ages);
        }
        if (collection != null) {
            collection(collection);
            where.append(
                    " and exists(select 1 from listing_collection lc join collection co on co.id=lc.collection_id where lc.listing_id=l.id and co.active and co.slug=?)");
            args.add(collection);
        }
        long total = jdbc.queryForObject("select count(*)" + FROM + where, Long.class, args.toArray());
        String order = switch (sort) {
            case "price_asc" -> PRICE + " asc";
            case "price_desc" -> PRICE + " desc";
            default -> "l.published_at desc nulls last";
        };
        if (preferAvailable)
            order = "(b.availability='AVAILABLE') desc," + order;
        args.add(20);
        args.add((long) page * 20);
        var rows = jdbc.query(SELECT + FROM + where + " order by " + order + ",b.id desc limit ? offset ?", this::book,
                args.toArray());
        return new BookDtos.Page<>(rows, page, 20, total, (int) ((total + 19) / 20));
    }

    public Book detail(String slug) {
        var found = jdbc.query(SELECT + FROM + " where l.slug=? and l.publication_status='PUBLISHED'", this::book,
                slug);
        if (found.isEmpty())
            throw new AdminApiException(404, "not_found");
        return found.getFirst();
    }

    public List<Book> lookup(List<String> codes) {
        if (codes == null || codes.isEmpty() || codes.size() > 100)
            throw AdminApiException.field("code", "Cần từ1 đến100 mã sách");
        for (String code : codes) {
            try {
                if (code == null || !code.matches("MM-[0-9]{6,19}")
                        || !BookCodeGenerator.format(Long.parseLong(code.substring(3))).equals(code))
                    throw new IllegalArgumentException();
            } catch (IllegalArgumentException e) {
                throw AdminApiException.field("code", "Mã sách không hợp lệ");
            }
        }
        var ordered = new LinkedHashSet<>(codes);
        var books = jdbc.query(
                SELECT + FROM + " where l.publication_status='PUBLISHED' and b.book_code in ("
                        + String.join(",", Collections.nCopies(ordered.size(), "?")) + ")",
                this::book, ordered.toArray());
        var byCode = new HashMap<String, Book>();
        for (var book : books)
            byCode.put(book.bookCode(), book);
        return ordered.stream().filter(byCode::containsKey).map(byCode::get).toList();
    }

    private Book book(ResultSet r, int n) throws SQLException {
        long id = r.getLong("id"), listing = r.getLong("listing_id");
        String slug = r.getString("slug");
        var ages = jdbc.queryForList("select age_group from listing_age_group where listing_id=? order by age_group",
                String.class, listing);
        var media = jdbc.query(
                "select role,alt from book_media where book_copy_id=? and state='ACTIVE' order by case role when 'FRONT' then 0 when 'BACK' then 1 else 2 end",
                (m, i) -> new Media(m.getString("role"), m.getString("alt"),
                        "/api/v1/books/" + slug + "/media/" + m.getString("role")),
                id);
        return new Book(Long.toString(id), r.getString("book_code"), slug, r.getString("title"),
                r.getString("publisher"), r.getString("author"), ages, r.getString("category_code"),
                r.getString("binding"), r.getString("condition_grade"), r.getString("condition_note"),
                r.getObject("price_vnd", Long.class), r.getObject("original_price_vnd", Long.class),
                r.getTimestamp("sale_ends_at") == null ? null : r.getTimestamp("sale_ends_at").toInstant(),
                r.getString("description"), r.getString("reading_level"), r.getString("reading_video_url"),
                r.getString("availability"), media);
    }

    public List<Collection> collections() {
        return jdbc.query("select slug,name from collection where active order by sort_order,id",
                (r, n) -> new Collection(r.getString(1), r.getString(2)));
    }

    public Collection collection(String slug) {
        return collections().stream().filter(c -> c.slug().equals(slug)).findFirst()
                .orElseThrow(() -> new AdminApiException(404, "not_found"));
    }

    public Home home() {
        var shelves = new ArrayList<Shelf>();
        shelf(shelves, "Sách mới đăng", "/sach", null, null);
        shelf(shelves, "Board books cho bé nhỏ", "/sach?category=BOARD_BOOK", "BOARD_BOOK", null);
        shelf(shelves, "Picture books", "/sach?category=PICTURE_BOOK", "PICTURE_BOOK", null);
        for (var c : collections().stream().limit(2).toList())
            shelf(shelves, c.name(), "/bo-suu-tap/" + c.slug(), null, c.slug());
        return new Home(shelves);
    }

    private void shelf(List<Shelf> rows, String title, String href, String category, String collection) {
        var books = list(null, category, null, List.of(), "newest", 0, collection, true).items().stream().limit(5)
                .toList();
        if (!books.isEmpty())
            rows.add(new Shelf(title, href, books));
    }
}
