package vn.memay.order;

import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import vn.memay.audit.AuditService;
import vn.memay.auth.AdminUser;
import vn.memay.common.AdminApiException;
import vn.memay.common.RecordTrash;

@Service
public class OrderTrashService extends RecordTrash {
    private static final Set<String> STATUSES = Set.of("DRAFT", "CANCELLED");
    /** Voided payments count too: money history is never deleted. */
    static final String HAS_NO_PAYMENTS = "not exists(select 1 from order_payments x where x.order_id=%s.id)";
    private final AuditService audit;

    public OrderTrashService(JdbcTemplate jdbc, Clock clock, AuditService audit) {
        super(jdbc, clock, "orders", "order_code", "customer_name_snapshot");
        this.audit = audit;
    }

    @Override protected void requireTrashable(long id, Map<String, Object> row) {
        if (!STATUSES.contains(row.get("status"))) throw new AdminApiException(409, "order_not_trashable");
        requireUnpaid(id);
    }

    @Override protected void delete(long id) {
        requireUnpaid(id);
        if (exists("order_reservation where state='ACTIVE' and order_id=?", id)) throw new AdminApiException(409, "order_not_trashable");
        // Receipts stay so a replayed request still answers from its original result.
        jdbc.update("update order_mutation_receipt set order_id=null where order_id=?", id);
        for (String table : List.of("order_returns", "order_shipments", "order_action_notes", "order_reservation", "order_items"))
            jdbc.update("delete from " + table + " where order_id=?", id);
        jdbc.update("delete from orders where id=?", id);
    }

    @Override protected String purgeable() {
        return HAS_NO_PAYMENTS.formatted("t") + " and not exists(select 1 from order_reservation x where x.order_id=t.id and x.state='ACTIVE')";
    }

    @Override protected void audit(AdminUser actor, long id, String action, long version) {
        audit.recordOrder(actor, id, action, Map.of(), Map.of(), version);
    }

    private void requireUnpaid(long id) {
        if (exists("order_payments where order_id=?", id)) throw new AdminApiException(409, "order_has_payments");
    }

    private boolean exists(String from, long id) {
        return Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from " + from + ")", Boolean.class, id));
    }
}
