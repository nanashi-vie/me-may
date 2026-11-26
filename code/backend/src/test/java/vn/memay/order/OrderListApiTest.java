package vn.memay.order;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import tools.jackson.databind.JsonNode;
import vn.memay.support.AdminHttpClient;
import vn.memay.support.OrderTestSupport;
import static org.assertj.core.api.Assertions.*;
import static vn.memay.support.AdminHttpClient.*;

class OrderListApiTest extends OrderTestSupport {
    private static final String BASE = "/api/v1/admin/orders";
    @Value("${local.server.port}") int port;
    private AdminHttpClient api;

    @BeforeEach void login() throws Exception {
        api = new AdminHttpClient(port);
        api.login("owner@catalogue.test");
    }

    private long order(String status) {
        long id = draft();
        jdbc.update("update orders set status=? where id=?", status, id);
        return id;
    }

    private long returned() {
        long id = order("CANCELLED");
        jdbc.update("insert into order_returns(order_id,item_id,quantity_received,quantity_restocked,reason,created_by,created_at,request_id) values(?,?,0,0,'Synthetic',?,current_timestamp,?)",
                id, manual(id, 10000, 1, 100), owner.getId(), UUID.randomUUID());
        return id;
    }

    private void at(long id, String column, String instant) {
        jdbc.update("update orders set " + column + "=cast(? as timestamptz) where id=?", instant, id);
    }

    private JsonNode get(String query) throws Exception {
        var response = api.send("GET", BASE + query, null, false);
        assertThat(response.statusCode()).as(query).isEqualTo(200);
        return tree(response);
    }

    private List<Long> listed(String query) throws Exception {
        var ids = new ArrayList<Long>();
        for (var item : get(query).path("items")) ids.add(Long.parseLong(item.path("id").asString()));
        return ids;
    }

    @Test void everyOrderBelongsToExactlyOneGroup() throws Exception {
        long draft = order("DRAFT"), keep = order("KEEPING"), ready = order("READY_TO_SHIP"), done = order("COMPLETED");
        long cancelled = order("CANCELLED"), returned = returned(), trashed = order("DRAFT");
        jdbc.update("update orders set deleted_at=current_timestamp where id=?", trashed);
        assertThat(listed("?group=ACTION")).containsExactly(draft);
        assertThat(listed("?group=PACKING")).containsExactly(ready);
        assertThat(listed("?group=KEEPING")).containsExactly(keep);
        assertThat(listed("?group=COMPLETED")).containsExactly(done);
        assertThat(listed("?group=CLOSED")).containsExactlyInAnyOrder(cancelled, returned);
        assertThat(listed("?group=ALL")).hasSize(6).isEqualTo(listed("")).isEqualTo(listed("?group="));
        assertThat(listed("?group=CLOSED&status=RETURNED")).containsExactly(returned);
        assertThat(listed("?group=COMPLETED&status=DRAFT")).isEmpty();
    }

    @Test void packingGroupListsReadyOldestFirst() throws Exception {
        long newer = order("READY_TO_SHIP"), older = order("READY_TO_SHIP");
        at(newer, "created_at", "2026-02-02T00:00:00Z");
        at(older, "created_at", "2026-01-01T00:00:00Z");
        order("DRAFT");
        assertThat(listed("?group=PACKING")).containsExactly(older, newer);
    }

    @Test void unsuccessfulStatusIs400() throws Exception {
        assertThat(api.send("GET", BASE + "?status=UNSUCCESSFUL", null, false).statusCode()).isEqualTo(400);
    }

    private long withChannels(String tiktok, String threads, String zalo) {
        long id = draft();
        jdbc.update("update customer set tiktok_id=?,threads_id=?,zalo_name=? where id=(select customer_id from orders where id=?)", tiktok, threads, zalo, id);
        return id;
    }

    private JsonNode summary(long id) throws Exception {
        for (var item : get("?size=100").path("items")) if (item.path("id").asString().equals(Long.toString(id))) return item;
        throw new AssertionError("missing " + id);
    }

