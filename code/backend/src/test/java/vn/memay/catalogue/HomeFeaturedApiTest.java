package vn.memay.catalogue;

import static org.assertj.core.api.Assertions.*;
import static vn.memay.support.AdminHttpClient.*;

import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Value;
import vn.memay.support.*;

class HomeFeaturedApiTest extends CatalogueTestSupport {
    @Value("${local.server.port}")
    int port;
    AdminHttpClient api, anon;

    @BeforeEach
    void client() throws Exception {
        api = new AdminHttpClient(port);
        api.login("owner@catalogue.test");
        anon = new AdminHttpClient(port);
    }

    private BookDtos.BookDetail publishedBook(String title, String category, String binding) {
        var b = seed(owner, BookFixtures.write(title, category, binding, 15000L, null, null, List.of("AGE_4_6"), List.of()));
        for (String role : List.of("FRONT", "BACK", "INSIDE_1")) {
            jdbc.update("insert into book_media(id,book_copy_id,role,state,storage_public_id,alt) values (?,?,?,'ACTIVE',?,?)",
                    UUID.randomUUID(), Long.parseLong(b.id()), role, "test/" + UUID.randomUUID(), role);
        }
        jdbc.update("update listing set publication_status='PUBLISHED',published_at=current_timestamp where book_copy_id=?",
                Long.parseLong(b.id()));
        return b;
    }

    @Test
    void homeShelvesReturnUpToTenBooksAndPrioritizePinnedAvailableBooksWithTopUp() throws Exception {
        List<BookDtos.BookDetail> created = new ArrayList<>();
        for (int i = 1; i <= 12; i++) {
            created.add(publishedBook("Picture " + i, "PICTURE_BOOK", "HARDCOVER"));
        }

        var initialHome = tree(anon.send("GET", "/api/v1/home", null, false));
        var newestShelf = initialHome.path("shelves").get(0).path("books");
        assertThat(newestShelf.size()).isEqualTo(10);

        String pin1 = created.get(0).bookCode();
        String pin2 = created.get(1).bookCode();
        var updatePayload = Map.of(
                "version", 0,
                "shelves", List.of(
                        Map.of("shelfKey", "NEWEST", "bookCodes", List.of(pin1, pin2)),
                        Map.of("shelfKey", "CATEGORY:PICTURE_BOOK", "bookCodes", List.of(pin2))));

        var res = api.send("PUT", "/api/v1/admin/home-featured", json(updatePayload), true);
        assertThat(res.statusCode()).isEqualTo(200);
        assertThat(tree(res).path("version").asLong()).isEqualTo(1L);

        var updatedHome = tree(anon.send("GET", "/api/v1/home", null, false));
        var pinnedNewest = updatedHome.path("shelves").get(0).path("books");
        assertThat(pinnedNewest.size()).isEqualTo(10);
        assertThat(pinnedNewest.get(0).path("bookCode").asString()).isEqualTo(pin1);
        assertThat(pinnedNewest.get(1).path("bookCode").asString()).isEqualTo(pin2);

        Set<String> uniqueCodes = new HashSet<>();
        for (int i = 0; i < pinnedNewest.size(); i++) {
            uniqueCodes.add(pinnedNewest.get(i).path("bookCode").asString());
        }
        assertThat(uniqueCodes).hasSize(10);

        jdbc.update("update book_copy set availability='SOLD' where id=?", Long.parseLong(created.get(0).id()));
        var afterSoldHome = tree(anon.send("GET", "/api/v1/home", null, false));
        var newestAfterSold = afterSoldHome.path("shelves").get(0).path("books");
        assertThat(newestAfterSold.size()).isEqualTo(10);
        assertThat(newestAfterSold.get(0).path("bookCode").asString()).isEqualTo(pin2);

        var adminConfig = tree(api.send("GET", "/api/v1/admin/home-featured", null, false));
        var adminNewestItems = adminConfig.path("shelves").get(0).path("items");
        assertThat(adminNewestItems.size()).isEqualTo(2);
        assertThat(adminNewestItems.get(0).path("bookCode").asString()).isEqualTo(pin1);
        assertThat(adminNewestItems.get(0).path("availability").asString()).isEqualTo("SOLD");
        assertThat(adminNewestItems.get(0).path("activeOnHome").asBoolean()).isFalse();
        assertThat(adminNewestItems.get(1).path("activeOnHome").asBoolean()).isTrue();
    }

    @Test
    void candidatesAndValidationEnforceScopeMaxTenVersionAndOwnerRole() throws Exception {
        var board = publishedBook("Board Alpha", "BOARD_BOOK", null);
        var pic = publishedBook("Picture Beta", "PICTURE_BOOK", "PAPERBACK");

        var boardCandidates = tree(
                api.send("GET", "/api/v1/admin/home-featured/candidates?shelfKey=CATEGORY:BOARD_BOOK&q=Alpha", null, false));
        assertThat(boardCandidates.size()).isEqualTo(1);
        assertThat(boardCandidates.get(0).path("bookCode").asString()).isEqualTo(board.bookCode());

        var wrongCategory = Map.of(
                "version", 0,
                "shelves", List.of(Map.of("shelfKey", "CATEGORY:BOARD_BOOK", "bookCodes", List.of(pic.bookCode()))));
        assertThat(api.send("PUT", "/api/v1/admin/home-featured", json(wrongCategory), true).statusCode())
                .isEqualTo(400);

        var duplicateCode = Map.of(
                "version", 0,
                "shelves",
                List.of(Map.of("shelfKey", "NEWEST", "bookCodes", List.of(board.bookCode(), board.bookCode()))));
        assertThat(api.send("PUT", "/api/v1/admin/home-featured", json(duplicateCode), true).statusCode())
                .isEqualTo(400);

        var overTen = Map.of(
                "version", 0,
                "shelves", List.of(Map.of("shelfKey", "NEWEST", "bookCodes", Collections.nCopies(11, board.bookCode()))));
        assertThat(api.send("PUT", "/api/v1/admin/home-featured", json(overTen), true).statusCode()).isEqualTo(400);

        var valid = Map.of(
                "version", 0,
                "shelves", List.of(Map.of("shelfKey", "CATEGORY:BOARD_BOOK", "bookCodes", List.of(board.bookCode()))));
        assertThat(api.send("PUT", "/api/v1/admin/home-featured", json(valid), true).statusCode()).isEqualTo(200);

        long audits = jdbc.queryForObject("select count(*) from audit_event where target_type='HOME_FEATURED'",
                Long.class);
        assertThat(audits).isEqualTo(1L);

        assertThat(api.send("PUT", "/api/v1/admin/home-featured", json(valid), true).statusCode()).isEqualTo(409);

        api.login("staff@catalogue.test");
        var staffAttempt = Map.of(
                "version", 1,
                "shelves", List.of(Map.of("shelfKey", "CATEGORY:BOARD_BOOK", "bookCodes", List.of())));
        assertThat(api.send("PUT", "/api/v1/admin/home-featured", json(staffAttempt), true).statusCode())
                .isEqualTo(403);
    }
}
