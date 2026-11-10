package vn.memay.media;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import vn.memay.common.AdminApiException;
import vn.memay.media.source.*;
import vn.memay.support.AdminHttpClient;
import static org.assertj.core.api.Assertions.*;
import static vn.memay.support.AdminHttpClient.*;

@TestPropertySource(properties = {"memay.media.local.enabled=true", "memay.media.recovery.poll-delay-ms=50"})
@Import(ImageRecoveryIntegrationTest.Fixture.class)
@DirtiesContext
class ImageRecoveryIntegrationTest extends MediaTestSupport {
    static final String API = "/api/v1/admin/image-recovery";
    static final String WORKER = "sha256:" + "a".repeat(64);
    static final String CONFIG = "b".repeat(64);
    @TempDir static Path root;
    @Value("${local.server.port}") int port;
    @Autowired ImageJobService worker;
    @Autowired AtomicReference<String> driveMode;

    @DynamicPropertySource static void settings(DynamicPropertyRegistry p) {
        p.add("memay.media.local.root", () -> {
            try { return root.toRealPath().toString(); }
            catch (java.io.IOException e) { throw new java.io.UncheckedIOException(e); }
        });
    }

    @TestConfiguration
    static class Fixture {
        @Bean AtomicReference<String> driveMode() { return new AtomicReference<>("normal"); }
        @Bean @Primary DriveSourceClient recoveryDrive(LocalImageStore store, AtomicReference<String> mode) {
            return (file, id) -> {
                if (mode.get().equals("missing")) throw new SourceAccessException("SOURCE_MISSING", false, 404);
                try {
                    var staged = store.stage(id, new java.io.ByteArrayInputStream(ImageValidatorTest.image("jpeg")));
                    return new DownloadedSource(staged.key(), staged.sha256(), staged.bytes(), "image/jpeg",
                            mode.get().equals("changed") ? "2" : "1");
                } catch (Exception e) { throw new IllegalStateException(e); }
            };
        }
    }

    @Test void missingDerivedRebuildsExactManifestWithoutReattaching() throws Exception {
        var fixture = setup();
        var api = ownerApi();
        assertThat(tree(api.send("GET", API + "/inventory?mediaIds=" + fixture.media(), null, false))
                .path("media").get(0).path("status").asString()).isEqualTo("MISSING");
        var request = json(Map.of("mediaIds", List.of(fixture.media()), "apply", true, "requestKey", UUID.randomUUID()));
        var accepted = api.send("POST", API + "/rebuild", request, true);
        assertThat(accepted.statusCode()).isEqualTo(202);
        assertThat(tree(api.send("POST", API + "/rebuild", request, true)).path("operationId"))
                .isEqualTo(tree(accepted).path("operationId"));
        var job = claim();
        assertThat(job.kind()).isEqualTo(ImageTypes.JobKind.REBUILD);
        assertThat(jdbc.queryForObject("SELECT priority FROM image_job WHERE id=?", Integer.class, job.jobId())).isEqualTo(22);
        assertThat(worker.claim()).isEmpty();
        finish(job, fixture, fixture.jpeg(), WORKER);
        assertThat(fixture.missing()).hasBinaryContent(fixture.jpeg());
        assertThat(Files.getLastModifiedTime(fixture.good())).isEqualTo(fixture.goodTime());
        assertThat(result(api, accepted).path("items").get(0).path("status").asString()).isEqualTo("READY");
        assertThat(jdbc.queryForObject("SELECT serving_generation FROM book_media WHERE id=?", UUID.class, fixture.media()))
                .isEqualTo(fixture.generation());
        assertThat(jdbc.queryForObject("SELECT publication_status FROM listing WHERE book_copy_id=?", String.class, fixture.book()))
                .isEqualTo("ARCHIVED");
        Files.delete(fixture.missing());
        Files.delete(fixture.good());
        Files.delete(fixture.missing().getParent());
        var totalLoss = submit(api, fixture, "normal");
        finish(claim(), fixture, fixture.jpeg(), WORKER);
        assertThat(result(api, totalLoss).path("ready").asLong()).isEqualTo(1);
        assertThat(fixture.missing()).hasBinaryContent(fixture.jpeg());
        assertThat(fixture.good()).hasBinaryContent(fixture.jpeg());
    }

    @Test void recipeMismatchAndMissingSourcePreserveGoodFiles() throws Exception {
        var fixture = setup();
        var api = ownerApi();
        var missingSource = submit(api, fixture, "missing");
        assertThat(result(api, missingSource).path("items").get(0).path("errorCode").asString()).isEqualTo("SOURCE_MISSING");
        var changed = submit(api, fixture, "changed");
        assertThat(result(api, changed).path("items").get(0).path("errorCode").asString()).isEqualTo("SOURCE_CHANGED");
        var mismatch = submit(api, fixture, "normal");
        var job = claim();
        assertThatThrownBy(() -> finish(job, fixture, fixture.jpeg(), "sha256:" + "c".repeat(64)))
                .isInstanceOfSatisfying(AdminApiException.class, e -> assertThat(e.error).isEqualTo("RECIPE_MISMATCH"));
        byte[] wrong = fixture.jpeg().clone();
        wrong[wrong.length - 1] ^= 1;
        assertThatThrownBy(() -> finish(job, fixture, wrong, WORKER))
                .isInstanceOfSatisfying(AdminApiException.class, e -> assertThat(e.error).isEqualTo("RECIPE_MISMATCH"));
        worker.fail(job.jobId(), job.token(), "recipe_mismatch", false);
        assertThat(result(api, mismatch).path("items").get(0).path("errorCode").asString()).isEqualTo("RECIPE_MISMATCH");
        assertThat(fixture.missing()).doesNotExist();
        assertThat(fixture.good()).hasBinaryContent(fixture.jpeg());
    }

