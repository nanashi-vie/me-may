package vn.memay.customer;

import java.time.Clock;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import vn.memay.audit.AuditService;
import vn.memay.auth.AdminUser;
import vn.memay.common.AdminApiException;
import vn.memay.common.RecordTrash;

@Service
public class CustomerTrashService extends RecordTrash {
    /** Counts every order, trashed ones included: their rows still reference the customer. */
    static final String HAS_NO_ORDERS = "not exists(select 1 from orders x where x.customer_id=%s.id)";
    private final AuditService audit;

    public CustomerTrashService(JdbcTemplate jdbc, Clock clock, AuditService audit) {
        super(jdbc, clock, "customer", "customer_code", "full_name");
        this.audit = audit;
    }

    @Override protected void requireTrashable(long id, Map<String, Object> row) {
        if (!"ARCHIVED".equals(row.get("status"))) throw new AdminApiException(409, "customer_not_archived");
        if (hasOrders(id)) throw new AdminApiException(409, "customer_has_orders");
    }

    @Override protected void delete(long id) {
        if (hasOrders(id)) throw new AdminApiException(409, "customer_has_orders");
        jdbc.update("delete from customer where id=?", id);
    }

    @Override protected String purgeable() {
        return HAS_NO_ORDERS.formatted("t");
    }

    @Override protected void audit(AdminUser actor, long id, String action, long version) {
        audit.record(actor, "CUSTOMER", id, action, Map.of(), Map.of(), version);
    }

    private boolean hasOrders(long id) {
        return Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from orders where customer_id=?)", Boolean.class, id));
    }
}
