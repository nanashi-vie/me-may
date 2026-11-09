package vn.memay.media;

import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import vn.memay.media.ImageTypes.Manifest;
import vn.memay.media.ImageTypes.Variant;
import vn.memay.support.AdminHttpClient;
import vn.memay.support.BookFixtures;
import static org.assertj.core.api.Assertions.assertThat;
import static vn.memay.support.AdminHttpClient.*;

@TestPropertySource(properties = "memay.media.local.enabled=true")
class LocalUploadIntegrationTest extends MediaTestSupport {
    @TempDir static Path root;
    private static com.sun.net.httpserver.HttpServer imageOrigin;

    @org.junit.jupiter.api.AfterAll static void stopOrigin() {
        if (imageOrigin != null) imageOrigin.stop(0);
    }

    private static String fixtureOrigin() {
        if (imageOrigin == null) {
            try {
                imageOrigin = com.sun.net.httpserver.HttpServer.create(new java.net.InetSocketAddress("127.0.0.1", 0), 0);
                imageOrigin.createContext("/derived/", exchange -> {
                    try (exchange) {
                        Path file = root.resolve(exchange.getRequestURI().getPath().substring(1));
                        if (!Files.isRegularFile(file)) {
                            exchange.sendResponseHeaders(404, -1);
                            return;
                        }
                        exchange.getResponseHeaders().set("Content-Type", "image/jpeg");
                        exchange.sendResponseHeaders(200, Files.size(file));
                        Files.copy(file, exchange.getResponseBody());
                    }
                });
                imageOrigin.start();
            } catch (java.io.IOException e) { throw new java.io.UncheckedIOException(e); }
        }
        return "http://127.0.0.1:" + imageOrigin.getAddress().getPort();
    }
    @DynamicPropertySource static void localRoot(DynamicPropertyRegistry registry) {
        registry.add("memay.media.local.nginx-origin", LocalUploadIntegrationTest::fixtureOrigin);
        registry.add("memay.media.local.root", () -> {
            try { return root.toRealPath().toString(); }
            catch (java.io.IOException e) { throw new java.io.UncheckedIOException(e); }
        });
    }

    @Autowired ImageJobService worker;
    @Value("${local.server.port}") int port;

