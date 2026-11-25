package vn.memay.common;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import vn.memay.auth.AdminUser;

/** Seven-day trash shared by customer and orders; table and column names are fixed by the subclasses. */
public abstract class RecordTrash {
    public static final Duration RETENTION = Duration.ofDays(7);
    protected final JdbcTemplate jdbc;
    protected final Clock clock;
    private final String table, codeColumn, nameColumn;

    protected RecordTrash(JdbcTemplate jdbc, Clock clock, String table, String codeColumn, String nameColumn) {
        this.jdbc = jdbc;
        this.clock = clock;
        this.table = table;
        this.codeColumn = codeColumn;
        this.nameColumn = nameColumn;
    }

    public record Item(String id, String code, String name, long version, Instant deletedAt, Instant expiresAt) {}
    public record Listing(List<Item> items, int page, int size, long totalElements, long totalPages) {}

    /** Throws when the locked row may not enter the trash. */
    protected abstract void requireTrashable(long id, Map<String, Object> row);
    /** Deletes the row and its dependents; throws when something must be kept. */
    protected abstract void delete(long id);
    /** SQL condition on alias t limiting automatic purging to rows that {@link #delete} accepts. */
    protected abstract String purgeable();
    protected abstract void audit(AdminUser actor, long id, String action, long version);

    @Transactional(readOnly = true)
    public Listing list(AdminUser actor, int page, int size) {
        requireOwner(actor, false);
        if (page < 0 || size < 1 || size > 100) throw new AdminApiException(400, "invalid_request");
        long total = jdbc.queryForObject("select count(*) from " + table + " where deleted_at is not null", Long.class);
        var items = jdbc.query("select id," + codeColumn + " code," + nameColumn + " name,version,deleted_at from " + table
                + " where deleted_at is not null order by deleted_at desc,id desc limit ? offset ?", (r, n) -> {
            var deleted = r.getTimestamp("deleted_at").toInstant();
            return new Item(r.getString("id"), r.getString("code"), r.getString("name"), r.getLong("version"),
                    deleted, deleted.plus(RETENTION));
        }, size, (long) page * size);
        return new Listing(items, page, size, total, (total + size - 1) / size);
    }

    @Transactional(readOnly = true)
    public List<VersionedItem> selection(AdminUser actor) {
        requireOwner(actor, false);
        return jdbc.query("select id,version from " + table + " where deleted_at is not null order by id",
                (r, n) -> new VersionedItem(r.getString(1), r.getLong(2)));
    }

    @Transactional
    public void change(AdminUser actor, long id, long version, boolean trashed) {
        requireOwner(actor, true);
        var rows = jdbc.queryForList("select * from " + table + " where id=? for update", id);
        if (rows.isEmpty()) throw new AdminApiException(404, "not_found");
        var row = rows.getFirst();
        long actual = ((Number) row.get("version")).longValue();
        if (actual != version) throw AdminApiException.conflict(actual);
        var deleted = (Timestamp) row.get("deleted_at");
        if (trashed == (deleted != null)) return;
        var now = clock.instant();
        if (trashed) requireTrashable(id, row);
        else if (!now.isBefore(deleted.toInstant().plus(RETENTION))) throw new AdminApiException(409, "trash_expired");
        jdbc.update("update " + table + " set deleted_at=?,version=version+1,updated_at=? where id=?",
                trashed ? Timestamp.from(now) : null, Timestamp.from(now), id);
        audit(actor, id, trashed ? "TRASHED" : "UNTRASHED", version + 1);
    }

    @Transactional
    public void purge(AdminUser actor, List<VersionedItem> items) {
        requireOwner(actor, true);
        var ordered = VersionedItem.ordered(items, false);
        for (var item : ordered.entrySet()) {
            var rows = jdbc.queryForList("select version from " + table + " where id=? and deleted_at is not null for update",
                    Long.class, item.getKey());
            if (rows.isEmpty()) throw new AdminApiException(409, "trash_changed");
            if (!rows.getFirst().equals(item.getValue())) throw AdminApiException.conflict(rows.getFirst());
        }
        ordered.forEach((id, version) -> {
            delete(id);
            audit(actor, id, "PURGED", version);
        });
    }

    @Transactional
    public void purgeExpired(Instant now) {
        for (long id : jdbc.queryForList("select t.id from " + table + " t where t.deleted_at<=? and " + purgeable()
                + " order by t.deleted_at,t.id limit 100 for update skip locked", Long.class, Timestamp.from(now.minus(RETENTION))))
            delete(id);
    }

    private void requireOwner(AdminUser actor, boolean lock) {
        if (actor == null || actor.getId() == null || jdbc.queryForList("select id from admin_user where id=? and active=true and role='OWNER'"
                + (lock ? " for share" : ""), Long.class, actor.getId()).isEmpty())
            throw new AdminApiException(403, "forbidden");
    }
}
