package vn.memay.customer;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import vn.memay.support.AdminHttpClient;
import vn.memay.support.OrderTestSupport;
import static org.assertj.core.api.Assertions.*;
import static vn.memay.support.AdminHttpClient.*;

class CustomerTrashApiTest extends OrderTestSupport {
    private static final String BASE = "/api/v1/admin/customers";
    @Value("${local.server.port}") int port;
    @Autowired CustomerTrashService trash;
    private AdminHttpClient api;

    @BeforeEach void login() throws Exception {
        api = new AdminHttpClient(port);
        api.login("owner@catalogue.test");
    }

    private long archived() {
        long id = customer();
        jdbc.update("update customer set status='ARCHIVED' where id=?", id);
        return id;
    }

    private int change(long id, long version, boolean trashed) throws Exception {
        return api.send("PATCH", BASE + "/" + id + "/trash", json(Map.of("version", version, "trashed", trashed)), true).statusCode();
    }

    private String error(long id, long version) throws Exception {
        var r = api.send("PATCH", BASE + "/" + id + "/trash", json(Map.of("version", version, "trashed", true)), true);
        assertThat(r.statusCode()).isEqualTo(409);
        return tree(r).path("error").asString();
    }

    private long total(String path) throws Exception {
        return tree(api.send("GET", path, null, false)).path("totalElements").asLong();
    }

    @Test void onlyArchivedCustomersWithoutAnyOrderCanBeTrashed() throws Exception {
        long active = customer();
        assertThat(error(active, 0)).isEqualTo("customer_not_archived");
        long order = draft();
        long buyer = jdbc.queryForObject("select customer_id from orders where id=?", Long.class, order);
        jdbc.update("update customer set status='ARCHIVED' where id=?", buyer);
        assertThat(error(buyer, 0)).isEqualTo("customer_has_orders");
        jdbc.update("update orders set deleted_at=current_timestamp where id=?", order);
        assertThat(error(buyer, 0)).isEqualTo("customer_has_orders");
        assertThat(jdbc.queryForObject("select count(*) from customer where deleted_at is not null", Long.class)).isZero();

        long free = archived();
        var items = tree(api.send("GET", BASE + "?status=ALL", null, false)).path("items");
        for (var item : items)
            assertThat(item.path("trashable").asBoolean()).as(item.path("customerCode").asString()).isEqualTo(item.path("id").asString().equals(Long.toString(free)));
    }

    @Test void hidesEverywhereAndRestoresArchivedWithAuditButNoPersonalData() throws Exception {
        long id = archived();
        assertThat(change(id, 0, true)).isEqualTo(204);

        assertThat(api.send("GET", BASE + "/" + id, null, false).statusCode()).isEqualTo(404);
        assertThat(api.send("PATCH", BASE + "/" + id + "/status", json(Map.of("status", "ACTIVE", "version", 1)), true).statusCode()).isEqualTo(404);
        assertThat(total(BASE + "?status=ALL")).isZero();
        assertThat(total(BASE + "/duplicates?phone=0901234567")).isZero();
        var item = tree(api.send("GET", BASE + "/trash", null, false)).path("items").get(0);
        assertThat(item.path("id").asString()).isEqualTo(Long.toString(id));
        assertThat(item.path("code").asString()).startsWith("KH-");
        assertThat(item.path("name").asString()).isEqualTo("Synthetic customer");
        assertThat(Instant.parse(item.path("expiresAt").asString()))
                .isEqualTo(Instant.parse(item.path("deletedAt").asString()).plusSeconds(604800));

        assertThat(change(id, 0, false)).isEqualTo(409);
        assertThat(change(id, 1, false)).isEqualTo(204);
        assertThat(tree(api.send("GET", BASE + "/" + id, null, false)).path("status").asString()).isEqualTo("ARCHIVED");
        assertThat(jdbc.queryForList("select action from audit_event where target_type='CUSTOMER' order by id", String.class)).containsExactly("TRASHED", "UNTRASHED");
        assertThat(jdbc.queryForList("select before_data::text||after_data::text from audit_event", String.class).toString())
                .doesNotContain("Synthetic", "0901234567");
    }

