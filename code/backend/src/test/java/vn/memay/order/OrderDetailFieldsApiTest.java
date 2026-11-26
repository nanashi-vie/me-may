package vn.memay.order;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import tools.jackson.databind.JsonNode;
import vn.memay.support.AdminHttpClient;
import vn.memay.support.OrderTestSupport;
import static org.assertj.core.api.Assertions.*;
import static vn.memay.support.AdminHttpClient.*;

/** Read-only fields the order detail page needs for covers, contact channel and the timeline. */
class OrderDetailFieldsApiTest extends OrderTestSupport {
    @Value("${local.server.port}") int port;
    private AdminHttpClient api;

    @BeforeEach void login() throws Exception {
        api = new AdminHttpClient(port);
        api.login("owner@catalogue.test");
    }

    private JsonNode detail(long id) throws Exception {
        var response = api.send("GET", "/api/v1/admin/orders/" + id, null, false);
        assertThat(response.statusCode()).isEqualTo(200);
        return tree(response);
    }

    private long catalogItem(long orderId, long bookId) {
        long listing = jdbc.queryForObject("select id from listing where book_copy_id=?", Long.class, bookId);
        return jdbc.queryForObject("insert into order_items(order_id,source_type,book_copy_id,listing_id,book_code_snapshot,title_snapshot,unit_price_vnd,quantity,unit_weight_grams,created_by) values(?,'CATALOG',?,?,'MM-TEST','Synthetic catalog book',10000,1,100,?) returning id",
                Long.class, orderId, bookId, listing, owner.getId());
    }

    private void shipment(long orderId, int attempt, String state, String createdAt) {
        jdbc.update("insert into order_shipments(order_id,attempt_no,state,shipping_snapshot,created_at) values(?,?,?,cast('{}' as jsonb),cast(? as timestamptz))",
                orderId, attempt, state, createdAt);
    }

    @Test void catalogItemHasCoverOnlyWithActiveFront() throws Exception {
        long id = draft();
        long bookId = Long.parseLong(ready().id());
        catalogItem(id, bookId);
        manual(id, 5000, 1, 100);
        var items = detail(id).path("items");
        assertThat(items.get(0).path("coverUrl").asString()).isEqualTo("/api/v1/admin/books/" + bookId + "/media/FRONT/content");
        assertThat(items.get(1).path("coverUrl").isNull()).isTrue();
        jdbc.update("update book_media set state='DELETE_PENDING' where book_copy_id=? and role='FRONT'", bookId);
        assertThat(detail(id).path("items").get(0).path("coverUrl").isNull()).isTrue();
    }

    @Test void shipmentsCarryCreatedAt() throws Exception {
        long id = draft();
        shipment(id, 1, "ABORTED", "2026-11-01T01:00:00Z");
        shipment(id, 2, "PLANNED", "2026-11-03T02:00:00Z");
        var shipments = detail(id).path("shipments");
        assertThat(shipments.get(0).path("createdAt").asString()).isEqualTo("2026-11-01T01:00:00Z");
        assertThat(shipments.get(1).path("createdAt").asString()).isEqualTo("2026-11-03T02:00:00Z");
    }

    @Test void closedTimesAreExposed() throws Exception {
        long open = draft(), closed = draft();
        jdbc.update("update orders set completed_at=cast('2026-11-05T03:00:00Z' as timestamptz),cancelled_at=cast('2026-11-06T04:00:00Z' as timestamptz) where id=?", closed);
        assertThat(detail(closed).path("completedAt").asString()).isEqualTo("2026-11-05T03:00:00Z");
        assertThat(detail(closed).path("cancelledAt").asString()).isEqualTo("2026-11-06T04:00:00Z");
        assertThat(detail(open).path("completedAt").isNull()).isTrue();
        assertThat(detail(open).path("cancelledAt").isNull()).isTrue();
    }

    private long withChannels(String tiktok, String threads, String zalo) {
        long id = draft();
        jdbc.update("update customer set tiktok_id=?,threads_id=?,zalo_name=? where id=(select customer_id from orders where id=?)", tiktok, threads, zalo, id);
        return id;
    }

    @Test void channelFollowsListPriority() throws Exception {
        long all = withChannels("tt.reader", "th.reader", "Zalo Reader"), zaloOnly = withChannels(" ", "", "Zalo Mẹ Bin"),
                none = withChannels(null, null, null);
        assertThat(detail(all).path("customerChannel").path("type").asString()).isEqualTo("TIKTOK");
        assertThat(detail(all).path("customerChannel").path("value").asString()).isEqualTo("tt.reader");
        assertThat(detail(zaloOnly).path("customerChannel").path("type").asString()).isEqualTo("ZALO");
        assertThat(detail(none).path("customerChannel").isNull()).isTrue();
    }
}
