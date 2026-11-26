package vn.memay.order;

import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import java.time.Clock;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import vn.memay.audit.AuditService;
import vn.memay.auth.AdminUser;
import vn.memay.common.AdminApiException;
import vn.memay.common.RecordTrash;

@Service
public class OrderTrashService extends RecordTrash {
    private static final String HELD = "(select coalesce(sum(case when transaction_type='REFUND' then -amount else amount end),0) from order_payments x where x.order_id=%1$s.id and x.voided_at is null)";
    /** Unpaid drafts, and cancelled or returned orders whose money is fully refunded or voided; alias %1$s. */
    private static final String TRASHABLE = "(%1$s.status='DRAFT' and not exists(select 1 from order_payments x where x.order_id=%1$s.id) or %1$s.status='CANCELLED' and " + HELD + "=0)";
    private final AuditService audit;
    private final PaymentProofStore proofs;

    public OrderTrashService(JdbcTemplate jdbc, Clock clock, AuditService audit, PaymentProofStore proofs) {
        super(jdbc, clock, "orders", "order_code", "customer_name_snapshot");
        this.audit = audit;
        this.proofs = proofs;
    }

    @Override protected void requireTrashable(long id, Map<String, Object> row) {
        requireTrashable(id, row.get("status"));
    }

    @Override protected void delete(long id) {
        requireTrashable(id, jdbc.queryForObject("select status from orders where id=?", String.class, id));
        if (exists("order_reservation where state='ACTIVE' and order_id=?", id)) throw new AdminApiException(409, "order_not_trashable");
        // Receipts stay so a replayed request still answers from its original result.
        jdbc.update("update order_mutation_receipt set order_id=null where order_id=?", id);
        // Receipt files go only once the rows are gone for good; a rolled-back purge keeps them.
        var keys = jdbc.queryForList("select proof_key from order_payments where order_id=? and proof_key is not null", String.class, id);
        if (!keys.isEmpty()) TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() {
                keys.forEach(proofs::delete);
            }
        });
        for (String table : List.of("order_payments", "order_returns", "order_shipments", "order_action_notes", "order_reservation", "order_items"))
            jdbc.update("delete from " + table + " where order_id=?", id);
        jdbc.update("delete from orders where id=?", id);
    }

    @Override protected String purgeable() {
        return trashable("t") + " and not exists(select 1 from order_reservation x where x.order_id=t.id and x.state='ACTIVE')";
    }

    @Override protected void audit(AdminUser actor, long id, String action, long version) {
        audit.recordOrder(actor, id, action, Map.of(), Map.of(), version);
    }

    static String trashable(String alias) {
        return TRASHABLE.formatted(alias);
    }

    private void requireTrashable(long id, Object status) {
        if (exists("orders o where " + trashable("o") + " and o.id=?", id)) return;
        throw new AdminApiException(409, "DRAFT".equals(status) ? "order_has_payments"
                : "CANCELLED".equals(status) ? "order_holds_money" : "order_not_trashable");
    }

    private boolean exists(String from, long id) {
        return Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from " + from + ")", Boolean.class, id));
    }
}