    @Test void trashedCustomerIsNeverMatchedAsDuplicateOrPickedForAnOrder() throws Exception {
        long id = archived();
        assertThat(change(id, 0, true)).isEqualTo(204);
        jdbc.update("update customer set status='ACTIVE' where id=?", id);
        var created = api.send("POST", "/api/v1/admin/orders",
                json(Map.of("customerId", Long.toString(id), "requestId", java.util.UUID.randomUUID())), true);
        assertThat(created.statusCode()).isEqualTo(404);
        assertThat(api.send("POST", BASE, json(Map.of("fullName", "New", "phone", "0901234567")), true).statusCode()).isEqualTo(201);
    }

    @Test void purgesSelectedAtomicallyAndExpiredAfterSevenDays() throws Exception {
        long first = archived(), second = archived(), later = archived();
        for (long id : List.of(first, second, later)) assertThat(change(id, 0, true)).isEqualTo(204);
        assertThat(tree(api.send("GET", BASE + "/trash/selection", null, false)).size()).isEqualTo(3);
        var stale = json(Map.of("items", List.of(Map.of("id", Long.toString(first), "version", 1), Map.of("id", Long.toString(second), "version", 9))));
        assertThat(api.send("POST", BASE + "/trash/purge", stale, true).statusCode()).isEqualTo(409);
        assertThat(jdbc.queryForObject("select count(*) from customer", Long.class)).isEqualTo(3);
        var good = json(Map.of("items", List.of(Map.of("id", Long.toString(first), "version", 1))));
        assertThat(api.send("POST", BASE + "/trash/purge", good, true).statusCode()).isEqualTo(204);
        assertThat(api.send("POST", BASE + "/trash/purge", good, true).statusCode()).isEqualTo(409);

        var deleted = Instant.parse("2020-01-01T00:00:00Z");
        jdbc.update("update customer set deleted_at=? where id=?", Timestamp.from(deleted), second);
        assertThat(change(second, 1, false)).isEqualTo(409);
        trash.purgeExpired(deleted.plusSeconds(604799));
        assertThat(jdbc.queryForObject("select count(*) from customer", Long.class)).isEqualTo(2);
        trash.purgeExpired(deleted.plusSeconds(604800));
        assertThat(jdbc.queryForList("select id from customer", Long.class)).containsExactly(later);
        assertThat(jdbc.queryForObject("select count(*) from audit_event where target_type='CUSTOMER' and action='PURGED'", Long.class)).isEqualTo(1);
    }

    @Test void liveCustomersCannotBePurgedAndStaffIsForbidden() throws Exception {
        long id = archived();
        var body = json(Map.of("items", List.of(Map.of("id", Long.toString(id), "version", 0))));
        assertThat(api.send("POST", BASE + "/trash/purge", body, true).statusCode()).isEqualTo(409);
        assertThat(api.send("POST", BASE + "/trash/purge", json(Map.of("items", List.of())), true).statusCode()).isEqualTo(400);
        var staffApi = new AdminHttpClient(port);
        staffApi.login("staff@catalogue.test");
        for (String path : List.of("/trash", "/trash/selection"))
            assertThat(staffApi.send("GET", BASE + path, null, false).statusCode()).isEqualTo(403);
        assertThat(staffApi.send("POST", BASE + "/trash/purge", body, true).statusCode()).isEqualTo(403);
        assertThat(staffApi.send("PATCH", BASE + "/" + id + "/trash", json(Map.of("version", 0, "trashed", true)), true).statusCode()).isEqualTo(403);
        assertThat(tree(staffApi.send("GET", BASE + "?status=ALL", null, false)).path("items").get(0).path("trashable").asBoolean()).isFalse();
        assertThat(api.send("PATCH", BASE + "/" + id + "/trash", json(Map.of("version", 0, "trashed", true)), false).statusCode()).isEqualTo(403);
        assertThat(jdbc.queryForObject("select deleted_at is null from customer where id=?", Boolean.class, id)).isTrue();
    }
}
