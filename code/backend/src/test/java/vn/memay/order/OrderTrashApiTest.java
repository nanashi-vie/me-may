package vn.memay.order;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import vn.memay.support.AdminHttpClient;
import vn.memay.support.OrderTestSupport;
import static org.assertj.core.api.Assertions.*;
import static vn.memay.support.AdminHttpClient.*;

class OrderTrashApiTest extends OrderTestSupport {
    private static final String BASE = "/api/v1/admin/orders";
    @Value("${local.server.port}") int port;
    @Autowired OrderTrashService trash;
    private AdminHttpClient api;

    @BeforeEach void login() throws Exception {
        api = new AdminHttpClient(port);
        api.login("owner@catalogue.test");
    }

    private java.net.http.HttpResponse<String> change(long id, long version, boolean trashed) throws Exception {
        return api.send("PATCH", BASE + "/" + id + "/trash", json(Map.of("version", version, "trashed", trashed)), true);
    }

    private String error(long id) throws Exception {
        var r = change(id, 0, true);
        assertThat(r.statusCode()).isEqualTo(409);
        return tree(r).path("error").asString();
    }

    private void payment(long id, boolean voided) {
        jdbc.update("insert into order_payments(order_id,transaction_type,amount,payment_method,occurred_at,created_by,voided_at,voided_by,void_reason) values(?,'DEPOSIT',1000,'OTHER',current_timestamp,?,?,?,?)",
                id, owner.getId(), voided ? Timestamp.from(Instant.now()) : null, voided ? owner.getId() : null, voided ? "Synthetic" : null);
    }

    @Test void onlyDraftOrCancelledOrdersWithoutAnyPaymentCanBeTrashed() throws Exception {
        for (String status : List.of("KEEPING", "READY_TO_SHIP", "COMPLETED", "UNSUCCESSFUL")) {
            long id = draft();
            jdbc.update("update orders set status=? where id=?", status, id);
            assertThat(error(id)).as(status).isEqualTo("order_not_trashable");
        }
        long paid = draft(), voided = draft(), cancelled = draft(), draft = draft();
        payment(paid, false);
        payment(voided, true);
        jdbc.update("update orders set status='CANCELLED' where id in (?,?)", voided, cancelled);
        assertThat(error(paid)).isEqualTo("order_has_payments");
        assertThat(error(voided)).isEqualTo("order_has_payments");
        var items = tree(api.send("GET", BASE, null, false)).path("items");
        assertThat(items.size()).isEqualTo(8);
        for (var item : items)
            assertThat(item.path("trashable").asBoolean()).isEqualTo(List.of(cancelled, draft).contains(Long.parseLong(item.path("id").asString())));
        assertThat(change(draft, 0, true).statusCode()).isEqualTo(204);
        assertThat(change(cancelled, 0, true).statusCode()).isEqualTo(204);
    }

    @Test void hidesFromEveryReadAndWriteThenRestoresSameStatus() throws Exception {
        long id = draft(), kept = draft();
        long buyer = jdbc.queryForObject("select customer_id from orders where id=?", Long.class, id);
        long item = manual(id, 10000, 1, 100);
        assertThat(change(id, 0, true).statusCode()).isEqualTo(204);

        assertThat(api.send("GET", BASE + "/" + id, null, false).statusCode()).isEqualTo(404);
        assertThat(api.send("POST", BASE + "/" + id + "/cancel", json(Map.of("version", 1, "requestId", UUID.randomUUID(), "reason", "x")), true).statusCode()).isEqualTo(404);
        assertThat(api.send("POST", BASE + "/" + id + "/payments", json(Map.of("version", 1, "requestId", UUID.randomUUID(), "transactionType", "DEPOSIT", "amount", 1000, "paymentMethod", "OTHER")), true).statusCode()).isEqualTo(404);
        var list = tree(api.send("GET", BASE, null, false));
        assertThat(list.path("totalElements").asLong()).isEqualTo(1);
        assertThat(list.path("items").get(0).path("id").asString()).isEqualTo(Long.toString(kept));
        assertThat(tree(api.send("GET", BASE + "?customerId=" + buyer, null, false)).path("totalElements").asLong()).isZero();
        var trashed = tree(api.send("GET", BASE + "/trash", null, false)).path("items").get(0);
        assertThat(trashed.path("code").asString()).startsWith("DH-");
        assertThat(trashed.path("name").asString()).isEqualTo("Synthetic customer");

        assertThat(change(id, 0, false).statusCode()).isEqualTo(409);
        assertThat(change(id, 1, false).statusCode()).isEqualTo(204);
        var restored = tree(api.send("GET", BASE + "/" + id, null, false));
        assertThat(restored.path("status").asString()).isEqualTo("DRAFT");
        assertThat(restored.path("items").get(0).path("id").asString()).isEqualTo(Long.toString(item));
        assertThat(jdbc.queryForList("select action from audit_event where target_type='ORDER' order by id", String.class)).containsExactly("TRASHED", "UNTRASHED");
    }

