package vn.memay.catalogue;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.*;
import java.sql.ResultSet;
import java.sql.SQLException;
import vn.memay.common.AdminApiException;
import vn.memay.media.MediaReadService;
import vn.memay.catalogue.PublicCatalogueDtos.*;
import vn.memay.catalogue.PublicCatalogueDtos.Collection;

@Service
@Transactional(readOnly = true)
public class PublicCatalogueService {
    @org.springframework.beans.factory.annotation.Autowired private tools.jackson.databind.ObjectMapper json;
    private final JdbcTemplate jdbc;
    @org.springframework.beans.factory.annotation.Autowired private HeroBannerService heroBanners;

    private final MediaReadService mediaReader;

    public PublicCatalogueService(JdbcTemplate jdbc, MediaReadService mediaReader) {
        this.jdbc = jdbc;
        this.mediaReader = mediaReader;
    }

    private static final String SALE = "(fs.enabled and current_timestamp>=fs.starts_at and current_timestamp<fs.ends_at and b.availability='AVAILABLE' and fi.sale_price_vnd<l.price_min_vnd)";
    private static final String FROM = " from book_copy b join listing l on l.book_copy_id=b.id left join category c on c.id=l.category_id left join flash_sale fs on fs.id=1 left join flash_sale_item fi on fi.listing_id=l.id ";
    private static final String SELECT = "select b.id,b.book_code,b.title,b.publisher,b.author,b.binding,b.availability,b.weight_g,l.id listing_id,l.slug,"
            + "l.price_min_vnd,l.price_max_vnd,case when " + SALE
            + " then fi.sale_price_vnd end sale_price_vnd,case when " + SALE
            + " then fs.ends_at end sale_ends_at,l.description,l.reading_level,l.reading_video_url,c.code category_code,"
            + "coalesce((select jsonb_agg(jsonb_build_object('code',f.code,'label',f.label) order by lf.position) from listing_feature lf join book_feature f on f.code=lf.feature_code where lf.listing_id=l.id),'[]'::jsonb)::text features";