    @Test void uploadReplayFinalizeGateAndReplacementAreAtomic() throws Exception {
        var api = new AdminHttpClient(port);
        api.login(owner.getEmail());
        jdbc.update("INSERT INTO image_recipe VALUES('v1','fixture','{}') ON CONFLICT DO NOTHING");
        String sessions = "/api/v1/admin/upload-sessions";
        String session = tree(api.send("POST", sessions, "{}", true)).path("id").asString();
        String endpoint = sessions + "/" + session + "/media";
        byte[] jpeg = ImageValidatorTest.image("jpeg");
        var firstRequest = Map.of("requestKey", UUID.randomUUID().toString(), "providerRevision", "LOCAL:v1");
        var first = api.multipart(endpoint, "cover.jpg", jpeg, firstRequest, true);
        assertThat(first.statusCode()).isEqualTo(202);
        var accepted = tree(first);
        assertThat(tree(api.multipart(endpoint, "cover.jpg", jpeg, firstRequest, true))).isEqualTo(accepted);
        byte[] changed = jpeg.clone();
        changed[changed.length - 1] ^= 1;
        assertThat(api.multipart(endpoint, "cover.jpg", changed, firstRequest, true).statusCode()).isEqualTo(409);
        var second = tree(api.multipart(endpoint, "back.jpg", jpeg,
                Map.of("requestKey", UUID.randomUUID().toString(), "providerRevision", "LOCAL:v1"), true));
        var body = new java.util.LinkedHashMap<String,Object>();
        body.put("uploadSessionId", session);
        body.put("write", BookFixtures.write("Local book", "BOARD_BOOK", null, 20_000L, null, null, List.of(), List.of()));
        body.put("media", List.of(Map.of("mediaId", accepted.path("mediaId").asString(), "role", "FRONT"),
                Map.of("mediaId", second.path("mediaId").asString(), "role", "BACK")));
        body.put("publication", "PUBLISHED");
        body.put("confirmedActualCopy", true);
        var pending = api.send("POST", "/api/v1/admin/books", json(body), true);
        assertThat(pending.statusCode()).isEqualTo(409);
        assertThat(pending.body()).contains("media_not_ready");
        finish(jpeg);
        finish(jpeg);
        assertThat(tree(api.send("GET", accepted.path("statusPath").asString(), null, false)).path("status").asString())
                .isEqualTo("READY");
        var preview = api.download(endpoint + "/" + accepted.path("mediaId").asString());
        assertThat(preview.statusCode()).isEqualTo(200);
        assertThat(preview.body()).containsExactly(jpeg);
        var blocked = api.send("POST", "/api/v1/admin/books", json(body), true);
        assertThat(blocked.statusCode()).isEqualTo(409);
        assertThat(blocked.body()).contains("image_source_unverified");
        body.put("publication", "ARCHIVED");
        var saved = api.send("POST", "/api/v1/admin/books", json(body), true);
        assertThat(saved.statusCode()).isEqualTo(201);
        var book = tree(saved);
        assertThat(tree(api.send("POST", "/api/v1/admin/books", json(body), true)).path("id")).isEqualTo(book.path("id"));

        String replacementSession = tree(api.send("POST", sessions, "{}", true)).path("id").asString();
        var replacement = tree(api.multipart(sessions + "/" + replacementSession + "/media", "replacement.jpg", jpeg,
                Map.of("requestKey", UUID.randomUUID().toString(), "providerRevision", "LOCAL:v1"), true));
        finish(jpeg);
        String bookPath = "/api/v1/admin/books/" + book.path("id").asString();
        String replacementPath = bookPath + "/media/replacements/" + replacement.path("mediaId").asString() + "/commit";
        long version = book.path("version").asLong();
        var requestKey = UUID.randomUUID();
        assertThat(api.send("POST", replacementPath, json(Map.of("role", "FRONT", "version", version + 1,
                "requestKey", requestKey)), true).statusCode()).isEqualTo(409);
        assertThat(tree(api.send("GET", bookPath, null, false)).path("media").get(0).path("id"))
                .isEqualTo(accepted.path("mediaId"));
        String commit = json(Map.of("role", "FRONT", "version", version, "requestKey", requestKey));
        var updated = api.send("POST", replacementPath, commit, true);
        assertThat(updated.statusCode()).isEqualTo(200);
        assertThat(tree(updated).path("media").get(0).path("id")).isEqualTo(replacement.path("mediaId"));
        assertThat(tree(api.send("POST", replacementPath, commit, true)).path("version"))
                .isEqualTo(tree(updated).path("version"));
    }

