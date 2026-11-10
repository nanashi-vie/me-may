package vn.memay.media.source;

import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.TestPropertySource;
import vn.memay.support.AdminHttpClient;
import vn.memay.support.BookFixtures;
import vn.memay.support.CatalogueTestSupport;
import static org.assertj.core.api.Assertions.assertThat;
import static vn.memay.support.AdminHttpClient.*;

@TestPropertySource(properties = "memay.media.local.enabled=true")
@Import(SourceBindingApiTest.DriveFixture.class)
class SourceBindingApiTest extends CatalogueTestSupport {
    private static final String HASH = "a".repeat(64);
    @Value("${local.server.port}") int port;

    @TestConfiguration
    static class DriveFixture {
        @Bean @Primary DriveSourceClient fakeDrive() {
            return (id, operation) -> new DownloadedSource("fixture", HASH, 3, "image/jpeg", "7");
        }
    }

    @Test void ownerCanQueueVerificationAndReadOnlySafeStatus() throws Exception {
        var book = seed(owner, BookFixtures.write("Source API", "BOARD_BOOK", null, 20_000L,
                null, null, java.util.List.of(), java.util.List.of()));
        long bookId = Long.parseLong(book.id());
        UUID media = UUID.randomUUID(), generation = UUID.randomUUID();
        String recipe = "source-api-" + generation;
        jdbc.update("INSERT INTO image_asset VALUES(?)", media);
        jdbc.update("INSERT INTO image_recipe VALUES(?,'fixture','{}')", recipe);
        jdbc.update("""
                INSERT INTO image_generation(id,media_id,recipe_version,published_at,input_sha256)
                VALUES(?,?,?,now(),?)
                """, generation, media, recipe, HASH);
        jdbc.update("""
                INSERT INTO book_media(id,book_copy_id,role,state,storage_public_id,provider,serving_generation)
                VALUES(?,?,'FRONT','ACTIVE',?,'LOCAL',?)
                """, media, bookId, media.toString(), generation);
        try {
            String path = "/api/v1/admin/media/" + media + "/source";
            var api = new AdminHttpClient(port);
            api.login(staff.getEmail());
            assertThat(api.send("GET", path, null, false).statusCode()).isEqualTo(403);
            api.login(owner.getEmail());
            String request = json(Map.of("fileId", "private-drive-file", "bindingVersion", 0,
                    "bookVersion", book.version(), "requestKey", UUID.randomUUID()));
            assertThat(api.send("PUT", path, request, false).statusCode()).isEqualTo(403);
            var accepted = api.send("PUT", path, request, true);
            assertThat(accepted.statusCode()).isEqualTo(202);
            UUID operation = UUID.fromString(tree(accepted).path("operationId").asString());
            long deadline = System.nanoTime() + java.time.Duration.ofSeconds(6).toNanos();
            String state;
            do {
                state = jdbc.queryForObject("SELECT status FROM image_job WHERE id=?", String.class, operation);
                if ("READY".equals(state) || "FAILED".equals(state)) break;
                Thread.sleep(25);
            } while (System.nanoTime() < deadline);
            assertThat(state).isEqualTo("READY");
            var status = api.send("GET", path, null, false);
            assertThat(status.statusCode()).isEqualTo(200);
            assertThat(tree(status).path("status").asString()).isEqualTo("VERIFIED");
            assertThat(tree(status).path("bindingVersion").asInt()).isEqualTo(1);
            assertThat(tree(status).path("bookVersion").asLong()).isEqualTo(book.version() + 1);
            assertThat(status.body()).doesNotContain("private-drive-file", HASH);
        } finally {
            jdbc.update("DELETE FROM image_job WHERE media_id=?", media);
            jdbc.update("DELETE FROM book_media WHERE id=?", media);
            jdbc.update("DELETE FROM image_source_binding WHERE media_id=?", media);
            jdbc.update("DELETE FROM image_generation WHERE id=?", generation);
            jdbc.update("DELETE FROM image_asset WHERE media_id=?", media);
            jdbc.update("DELETE FROM image_recipe WHERE version=?", recipe);
        }
    }
}
