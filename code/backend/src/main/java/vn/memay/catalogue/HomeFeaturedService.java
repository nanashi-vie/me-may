package vn.memay.catalogue;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.memay.audit.AuditService;
import vn.memay.auth.AdminUser;
import vn.memay.common.AdminApiException;

@Service
public class HomeFeaturedService {
    public record PinnedBook(String id, String bookCode, String title, Long priceMinVnd, Long priceMaxVnd,
            String publicationStatus, String availability, String coverUrl, boolean activeOnHome) {
    }

    public record ShelfConfig(String shelfKey, String title, String href, String categoryCode, String collectionSlug,
            List<PinnedBook> items) {
    }

    public record Config(Long version, List<ShelfConfig> shelves) {
    }

    public record ShelfUpdate(String shelfKey, List<String> bookCodes) {
    }

    public record UpdateRequest(Long version, List<ShelfUpdate> shelves) {
    }

    private record ShelfDef(String shelfKey, String title, String href, String categoryCode, String collectionSlug) {
    }

    private record ListingCandidate(long listingId, String publicationStatus, String categoryCode,
            boolean inCollection) {
    }

    private final JdbcTemplate jdbc;
    private final BookAccess access;
    private final AuditService audit;

    public HomeFeaturedService(JdbcTemplate jdbc, BookAccess access, AuditService audit) {
        this.jdbc = jdbc;
        this.access = access;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public Config get(AdminUser actor) {
        return current();
    }

    @Transactional(readOnly = true)
    public List<PinnedBook> candidates(AdminUser actor, String shelfKey, String q) {
        ShelfDef def = resolveShelfDef(shelfKey);
        String trimmed = BookValidation.trim(q);
        if (trimmed != null && trimmed.length() > 200)
            throw AdminApiException.field("q", "Tối đa 200 ký tự");

        StringBuilder where = new StringBuilder(
                " where l.publication_status='PUBLISHED' and b.availability='AVAILABLE'");
        List<Object> args = new ArrayList<>();
        if (def.categoryCode() != null) {
            where.append(" and c.code=?");
            args.add(def.categoryCode());
        }
        if (def.collectionSlug() != null) {
            where.append(
                    " and exists(select 1 from listing_collection lc join collection co on co.id=lc.collection_id where lc.listing_id=l.id and co.slug=?)");
            args.add(def.collectionSlug());
        }
        if (trimmed != null) {
            where.append(
                    " and (lower(b.book_code)=lower(?) or lower(b.title) like lower(?) escape '\\' or (b.publisher is not null and lower(b.publisher) like lower(?) escape '\\'))");
            args.add(trimmed);
            String escaped = "%" + trimmed.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
            args.add(escaped);
            args.add(escaped);
        }

        String sql = "select b.id, b.book_code, b.title, l.price_min_vnd, l.price_max_vnd, l.publication_status, b.availability, "
                + "exists(select 1 from book_media m where m.book_copy_id=b.id and m.role='FRONT' and m.state='ACTIVE') has_front, "
                + "true as scope_match "
                + "from book_copy b join listing l on l.book_copy_id=b.id left join category c on c.id=l.category_id"
                + where + " order by l.published_at desc nulls last, b.book_code desc limit 20";

        List<PinnedBook> rows = jdbc.query(sql, this::mapPinnedBook, (Object[]) args.toArray());
        return rows;
    }

    @Transactional
    public Config update(AdminUser actor, UpdateRequest req) {
        access.requireOwner(actor);
        Long currentVersion = jdbc.queryForObject("select version from home_featured_config where id=1 for update",
                Long.class);
        long version = currentVersion == null ? 0L : currentVersion;
        if (req == null || req.version() == null || req.version() < 0)
            throw AdminApiException.field("version", "Thiếu version");
        if (req.version() != version)
            throw AdminApiException.conflict(version);
        if (req.shelves() == null)
            throw AdminApiException.field("shelves", "Thiếu danh sách kệ sách");

        Set<String> seenShelves = new HashSet<>();
        Map<String, List<Long>> resolvedByShelf = new LinkedHashMap<>();

        for (ShelfUpdate shelf : req.shelves()) {
            if (shelf == null || shelf.shelfKey() == null || shelf.shelfKey().isBlank())
                throw AdminApiException.field("shelves", "Kệ sách không hợp lệ");
            String key = shelf.shelfKey().trim();
            if (!seenShelves.add(key))
                throw AdminApiException.field("shelves", "Trùng kệ sách " + key);
            ShelfDef def = resolveShelfDef(key);

            List<String> codes = shelf.bookCodes() == null ? List.of() : shelf.bookCodes();
            if (codes.size() > 10)
                throw AdminApiException.field("shelves", "Mỗi kệ chọn tối đa 10 cuốn");

            Set<Long> existingListingIds = new HashSet<>(jdbc.queryForList(
                    "select listing_id from home_featured_item where shelf_key=?",
                    Long.class, key));

            Set<String> seenCodes = new HashSet<>();
            List<Long> listingIds = new ArrayList<>();
            for (String rawCode : codes) {
                if (rawCode == null || rawCode.isBlank())
                    throw AdminApiException.field("shelves", "Mã sách không được để trống");
                String code = rawCode.trim().toUpperCase(Locale.ROOT);
                if (!seenCodes.add(code))
                    throw AdminApiException.field("shelves", "Mã sách bị trùng trong cùng một kệ: " + code);

                List<ListingCandidate> found = jdbc.query(
                        "select l.id, l.publication_status, c.code category_code, "
                                + (def.collectionSlug() != null
                                        ? "exists(select 1 from listing_collection lc join collection co on co.id=lc.collection_id where lc.listing_id=l.id and co.slug=?)"
                                        : "true")
                                + " as in_collection "
                                + "from listing l join book_copy b on b.id=l.book_copy_id left join category c on c.id=l.category_id "
                                + "where lower(b.book_code)=lower(?)",
                        (r, n) -> new ListingCandidate(
                                r.getLong("id"),
                                r.getString("publication_status"),
                                r.getString("category_code"),
                                r.getBoolean("in_collection")),
                        def.collectionSlug() != null ? new Object[] { def.collectionSlug(), code }
                                : new Object[] { code });

                if (found.isEmpty())
                    throw AdminApiException.field("shelves", "Không tìm thấy mã sách " + code);
                ListingCandidate target = found.getFirst();
                boolean alreadyPinned = existingListingIds.contains(target.listingId());
                if (!alreadyPinned && !"PUBLISHED".equals(target.publicationStatus()))
                    throw AdminApiException.field("shelves", "Sách " + code + " chưa được xuất bản công khai");
                if (def.categoryCode() != null && !def.categoryCode().equals(target.categoryCode()))
                    throw AdminApiException.field("shelves",
                            "Sách " + code + " không thuộc thể loại của kệ " + def.title());
                if (def.collectionSlug() != null && !target.inCollection())
                    throw AdminApiException.field("shelves",
                            "Sách " + code + " không thuộc bộ sưu tập " + def.title());

                listingIds.add(target.listingId());
            }
            resolvedByShelf.put(key, listingIds);
        }

        Map<String, Object> before = snapshotForAudit();
        jdbc.update("update home_featured_config set version=version+1 where id=1");
        for (Map.Entry<String, List<Long>> entry : resolvedByShelf.entrySet()) {
            String key = entry.getKey();
            List<Long> ids = entry.getValue();
            jdbc.update("delete from home_featured_item where shelf_key=?", key);
            for (int i = 0; i < ids.size(); i++) {
                jdbc.update("insert into home_featured_item(shelf_key, position, listing_id) values (?, ?, ?)",
                        key, i, ids.get(i));
            }
        }
        Config afterConfig = current();
        Map<String, Object> after = snapshotForAudit();
        audit.record(actor, "HOME_FEATURED", 1L, "UPDATE", before, after, afterConfig.version());
        return afterConfig;
    }

    private Map<String, Object> snapshotForAudit() {
        List<Map<String, Object>> list = new ArrayList<>();
        for (ShelfDef def : activeShelfDefs()) {
            List<String> codes = jdbc.queryForList(
                    "select b.book_code from home_featured_item hfi join listing l on l.id=hfi.listing_id join book_copy b on b.id=l.book_copy_id where hfi.shelf_key=? order by hfi.position asc",
                    String.class, def.shelfKey());
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("shelfKey", def.shelfKey());
            item.put("bookCodes", codes);
            list.add(item);
        }
        return Map.of("shelves", list);
    }

    private Config current() {
        Long v = jdbc.queryForObject("select version from home_featured_config where id=1", Long.class);
        long version = v == null ? 0L : v;
        List<ShelfConfig> shelves = new ArrayList<>();
        for (ShelfDef def : activeShelfDefs()) {
            String sql = "select b.id, b.book_code, b.title, l.price_min_vnd, l.price_max_vnd, l.publication_status, b.availability, "
                    + "exists(select 1 from book_media m where m.book_copy_id=b.id and m.role='FRONT' and m.state='ACTIVE') has_front, "
                    + scopeMatchExpr(def) + " as scope_match "
                    + "from home_featured_item hfi "
                    + "join listing l on l.id=hfi.listing_id "
                    + "join book_copy b on b.id=l.book_copy_id "
                    + "left join category c on c.id=l.category_id "
                    + "where hfi.shelf_key=? "
                    + "order by hfi.position asc";
            Object[] args = scopeMatchArgs(def);
            List<PinnedBook> items = jdbc.query(sql, this::mapPinnedBook, args);
            shelves.add(new ShelfConfig(def.shelfKey(), def.title(), def.href(), def.categoryCode(),
                    def.collectionSlug(), items));
        }
        return new Config(version, shelves);
    }

    private String scopeMatchExpr(ShelfDef def) {
        if (def.categoryCode() != null)
            return "(c.code = ?)";
        if (def.collectionSlug() != null)
            return "exists(select 1 from listing_collection lc join collection co on co.id=lc.collection_id where lc.listing_id=l.id and co.active and co.slug=?)";
        return "true";
    }

    private Object[] scopeMatchArgs(ShelfDef def) {
        if (def.categoryCode() != null)
            return new Object[] { def.categoryCode(), def.shelfKey() };
        if (def.collectionSlug() != null)
            return new Object[] { def.collectionSlug(), def.shelfKey() };
        return new Object[] { def.shelfKey() };
    }

    private PinnedBook mapPinnedBook(ResultSet r, int n) throws SQLException {
        String id = r.getString("id");
        String pubStatus = r.getString("publication_status");
        String availability = r.getString("availability");
        boolean hasFront = r.getBoolean("has_front");
        boolean scopeMatch = r.getBoolean("scope_match");
        boolean activeOnHome = "PUBLISHED".equals(pubStatus) && "AVAILABLE".equals(availability) && scopeMatch;
        return new PinnedBook(
                id,
                r.getString("book_code"),
                r.getString("title"),
                r.getObject("price_min_vnd", Long.class),
                r.getObject("price_max_vnd", Long.class),
                pubStatus,
                availability,
                hasFront ? "/api/v1/admin/books/" + id + "/media/FRONT/content" : null,
                activeOnHome);
    }

    private List<ShelfDef> activeShelfDefs() {
        List<ShelfDef> defs = new ArrayList<>();
        defs.add(new ShelfDef("NEWEST", "Sách mới đăng", "/sach", null, null));
        defs.add(new ShelfDef("CATEGORY:BOARD_BOOK", "Board books cho bé nhỏ", "/sach?category=BOARD_BOOK",
                "BOARD_BOOK", null));
        defs.add(new ShelfDef("CATEGORY:PICTURE_BOOK", "Picture books", "/sach?category=PICTURE_BOOK", "PICTURE_BOOK",
                null));
        List<ShelfDef> cols = jdbc.query(
                "select slug, name from collection where active order by sort_order, id limit 2",
                (r, n) -> new ShelfDef("COLLECTION:" + r.getString("slug"), r.getString("name"),
                        "/bo-suu-tap/" + r.getString("slug"), null, r.getString("slug")));
        defs.addAll(cols);
        return defs;
    }

    private ShelfDef resolveShelfDef(String shelfKey) {
        if (shelfKey == null || shelfKey.isBlank())
            throw AdminApiException.field("shelfKey", "Kệ sách không hợp lệ");
        String key = shelfKey.trim();
        for (ShelfDef def : activeShelfDefs()) {
            if (def.shelfKey().equals(key))
                return def;
        }
        if (key.startsWith("COLLECTION:")) {
            String slug = key.substring("COLLECTION:".length());
            List<ShelfDef> cols = jdbc.query(
                    "select slug, name from collection where slug=?",
                    (r, n) -> new ShelfDef("COLLECTION:" + r.getString("slug"), r.getString("name"),
                            "/bo-suu-tap/" + r.getString("slug"), null, r.getString("slug")),
                    slug);
            if (!cols.isEmpty())
                return cols.getFirst();
        }
        throw AdminApiException.field("shelfKey", "Kệ sách không hợp lệ");
    }
}
