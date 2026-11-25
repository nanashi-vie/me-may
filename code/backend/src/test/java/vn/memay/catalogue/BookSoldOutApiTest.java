package vn.memay.catalogue;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import vn.memay.support.AdminHttpClient;
import vn.memay.support.CatalogueTestSupport;
import static org.assertj.core.api.Assertions.*;
import static vn.memay.support.AdminHttpClient.*;

class BookSoldOutApiTest extends CatalogueTestSupport {
    private static final String PATH = "/api/v1/admin/books/sold-out";
    @Value("${local.server.port}") int port;
    private AdminHttpClient api;

    @BeforeEach void login() throws Exception {
        api = new AdminHttpClient(port);
        api.login("owner@catalogue.test");
    }

    private static Map<String, Object> item(BookDtos.BookDetail book) {
        return Map.of("id", book.id(), "version", book.version());
    }

    private static String body(BookDtos.BookDetail... books) {
        return json(Map.of("items", java.util.Arrays.stream(books).map(BookSoldOutApiTest::item).toList()));
    }

    private BookDtos.BookDetail detail(BookDtos.BookDetail book) {
        return queries.detail(Long.parseLong(book.id()), owner);
    }

    private long auditCount() {
        return jdbc.queryForObject("select count(*) from audit_event where action='SOLD_OUT'", Long.class);
    }

    @Test void zeroesEveryLegacyRowAndAuditsWithoutTouchingPublication() throws Exception {
        var book = ready();
        long id = Long.parseLong(book.id());
        jdbc.update("update book_variant set name='A',stock=2 where book_copy_id=?", id);
        jdbc.update("insert into book_variant(book_copy_id,name,stock,sort_order) values(?,'B',3,1)", id);

        var response = api.send("POST", PATH, body(book), true);

        assertThat(response.statusCode()).isEqualTo(200);
        var row = tree(response).get(0);
        var after = detail(book);
        assertThat(row.path("id").asString()).isEqualTo(book.id());
        assertThat(row.path("version").asLong()).isEqualTo(book.version() + 1).isEqualTo(after.version());
        assertThat(row.path("totalStock").asLong()).isZero();
        assertThat(row.path("availability").asString()).isEqualTo("SOLD");
        assertThat(java.time.Instant.parse(row.path("updatedAt").asString())).isEqualTo(after.updatedAt());
        assertThat(after.totalStock()).isZero();
        assertThat(after.availability()).isEqualTo(BookDtos.Availability.SOLD);
        assertThat(after.publication()).isEqualTo(book.publication());
        var audit = jdbc.queryForMap("select actor_id,before_data::text b,after_data::text a,aggregate_version from audit_event where action='SOLD_OUT'");
        assertThat(audit.get("actor_id")).isEqualTo(owner.getId());
        assertThat(audit.get("b").toString()).contains("\"totalStock\": 5", "AVAILABLE");
        assertThat(audit.get("a").toString()).contains("\"totalStock\": 0", "SOLD");
        assertThat(audit.get("aggregate_version")).isEqualTo(after.version());
    }

    @Test void staleVersionRollsBackTheWholeBatch() throws Exception {
        var first = ready();
        var second = ready();
        var stale = Map.of("id", second.id(), "version", second.version() + 1);

        var response = api.send("POST", PATH, json(Map.of("items", List.of(item(first), stale))), true);

        assertThat(response.statusCode()).isEqualTo(409);
        assertThat(tree(response).path("error").asString()).isEqualTo("version_conflict");
        assertThat(tree(response).path("currentVersion").asLong()).isEqualTo(second.version());
        assertThat(detail(first).totalStock()).isEqualTo(1);
        assertThat(detail(first).version()).isEqualTo(first.version());
        assertThat(auditCount()).isZero();
    }

    @Test void alreadySoldOutBookIsANoOp() throws Exception {
        var book = ready();
        assertThat(api.send("POST", PATH, body(book), true).statusCode()).isEqualTo(200);
        var sold = detail(book);

        var again = api.send("POST", PATH, body(sold), true);

        assertThat(again.statusCode()).isEqualTo(200);
        assertThat(tree(again).get(0).path("version").asLong()).isEqualTo(sold.version());
        assertThat(detail(book).version()).isEqualTo(sold.version());
        assertThat(auditCount()).isEqualTo(1);
    }

    @Test void rejectsStaffMissingCsrfTrashedAndInvalidSelections() throws Exception {
        var book = ready();
        assertThat(api.send("POST", PATH, body(book), false).statusCode()).isEqualTo(403);
        assertThat(api.send("POST", PATH, json(Map.of("items", List.of())), true).statusCode()).isEqualTo(400);
        assertThat(api.send("POST", PATH, body(book, book), true).statusCode()).isEqualTo(400);
        assertThat(api.send("POST", PATH, json(Map.of("items", List.of(Map.of("id", book.id())))), true).statusCode()).isEqualTo(400);
        assertThat(api.send("POST", PATH, json(Map.of("items", List.of(Map.of("id", "999999999", "version", 0)))), true).statusCode()).isEqualTo(404);
        var staffApi = new AdminHttpClient(port);
        staffApi.login("staff@catalogue.test");
        assertThat(staffApi.send("POST", PATH, body(book), true).statusCode()).isEqualTo(403);
        assertThat(detail(book).totalStock()).isEqualTo(1);

        assertThat(api.send("PATCH", "/api/v1/admin/books/" + book.id() + "/trash",
                json(Map.of("version", book.version(), "trashed", true)), true).statusCode()).isEqualTo(204);
        var trashed = api.send("POST", PATH,
                json(Map.of("items", List.of(Map.of("id", book.id(), "version", book.version() + 1)))), true);
        assertThat(trashed.statusCode()).isEqualTo(409);
        assertThat(tree(trashed).path("error").asString()).isEqualTo("book_trashed");
    }
}