    @Test void recoveryCannotResurrectDeletedMedia() throws Exception {
        var fixture = setup();
        var api = ownerApi();
        var accepted = submit(api, fixture, "normal");
        var job = claim();
        jdbc.update("UPDATE book_media SET state='DELETE_PENDING' WHERE id=?", fixture.media());
        assertThatThrownBy(() -> finish(job, fixture, fixture.jpeg(), WORKER))
                .isInstanceOfSatisfying(AdminApiException.class, e -> assertThat(e.status).isEqualTo(409));
        worker.fail(job.jobId(), job.token(), "image_recovery_media_changed", false);
        assertThat(fixture.missing()).doesNotExist();
        assertThat(jdbc.queryForObject("SELECT state FROM book_media WHERE id=?", String.class, fixture.media()))
                .isEqualTo("DELETE_PENDING");
    }

    private record Media(long book, UUID media, UUID generation, Path missing, Path good,
                         java.nio.file.attribute.FileTime goodTime, byte[] jpeg) {}

    private Media setup() throws Exception {
        driveMode.set("normal");
        var book = ready();
        long bookId = Long.parseLong(book.id());
        var media = jdbc.queryForObject("SELECT id FROM book_media WHERE book_copy_id=? AND role='FRONT'", UUID.class, bookId);
        var generation = UUID.randomUUID();
        byte[] jpeg = ImageValidatorTest.image("jpeg");
        String hash = hash(jpeg);
        jdbc.update("INSERT INTO image_recipe VALUES('r5-fixture',?,jsonb_build_object('sha256',?::text)) ON CONFLICT DO NOTHING", WORKER, CONFIG);
        jdbc.update("INSERT INTO image_asset VALUES(?)", media);
        jdbc.update("INSERT INTO image_generation(id,media_id,recipe_version,published_at,input_sha256) VALUES (?,?,'r5-fixture',now(),?)",
                generation, media, hash);
        jdbc.update("UPDATE book_media SET provider='LOCAL',serving_generation=? WHERE id=?", generation, media);
        jdbc.update("UPDATE listing SET publication_status='ARCHIVED' WHERE book_copy_id=?", bookId);
        jdbc.update("""
                INSERT INTO image_source_binding(media_id,file_id,sha256,source_version,source_bytes,mime,status,verified_at)
                VALUES (?,'fixture',?,'1',?,'image/jpeg','VERIFIED',now())
                """, media, hash, jpeg.length);
        var folder = Files.createDirectories(root.resolve("derived/" + media + "/" + generation));
        for (String name : List.of("480", "1280")) jdbc.update("""
                INSERT INTO image_variant(generation_id,name,storage_key,mime,width,height,bytes,sha256)
                VALUES (?,?,?,'image/jpeg',1,1,?,?)
                """, generation, name, "derived/" + media + "/" + generation + "/" + name + ".jpg", jpeg.length, hash);
        var good = Files.write(folder.resolve("1280.jpg"), jpeg);
        return new Media(bookId, media, generation, folder.resolve("480.jpg"), good, Files.getLastModifiedTime(good), jpeg);
    }

    private AdminHttpClient ownerApi() throws Exception {
        var api = new AdminHttpClient(port);
        api.login(owner.getEmail());
        return api;
    }
    private java.net.http.HttpResponse<String> submit(AdminHttpClient api, Media media, String mode) throws Exception {
        driveMode.set(mode);
        var response = api.send("POST", API + "/rebuild", json(Map.of("mediaIds", List.of(media.media()),
                "apply", true, "requestKey", UUID.randomUUID())), true);
        assertThat(response.statusCode()).isEqualTo(202);
        return response;
    }
    private tools.jackson.databind.JsonNode result(AdminHttpClient api, java.net.http.HttpResponse<String> accepted) throws Exception {
        String path = tree(accepted).path("statusPath").asString();
        for (int i = 0; i < 120; i++) {
            var result = tree(api.send("GET", path, null, false));
            if (!"PENDING".equals(result.path("status").asString())) return result;
            Thread.sleep(35);
        }
        throw new AssertionError("Recovery did not reach a terminal state");
    }
    private ImageTypes.JobLease claim() throws Exception {
        for (int i = 0; i < 120; i++) {
            var job = worker.claim();
            if (job.isPresent()) return job.get();
            Thread.sleep(35);
        }
        throw new AssertionError("No recovery job");
    }
    private void finish(ImageTypes.JobLease job, Media media, byte[] bytes, String digest) throws Exception {
        var output = Files.createDirectories(root.resolve("staging/" + job.token() + "/output"));
        var variants = new java.util.ArrayList<ImageTypes.Variant>();
        for (String name : List.of("480", "1280")) {
            Files.write(output.resolve(name + ".jpg"), bytes);
            variants.add(new ImageTypes.Variant(name, "derived/" + media.media() + "/" + media.generation() + "/" + name + ".jpg",
                    "image/jpeg", 1, 1, bytes.length, hash(bytes)));
        }
        var json = AdminHttpClient.JSON.valueToTree(new ImageTypes.Manifest(job.mediaId(), job.generationId(), job.recipeVersion(), variants));
        ((tools.jackson.databind.node.ObjectNode) json).put("workerDigest", digest).put("configurationDigest", CONFIG);
        worker.complete(job.jobId(), job.token(), AdminHttpClient.JSON.treeToValue(json, ImageTypes.Manifest.class));
    }
    private static String hash(byte[] bytes) throws Exception {
        return java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(bytes));
    }
}