    @Test void statsAndCustomerCountsIgnoreTrashedOrders() throws Exception {
        long id = draft();
        jdbc.update("update orders set status='COMPLETED',deleted_at=current_timestamp where id=?", id);
        assertThat(tree(api.send("GET", BASE + "/stats", null, false)).path("completed").asLong()).isZero();
        assertThat(tree(api.send("GET", "/api/v1/admin/customers", null, false)).path("items").get(0).path("orderCount").asLong()).isZero();
    }

    @Test void purgeRemovesOrderDataFreesBookAndCustomerAndKeepsReceipts() throws Exception {
        var book = ready();
        long buyer = customer();
        var made = api.send("POST", BASE, json(Map.of("customerId", Long.toString(buyer), "fulfillmentType", "KEEP", "requestId", UUID.randomUUID())), true);
        long id = Long.parseLong(tree(made).path("id").asString());
        assertThat(api.send("POST", BASE + "/" + id + "/items", json(Map.of("version", 0, "requestId", UUID.randomUUID(), "sourceType", "CATALOG", "bookCopyId", book.id(), "unitPriceVnd", 75000, "quantity", 1, "unitWeightGrams", 250)), true).statusCode()).isEqualTo(200);
        assertThat(api.send("POST", BASE + "/" + id + "/keep", json(Map.of("version", 1, "requestId", UUID.randomUUID(), "allowInsufficientDeposit", true, "reason", "Owner exception")), true).statusCode()).isEqualTo(200);
        assertThat(api.send("POST", BASE + "/" + id + "/cancel", json(Map.of("version", 2, "requestId", UUID.randomUUID(), "reason", "Synthetic")), true).statusCode()).isEqualTo(200);
        assertThat(change(id, 3, true).statusCode()).isEqualTo(204);
        long receipts = jdbc.queryForObject("select count(*) from order_mutation_receipt", Long.class);

        var items = json(Map.of("items", List.of(Map.of("id", Long.toString(id), "version", 4))));
        assertThat(api.send("POST", BASE + "/trash/purge", items, true).statusCode()).isEqualTo(204);

        for (String table : List.of("orders", "order_items", "order_reservation", "order_action_notes", "order_shipments", "order_returns"))
            assertThat(jdbc.queryForObject("select count(*) from " + table, Long.class)).as(table).isZero();
        assertThat(jdbc.queryForObject("select count(*) from order_mutation_receipt where order_id is null", Long.class)).isEqualTo(receipts);
        assertThat(queries.detail(Long.parseLong(book.id()), owner).totalStock()).isEqualTo(1);
        assertThat(jdbc.update("delete from customer where id=?", buyer)).isEqualTo(1);
    }

    @Test void expiredOrdersArePurgedButNeverOnesWithPayments() throws Exception {
        long free = draft(), paid = draft();
        var deleted = Instant.parse("2020-01-01T00:00:00Z");
        payment(paid, false);
        jdbc.update("update orders set deleted_at=?", Timestamp.from(deleted));
        assertThat(change(free, 0, false).statusCode()).isEqualTo(409);
        trash.purgeExpired(deleted.plusSeconds(604799));
        assertThat(jdbc.queryForObject("select count(*) from orders", Long.class)).isEqualTo(2);
        trash.purgeExpired(deleted.plusSeconds(604800));
        assertThat(jdbc.queryForList("select id from orders", Long.class)).containsExactly(paid);
        var items = json(Map.of("items", List.of(Map.of("id", Long.toString(paid), "version", 0))));
        assertThat(api.send("POST", BASE + "/trash/purge", items, true).statusCode()).isEqualTo(409);
        assertThat(jdbc.queryForObject("select count(*) from order_payments", Long.class)).isEqualTo(1);
    }

    @Test void staffIsForbidden() throws Exception {
        long id = draft();
        api.login("staff@catalogue.test");
        for (String path : List.of("/trash", "/trash/selection"))
            assertThat(api.send("GET", BASE + path, null, false).statusCode()).isEqualTo(403);
        assertThat(change(id, 0, true).statusCode()).isEqualTo(403);
        assertThat(api.send("POST", BASE + "/trash/purge", json(Map.of("items", List.of(Map.of("id", Long.toString(id), "version", 0)))), true).statusCode()).isEqualTo(403);
    }
}
