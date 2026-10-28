package vn.memay.promotion;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import java.time.Instant;
import java.util.*;
import vn.memay.auth.AdminUser;
import vn.memay.catalogue.BookAccess;
import vn.memay.catalogue.PublicCatalogueService;
import vn.memay.catalogue.PublicCatalogueDtos.Book;
import vn.memay.audit.AuditService;
import vn.memay.common.AdminApiException;

@Service
public class FlashSaleService {
    public record Item(String bookCode, Long salePriceVnd) {
    }

    public record Campaign(Long version, Boolean enabled, Instant startsAt, Instant endsAt, List<Item> items) {
    }

    public record PublicSale(Instant serverNow, Instant endsAt, List<Book> items) {
    }

    private final JdbcTemplate jdbc;
    private final BookAccess access;
    private final AuditService audit;
    private final PublicCatalogueService catalogue;

    public FlashSaleService(JdbcTemplate jdbc, BookAccess access, AuditService audit,
            PublicCatalogueService catalogue) {
        this.jdbc = jdbc;
        this.access = access;
        this.audit = audit;
        this.catalogue = catalogue;
    }

    @Transactional(readOnly = true)
    public Campaign get(AdminUser actor) {
        access.requireOwner(actor);
        return current();
    }

    private Campaign current() {
        return jdbc.queryForObject("select * from flash_sale where id=1", (r, n) -> new Campaign(r.getLong("version"),
                r.getBoolean("enabled"),
                r.getTimestamp("starts_at") == null ? null : r.getTimestamp("starts_at").toInstant(),
                r.getTimestamp("ends_at") == null ? null : r.getTimestamp("ends_at").toInstant(),
                jdbc.query(
                        "select b.book_code,f.sale_price_vnd from flash_sale_item f join listing l on l.id=f.listing_id join book_copy b on b.id=l.book_copy_id order by b.id",
                        (i, k) -> new Item(i.getString(1), i.getLong(2)))));
    }

    @Transactional
    public Campaign update(AdminUser actor, Campaign w) {
        access.requireOwner(actor);
        long version = jdbc.queryForObject("select version from flash_sale where id=1 for update", Long.class);
        if (w.version() == null || w.version() < 0)
            throw AdminApiException.field("version", "Thiếu version");
        if (w.version() != version)
            throw AdminApiException.conflict(version);
        if (w.enabled() == null || w.items() == null || w.items().size() > 50)
            throw AdminApiException.field("items", "Chọn tối đa50 cuốn");
        if ((w.startsAt() == null) != (w.endsAt() == null) || w.startsAt() != null && !w.startsAt().isBefore(w.endsAt())
                || w.enabled() && (w.startsAt() == null || w.items().isEmpty()))
            throw AdminApiException.field("startsAt", "Chọn thời gian bắt đầu/kết thúc hợp lệ và ít nhất một cuốn");
        var ids = new ArrayList<Long>();
        var seen = new HashSet<String>();
        for (var item : w.items()) {
            if (item == null || item.bookCode() == null || !seen.add(item.bookCode().trim().toUpperCase(Locale.ROOT))
                    || item.salePriceVnd() == null || item.salePriceVnd() < 1 || item.salePriceVnd() > 999999999999L)
                throw AdminApiException.field("items", "Mã trùng hoặc giá không hợp lệ");
            var rows = jdbc.queryForList(
                    "select l.id,l.price_vnd,l.publication_status,b.availability from listing l join book_copy b on b.id=l.book_copy_id where lower(b.book_code)=lower(?)",
                    item.bookCode().trim());
            if (rows.isEmpty())
                throw AdminApiException.field("items", "Không tìm thấy mã " + item.bookCode());
            var row = rows.getFirst();
            if (w.enabled() && (!"PUBLISHED".equals(row.get("publication_status"))
                    || !"AVAILABLE".equals(row.get("availability")) || row.get("price_vnd") == null
                    || item.salePriceVnd() >= ((Number) row.get("price_vnd")).longValue()))
                throw AdminApiException.field("items", "Sách phải công khai/còn hàng, giá sale thấp hơn giá tham khảo");
            ids.add(((Number) row.get("id")).longValue());
        }
        var before = current();
        jdbc.update("update flash_sale set enabled=?,starts_at=?,ends_at=?,version=version+1 where id=1", w.enabled(),
                w.startsAt() == null ? null : java.sql.Timestamp.from(w.startsAt()),
                w.endsAt() == null ? null : java.sql.Timestamp.from(w.endsAt()));
        jdbc.update("delete from flash_sale_item");
        for (int i = 0; i < ids.size(); i++)
            jdbc.update("insert into flash_sale_item(listing_id,sale_price_vnd) values (?,?)", ids.get(i),
                    w.items().get(i).salePriceVnd());
        var after = current();
        audit.record(actor, "FLASH_SALE", 1, "UPDATE", audit.snapshot(before), audit.snapshot(after), after.version());
        return after;
    }

    @Transactional(readOnly = true)
    public PublicSale active() {
        Instant now = jdbc.queryForObject("select current_timestamp", (r, n) -> r.getTimestamp(1).toInstant());
        var c = current();
        if (!c.enabled() || now.isBefore(c.startsAt()) || !now.isBefore(c.endsAt()))
            return new PublicSale(now, null, List.of());
        var slugs = jdbc.queryForList(
                "select l.slug from flash_sale_item f join listing l on l.id=f.listing_id join book_copy b on b.id=l.book_copy_id where l.publication_status='PUBLISHED' and b.availability='AVAILABLE' and f.sale_price_vnd<l.price_vnd order by b.id desc",
                String.class);
        return new PublicSale(now, c.endsAt(), slugs.stream().map(catalogue::detail).toList());
    }
}