    @Test void mixedProvidersRespectPublicationAndMissingVariants() throws Exception {
        var api = new AdminHttpClient(port);
        api.login(owner.getEmail());
        var book = ready();
        long id = Long.parseLong(book.id());
        byte[] jpeg = ImageValidatorTest.image("jpeg");
        var key = jdbc.queryForObject("SELECT storage_public_id FROM book_media WHERE book_copy_id=? AND role='BACK'", String.class, id);
        fake.assets.put(key, jpeg);
        var insideKey = jdbc.queryForObject("SELECT storage_public_id FROM book_media WHERE book_copy_id=? AND role='INSIDE_1'", String.class, id);
        fake.assets.put(insideKey, jpeg);
        jdbc.update("UPDATE book_media SET role='INSIDE_4' WHERE book_copy_id=? AND role='INSIDE_1'", id);
        jdbc.update("INSERT INTO image_recipe VALUES('v1','fixture','{}') ON CONFLICT DO NOTHING");
        var media = jdbc.queryForObject("SELECT id FROM book_media WHERE book_copy_id=? AND role='FRONT'", UUID.class, id);
        var generation = UUID.randomUUID();
        jdbc.update("INSERT INTO image_asset(media_id) VALUES (?)", media);
        jdbc.update("INSERT INTO image_generation(id,media_id,recipe_version,published_at) VALUES (?,?, 'v1',now())", generation, media);
        jdbc.update("UPDATE book_media SET provider='LOCAL',serving_generation=? WHERE id=?", generation, media);
        String prefix = "derived/" + media + "/" + generation + "/";
        String hash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(jpeg));
        Files.createDirectories(root.resolve(prefix));
        for (int size : List.of(480, 1280)) {
            String path = prefix + size + ".jpg";
            Files.write(root.resolve(path), jpeg);
            jdbc.update("INSERT INTO image_variant(generation_id,name,storage_key,mime,width,height,bytes,sha256) VALUES (?,?,?,'image/jpeg',1,1,?,?)",
                    generation, Integer.toString(size), path, jpeg.length, hash);
        }
        String path = "/api/v1/books/" + book.slug();
        String cover = path + "/media/FRONT?size=480&format=jpg&v=";
        assertThat(api.download(cover + generation).statusCode()).isEqualTo(404);
        jdbc.update("UPDATE listing SET publication_status='PUBLISHED' WHERE book_copy_id=?", id);
        assertThat(api.download(cover + media).statusCode()).isEqualTo(404);
        var image = api.download(cover + generation);
        assertThat(image.statusCode()).isEqualTo(200);
        assertThat(image.body()).isEqualTo(jpeg);
        assertThat(api.download(path + "/media/BACK?size=640").statusCode()).isEqualTo(200);
        assertThat(api.download(path + "/media/INSIDE_4").statusCode()).isEqualTo(200);
        assertThat(api.download(path + "/media/INTERNAL_1").statusCode()).isEqualTo(404);
        var preview = api.download("/api/v1/admin/books/" + id + "/media/FRONT/content");
        assertThat(preview.statusCode()).isEqualTo(200);
        assertThat(preview.headers().firstValue("Cache-Control")).hasValue("no-store");
        var archive = api.download("/api/v1/admin/books/photo-download?ids=" + id);
        assertThat(archive.statusCode()).isEqualTo(200);
        try (var zip = new java.util.zip.ZipInputStream(new java.io.ByteArrayInputStream(archive.body()))) {
            assertThat(zip.getNextEntry().getName()).isEqualTo(book.bookCode() + "/FRONT.jpg");
            assertThat(zip.readAllBytes()).isEqualTo(jpeg);
            assertThat(zip.getNextEntry().getName()).isEqualTo(book.bookCode() + "/BACK.jpg");
            assertThat(zip.readAllBytes()).isEqualTo(jpeg);
            assertThat(zip.getNextEntry().getName()).isEqualTo(book.bookCode() + "/INSIDE_4.jpg");
            assertThat(zip.readAllBytes()).isEqualTo(jpeg);
            assertThat(zip.getNextEntry()).isNull();
        }
        var publicBook = api.send("GET", path, null, false);
        assertThat(publicBook.body()).doesNotContain(prefix, insideKey, "sourceRef", "fileId");
        var front = tree(publicBook).path("media").get(0);
        assertThat(front.path("cacheKey").asString()).isEqualTo(generation.toString());
        assertThat(front.path("imageVariants").get(0).path("url").asString()).isEqualTo(cover + generation);
        assertThat(api.download(front.path("contentPath").asString()).statusCode()).isEqualTo(200);
        Files.delete(root.resolve(prefix + "480.jpg"));
        assertThat(api.download(cover + generation).statusCode()).isEqualTo(404);
        assertThat(tree(api.send("GET", path, null, false)).path("media").get(0).path("role").asString()).isEqualTo("BACK");
        jdbc.update("UPDATE book_copy SET deleted_at=now() WHERE id=?", id);
        assertThat(api.download(path + "/media/BACK?size=640").statusCode()).isEqualTo(404);
    }

    private void finish(byte[] jpeg) throws Exception {
        var lease = worker.claim().orElseThrow();
        String name = "1280.jpg";
        var directory = Files.createDirectories(root.resolve("staging/" + lease.token() + "/output"));
        Files.write(directory.resolve(name), jpeg);
        String hash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(jpeg));
        var manifest = new Manifest(lease.mediaId(), lease.generationId(), lease.recipeVersion(),
                List.of(new Variant("1280", "derived/" + lease.mediaId() + "/" + lease.generationId() + "/" + name,
                        "image/jpeg", 1, 1, jpeg.length, hash)));
        worker.complete(lease.jobId(), lease.token(), manifest);
    }
}