    @Test void customerChannelPrefersTiktokThenThreadsThenZalo() throws Exception {
        long all = withChannels("tt.reader", "th.reader", "Zalo Reader"), noTiktok = withChannels("  ", "th.only", "Zalo Only"),
                zaloOnly = withChannels(null, null, "Zalo Mẹ Bin"), none = withChannels(null, "", null);
        assertThat(summary(all).path("customerChannel").path("type").asString()).isEqualTo("TIKTOK");
        assertThat(summary(all).path("customerChannel").path("value").asString()).isEqualTo("tt.reader");
        assertThat(summary(noTiktok).path("customerChannel").path("type").asString()).isEqualTo("THREADS");
        assertThat(summary(zaloOnly).path("customerChannel").path("value").asString()).isEqualTo("Zalo Mẹ Bin");
        assertThat(summary(none).path("customerChannel").isNull()).isTrue();
    }

    @Test void channelFollowsCurrentProfile() throws Exception {
        long id = withChannels(null, null, "Old");
        jdbc.update("update customer set tiktok_id='new.handle' where id=(select customer_id from orders where id=?)", id);
        assertThat(summary(id).path("customerChannel").path("value").asString()).isEqualTo("new.handle");
    }

    @Test void rejectsUnknownGroups() throws Exception {
        for (String bad : List.of("UNKNOWN", "action"))
            for (String path : List.of("", "/stats"))
                assertThat(api.send("GET", BASE + path + "?group=" + bad, null, false).statusCode()).as(path + bad).isEqualTo(400);
    }

    @Test void staffCannotUseGroups() throws Exception {
        api.login("staff@catalogue.test");
        assertThat(api.send("GET", BASE + "?group=ACTION", null, false).statusCode()).isEqualTo(403);
    }

    @Test void ordersEachGroupByWhatNeedsAttention() throws Exception {
        for (var group : List.of(
                List.of("ACTION", "DRAFT", "created_at"), List.of("KEEPING", "KEEPING", "keep_until"),
                List.of("COMPLETED", "COMPLETED", "completed_at"), List.of("CLOSED", "CANCELLED", "cancelled_at"))) {
            String column = group.get(2);
            long a = order(group.get(1)), b = order(group.get(1)), c = order(group.get(1)), d = order(group.get(1));
            // Creation order must not decide: b and c tie, d is last either way.
            at(a, column, "2026-11-20T00:00:00Z");
            at(b, column, "2026-11-10T00:00:00Z");
            at(c, column, "2026-11-10T00:00:00Z");
            at(d, column, column.equals("created_at") ? "2026-11-25T00:00:00Z" : null);
            var ids = new ArrayList<Long>();
            for (int page = 0; page < 4; page++) ids.addAll(listed("?group=" + group.get(0) + "&size=1&page=" + page));
            boolean soonestFirst = List.of("created_at", "keep_until").contains(column);
            assertThat(ids).as(group.get(0)).isEqualTo(soonestFirst ? List.of(b, c, a, d) : List.of(a, c, b, d));
        }
    }

    @Test void defaultListStaysNewestFirstWhateverTheStatus() throws Exception {
        long a = order("COMPLETED"), b = order("DRAFT"), c = order("KEEPING"), d = order("CANCELLED");
        at(a, "created_at", "2026-11-20T00:00:00Z");
        at(b, "created_at", "2026-11-10T00:00:00Z");
        at(c, "created_at", "2026-11-10T00:00:00Z");
        at(d, "created_at", "2026-11-25T00:00:00Z");
        for (String query : List.of("?", "?group=ALL&", "?group=&")) {
            var ids = new ArrayList<Long>();
            for (int page = 0; page < 4; page++) ids.addAll(listed(query + "size=1&page=" + page));
            assertThat(ids).as(query).isEqualTo(List.of(d, a, c, b));
        }
    }

    @Test void returnsClosingDates() throws Exception {
        long done = order("COMPLETED"), cancelled = order("CANCELLED");
        at(done, "completed_at", "2026-11-20T00:00:00Z");
        at(cancelled, "cancelled_at", "2026-11-21T00:00:00Z");
        var completedItem = get("?group=COMPLETED").path("items").get(0);
        assertThat(completedItem.path("completedAt").asString()).isEqualTo("2026-11-20T00:00:00Z");
        assertThat(completedItem.path("cancelledAt").isNull()).isTrue();
        var closedItem = get("?group=CLOSED").path("items").get(0);
        assertThat(closedItem.path("cancelledAt").asString()).isEqualTo("2026-11-21T00:00:00Z");
        assertThat(closedItem.path("completedAt").isNull()).isTrue();
    }