    private record RelatedTarget(long bookCopyId, String publisher, Long categoryId) {
    }

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
        if (!BookValidation.usesBinding(category))
            binding = null;
        if (binding != null && !List.of("ALL", "PAPERBACK", "HARDCOVER").contains(binding))
            throw AdminApiException.field("binding", "Kiểu bìa không hợp lệ");
        StringBuilder where = new StringBuilder(" where l.publication_status='PUBLISHED' and b.deleted_at is null");
        List<Object> args = new ArrayList<>();
        if (q != null) {
            where.append(
                    " and (lower(b.book_code)=lower(?) or lower(b.title) like lower(?) escape '\\' or (b.publisher is not null and lower(b.publisher) like lower(?) escape '\\'))");
            args.add(q);
            var escaped = "%" + q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
            args.add(escaped);
            args.add(escaped);
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
            case "price_asc" -> "l.price_min_vnd asc,l.price_max_vnd asc";
            case "price_desc" -> "l.price_min_vnd desc,l.price_max_vnd desc";
            default -> "l.published_at desc nulls last";
        };
        if (preferAvailable)
            order = "(b.availability='AVAILABLE') desc," + order;
        args.add(20);
        args.add((long) page * 20);
        var rows = jdbc.query(SELECT + FROM + where + " order by " + order + ",b.book_code desc limit ? offset ?",
                this::book,
                args.toArray());
        return new BookDtos.Page<>(rows, page, 20, total, (int) ((total + 19) / 20));
    }

    public Book detail(String slug) {
        List<Book> found = jdbc.query(SELECT + FROM + " where l.slug=? and l.publication_status='PUBLISHED' and b.deleted_at is null",
                this::book,
                slug);
        if (found.isEmpty())
            throw new AdminApiException(404, "not_found");
        return found.getFirst();
    }

    public RelatedBooks related(String slug) {
        List<RelatedTarget> current = jdbc.query(
                "select b.id, b.publisher, l.category_id from book_copy b join listing l on l.book_copy_id=b.id where l.slug=? and l.publication_status='PUBLISHED' and b.deleted_at is null",
                (r, n) -> new RelatedTarget(r.getLong("id"), r.getString("publisher"),
                        r.getObject("category_id", Long.class)),
                slug);
        if (current.isEmpty())
            throw new AdminApiException(404, "not_found");
        RelatedTarget first = current.getFirst();
        long currentId = first.bookCopyId();
        String publisher = first.publisher();
        Long categoryId = first.categoryId();

        List<Book> samePublisher = List.of();
        if (publisher != null && !publisher.isBlank()) {
            samePublisher = jdbc.query(
                    SELECT + FROM
                            + " where l.publication_status='PUBLISHED' and b.deleted_at is null and b.id != ? and lower(trim(b.publisher)) = lower(trim(?)) order by (b.availability='AVAILABLE') desc, l.published_at desc nulls last, b.book_code desc limit 10",
                    this::book,
                    currentId, publisher.trim());
        }

        List<Book> sameCategory = List.of();
        if (categoryId != null) {
            sameCategory = jdbc.query(
                    SELECT + FROM
                            + " where l.publication_status='PUBLISHED' and b.deleted_at is null and b.id != ? and l.category_id = ? order by (b.availability='AVAILABLE') desc, l.published_at desc nulls last, b.book_code desc limit 10",
                    this::book,
                    currentId, categoryId);
        }

        return new RelatedBooks(samePublisher, sameCategory);
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
        List<Book> books = jdbc.query(
                SELECT + FROM + " where l.publication_status='PUBLISHED' and b.deleted_at is null and b.book_code in ("
                        + String.join(",", Collections.nCopies(ordered.size(), "?")) + ")",
                this::book, (Object[]) ordered.toArray());
        var byCode = new HashMap<String, Book>();
        for (Book book : books)
            byCode.put(book.bookCode(), book);
        return ordered.stream().filter(byCode::containsKey).map(byCode::get).toList();
    }

    private record MediaRow(UUID id, String role, String alt, UUID generation) {
        Media describe(String slug, Map<UUID, List<MediaReadService.Variant>> available) {
            String path = "/api/v1/books/" + slug + "/media/" + role;
            if (generation == null) return new Media(role, alt, path, id.toString(), null);
            var variants = available.getOrDefault(generation, List.of()).stream()
                    .map(v -> new ImageVariant(path + "?size=" + v.size() + "&format=" + v.format() + "&v=" + generation,
                            v.size(), v.format(), v.width(), v.height())).toList();
            if (variants.isEmpty()) return null;
            var thumbnail = variants.stream().filter(v -> v.size() == 480 && v.format().equals("jpg"))
                    .findFirst().orElse(variants.getFirst());
            return new Media(role, alt, thumbnail.url(), generation.toString(), variants);
        }
    }

    private Book book(ResultSet r, int n) throws SQLException {
        long id = r.getLong("id"), listing = r.getLong("listing_id");
        String slug = r.getString("slug");
        List<String> ages = jdbc.queryForList(
                "select age_group from listing_age_group where listing_id=? order by age_group",
                String.class, listing);
        var rows = jdbc.query(
                "select id,role,alt,serving_generation from book_media where book_copy_id=? and state='ACTIVE' order by case role when 'FRONT' then 0 when 'BACK' then 1 when 'SPINE' then 2 when 'INSIDE_1' then 3 when 'INSIDE_2' then 4 when 'INSIDE_3' then 5 when 'INSIDE_4' then 6 else 7 end",
                (m, i) -> new MediaRow(m.getObject("id", UUID.class), m.getString("role"),
                        m.getString("alt"), m.getObject("serving_generation", UUID.class)), id);
        var available = rows.stream().anyMatch(row -> row.generation() != null)
                ? mediaReader.publicVariants(id) : Map.<UUID, List<MediaReadService.Variant>>of();
        var media = rows.stream().map(row -> row.describe(slug, available)).filter(Objects::nonNull).toList();
        return new Book(Long.toString(id), r.getString("book_code"), slug, r.getString("title"),
                r.getString("publisher"), r.getString("author"), ages, r.getString("category_code"),
                r.getString("binding"), null, null,
                r.getObject("price_min_vnd", Long.class), r.getObject("price_max_vnd", Long.class),
                r.getObject("sale_price_vnd", Long.class),
                r.getTimestamp("sale_ends_at") == null ? null : r.getTimestamp("sale_ends_at").toInstant(),
                r.getObject("weight_g", Long.class), r.getString("description"), r.getString("reading_level"),
                r.getString("reading_video_url"),
                r.getString("availability"), media, List.of(), json.readValue(r.getString("features"),json.getTypeFactory().constructCollectionType(List.class,BookDtos.Feature.class)));
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
        List<Shelf> shelves = new ArrayList<>();
        shelf(shelves, "NEWEST", "Sách mới đăng", "/sach", null, null);
        shelf(shelves, "CATEGORY:BOARD_BOOK", "Board books cho bé nhỏ", "/sach?category=BOARD_BOOK", "BOARD_BOOK", null);
        shelf(shelves, "CATEGORY:PICTURE_BOOK", "Picture books", "/sach?category=PICTURE_BOOK", "PICTURE_BOOK", null);
        for (Collection c : collections().stream().limit(2).toList())
            shelf(shelves, "COLLECTION:" + c.slug(), c.name(), "/bo-suu-tap/" + c.slug(), null, c.slug());
        return new Home(shelves,heroBanners.published());
    }

    private void shelf(List<Shelf> rows, String shelfKey, String title, String href, String category, String collection) {
        StringBuilder pinnedWhere = new StringBuilder(
                " join home_featured_item hfi on hfi.listing_id=l.id where hfi.shelf_key=? and l.publication_status='PUBLISHED' and b.deleted_at is null and b.availability='AVAILABLE'");
        List<Object> args = new ArrayList<>();
        args.add(shelfKey);
        if (category != null) {
            pinnedWhere.append(" and c.code=?");
            args.add(category);
        }
        if (collection != null) {
            pinnedWhere.append(
                    " and exists(select 1 from listing_collection lc join collection co on co.id=lc.collection_id where lc.listing_id=l.id and co.active and co.slug=?)");
            args.add(collection);
        }
        List<Book> pinned = jdbc.query(
                SELECT + FROM + pinnedWhere + " order by hfi.position asc limit 10",
                this::book,
                (Object[]) args.toArray());
        List<Book> combined = new ArrayList<>(pinned);
        if (combined.size() < 10) {
            Set<String> seenIds = new HashSet<>();
            for (Book b : combined)
                seenIds.add(b.id());
            List<Book> autoItems = list(null, category, null, List.of(), "newest", 0, collection, true).items();
            for (Book b : autoItems) {
                if (combined.size() >= 10)
                    break;
                if (seenIds.add(b.id()))
                    combined.add(b);
            }
        }
        if (!combined.isEmpty())
            rows.add(new Shelf(title, href, List.copyOf(combined)));
    }
}
