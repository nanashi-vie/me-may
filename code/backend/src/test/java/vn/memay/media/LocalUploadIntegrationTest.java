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
    @DynamicPropertySource static void localRoot(DynamicPropertyRegistry registry) {
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
