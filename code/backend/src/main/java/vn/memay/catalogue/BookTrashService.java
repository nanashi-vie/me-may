package vn.memay.catalogue;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.memay.audit.AuditService;
import vn.memay.auth.AdminUser;
import vn.memay.catalogue.BookDtos.Page;
import vn.memay.common.AdminApiException;

@Service
public class BookTrashService {
    private static final Duration RETENTION = Duration.ofDays(7);
    private final JdbcTemplate jdbc;
    private final Clock clock;
    private final BookAccess access;
    private final AuditService audit;

    public BookTrashService(JdbcTemplate jdbc, Clock clock, BookAccess access, AuditService audit) {
        this.jdbc = jdbc;
        this.clock = clock;
        this.access = access;
        this.audit = audit;
    }

    public record TrashBook(String id, String bookCode, String title, long version, Instant deletedAt, Instant expiresAt) {}

    public Page<TrashBook> list(AdminUser actor, int page, int size) {
        access.requireOwner(actor);
        BookQueryService.page(page, size);
        long total = jdbc.queryForObject("select count(*) from book_copy where deleted_at is not null", Long.class);
        var items = jdbc.query("""
                select id,book_code,title,version,deleted_at from book_copy where deleted_at is not null
                order by deleted_at desc,id desc limit ? offset ?
                """, (r,n) -> {
            var deleted = r.getTimestamp("deleted_at").toInstant();
            return new TrashBook(r.getString("id"), r.getString("book_code"), r.getString("title"),
                    r.getLong("version"), deleted, deleted.plus(RETENTION));
        }, size, (long) page * size);
        return new Page<>(items, page, size, total, (int) ((total + size - 1) / size));
    }

    @Transactional
    public void change(AdminUser actor, long id, long version, boolean trashed) {
        access.requireOwner(actor);
        var rows = jdbc.queryForList("select version,deleted_at from book_copy where id=? for update", id);
        if (rows.isEmpty()) throw new AdminApiException(404, "not_found");
        var row = rows.getFirst();
        long actual = ((Number) row.get("version")).longValue();
        if (actual != version) throw AdminApiException.conflict(actual);
        var deleted = (Timestamp) row.get("deleted_at");
        var now = clock.instant();
        if (trashed == (deleted != null)) return;
        if (!trashed && !now.isBefore(deleted.toInstant().plus(RETENTION)))
            throw new AdminApiException(409, "trash_expired");
        var timestamp = Timestamp.from(now);
        jdbc.update("update book_copy set deleted_at=?,version=version+1,updated_at=? where id=?",
                trashed ? timestamp : null, timestamp, id);
        jdbc.update("update listing set publication_status='ARCHIVED',updated_at=? where book_copy_id=?", timestamp, id);
        audit.record(actor, "BOOK", id, trashed ? "TRASHED" : "RESTORED",
                deleted == null ? Map.of() : Map.of("deletedAt", deleted.toInstant()),
                trashed ? Map.of("deletedAt", now) : Map.of(), version + 1);
    }

    @Transactional
    public void purgeExpired(Instant now) {
        var ids = jdbc.queryForList("""
                select id from book_copy where deleted_at<=? order by deleted_at,id
                limit 100 for update skip locked
                """, Long.class, Timestamp.from(now.minus(RETENTION)));
        purge(ids);
    }

    public record Selection(String id,Long version) {}

    public List<Selection> selection(AdminUser actor) {
        access.requireOwner(actor);
        return jdbc.query("select id,version from book_copy where deleted_at is not null order by id",
                (r,n) -> new Selection(r.getString(1),r.getLong(2)));
    }

    @Transactional
    public void bulk(AdminUser actor, List<Selection> items, boolean permanent) {
        access.requireOwner(actor);
        if (items.isEmpty() || (!permanent && items.size()>100))
            throw AdminApiException.field("items", "Danh sách sách không hợp lệ");
        var ordered = new java.util.TreeMap<Long,Long>();
        for (var item:items) {
            long id;
            try { id = Long.parseLong(item == null ? null : item.id()); }
            catch (NumberFormatException e) { throw AdminApiException.field("items", "Mã sách không hợp lệ"); }
            if (id<1 || item.version()==null || item.version()<0 || ordered.putIfAbsent(id,item.version())!=null)
                throw AdminApiException.field("items", "Danh sách sách không hợp lệ");
        }
        if (!permanent) {
            ordered.forEach((id,version) -> change(actor,id,version,true));
            return;
        }
        for (var item:ordered.entrySet()) {
            var rows=jdbc.queryForList("select version from book_copy where id=? and deleted_at is not null for update",
                    Long.class,item.getKey());
            if (rows.isEmpty()) throw new AdminApiException(409,"trash_changed");
            if (!rows.getFirst().equals(item.getValue())) throw AdminApiException.conflict(rows.getFirst());
        }
        ordered.forEach((id,version) -> audit.record(actor,"BOOK",id,"PURGED",Map.of(),Map.of(),version));
        purge(List.copyOf(ordered.keySet()));
    }

    private void purge(List<Long> ids) {
        for (long id : ids) {
            jdbc.update("""
                    update book_media set book_copy_id=null,
                        state=case when state='ACTIVE' then 'DELETE_PENDING' else state end
                    where book_copy_id=?
                    """, id);
            for (String table : List.of("flash_sale_item", "listing_feature", "listing_age_group", "listing_collection")) {
                jdbc.update("delete from " + table + " where listing_id in (select id from listing where book_copy_id=?)", id);
            }
            jdbc.update("delete from book_variant where book_copy_id=?", id);
            jdbc.update("delete from listing where book_copy_id=?", id);
            jdbc.update("delete from book_copy where id=?", id);
        }
    }
}