    private long keeping(int daysLeft) {
        long id = order("KEEPING");
        jdbc.update("update orders set keep_until=? where id=?", Timestamp.from(OrderValidation.keepUntil(Instant.now(), daysLeft)), id);
        return id;
    }

    /** One draft's id per row keeps the customer and code filters selective. */
    private long everyStatus() {
        long first = order("DRAFT");
        order("DRAFT");
        for (int days : new int[]{-1, 0, 2, 9}) keeping(days);
        order("READY_TO_SHIP");
        for (int i = 0; i < 3; i++) order("COMPLETED");
        order("CANCELLED");
        order("CANCELLED");
        returned();
        jdbc.update("update orders set deleted_at=current_timestamp where id=?", order("DRAFT"));
        return first;
    }

    @Test void countsEveryStatusOutsideTheTrash() throws Exception {
        everyStatus();
        var stats = get("/stats");
        Map.of("draft", 2, "keeping", 4, "overdue", 1, "due", 1, "soon", 1, "readyToShip", 1, "completed", 3, "cancelled", 2, "returned", 1)
                .forEach((field, count) -> assertThat(stats.path(field).asInt(-1)).as(field).isEqualTo(count));
    }

    @Test void countsIgnoreTheOpenTabSubFilterAndPage() throws Exception {
        everyStatus();
        var all = get("/stats");
        for (String query : List.of("group=COMPLETED", "status=DRAFT", "status=RETURNED", "keepWarning=OVERDUE", "page=5&size=1"))
            assertThat(get("/stats?" + query)).as(query).isEqualTo(all);
    }

    @Test void countsMatchTheListUnderSearchDatesAndCustomer() throws Exception {
        long first = everyStatus(), moved = order("COMPLETED"), alsoMoved = keeping(-1);
        at(moved, "created_at", "2026-01-05T00:00:00Z");
        at(alsoMoved, "created_at", "2026-01-06T00:00:00Z");
        String customer = jdbc.queryForObject("select customer_id::text from orders where id=?", String.class, first);
        String code = jdbc.queryForObject("select order_code from orders where id=?", String.class, moved);
        for (var scope : Map.of("size=20", 15L, "customerId=" + customer, 1L, "createdFrom=2026-01-05&createdTo=2026-01-06", 2L, "q=" + code, 1L).entrySet()) {
            String q = scope.getKey();
            var s = get("/stats?" + q);
            long action = 0, closed = 0;
            for (var status : List.of(List.of("CLOSED", "CANCELLED", "cancelled"), List.of("CLOSED", "RETURNED", "returned"))) {
                long count = s.path(status.get(2)).asLong(-1);
                assertThat(total(q + "&group=" + status.get(0) + "&status=" + status.get(1))).as(q + status).isEqualTo(count);
                closed += count;
            }
            for (var warning : List.of(List.of("OVERDUE", "overdue"), List.of("DUE", "due"), List.of("SOON", "soon")))
                assertThat(total(q + "&group=KEEPING&keepWarning=" + warning.get(0))).as(q + warning).isEqualTo(s.path(warning.get(1)).asLong(-1));
            action = s.path("draft").asLong(-1);
            long packing = s.path("readyToShip").asLong(-1), keeping = s.path("keeping").asLong(-1), completed = s.path("completed").asLong(-1);
            assertThat(List.of(total(q + "&group=ACTION"), total(q + "&group=PACKING"), total(q + "&group=KEEPING"), total(q + "&group=COMPLETED"), total(q + "&group=CLOSED")))
                    .as(q).isEqualTo(List.of(action, packing, keeping, completed, closed));
            assertThat(action + packing + keeping + completed + closed).as(q).isEqualTo(total(q + "&group=ALL")).isEqualTo(scope.getValue());
        }
    }

    private long total(String query) throws Exception {
        return get("?" + query).path("totalElements").asLong(-1);
    }

    @Test void statsStillRejectInvalidFilters() throws Exception {
        for (String bad : List.of("group=BAD", "status=BAD", "keepWarning=BAD", "size=0", "createdFrom=2026-02-30"))
            assertThat(api.send("GET", BASE + "/stats?" + bad, null, false).statusCode()).as(bad).isEqualTo(400);
    }
}
