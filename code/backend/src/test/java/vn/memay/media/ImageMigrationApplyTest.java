package vn.memay.media;

import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HexFormat;
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
import vn.memay.catalogue.BookDtos.BookDetail;
import vn.memay.media.source.DownloadedSource;
import vn.memay.media.source.DriveSourceClient;
import vn.memay.support.AdminHttpClient;
import static org.assertj.core.api.Assertions.assertThat;
import static vn.memay.support.AdminHttpClient.*;

@TestPropertySource(properties = {"memay.media.local.enabled=true", "memay.media.migration.apply-delay-ms=100"})
@Import(ImageMigrationApplyTest.Fixture.class)
@DirtiesContext
class ImageMigrationApplyTest extends MediaTestSupport {
    private static final String API = "/api/v1/admin/image-migrations/";
    @TempDir static Path root;
    @Value("${local.server.port}") int port;
    @Autowired ImageJobService worker;
    @Autowired AtomicReference<String> sourceVersion;

    @DynamicPropertySource static void settings(DynamicPropertyRegistry properties) {
        properties.add("memay.media.local.root", () -> {
            try { return root.toRealPath().toString(); }
            catch (java.io.IOException e) { throw new java.io.UncheckedIOException(e); }
        });
    }

    @TestConfiguration
    static class Fixture {
        @Bean AtomicReference<String> sourceVersion() { return new AtomicReference<>("1"); }
        @Bean @Primary DriveSourceClient migrationDrive(LocalImageStore store, AtomicReference<String> version) {
            return (file, id) -> {
                try {
                    var staged = store.stage(id, new java.io.ByteArrayInputStream(ImageValidatorTest.image("jpeg")));
                    return new DownloadedSource(staged.key(), staged.sha256(), staged.bytes(), "image/jpeg",
                            file.equals("changing") ? version.get() : "1");
                } catch (Exception e) { throw new IllegalStateException(e); }
            };
        }
    }

    @Test void changedSourceOrBookRejectsApplyWhileOtherBooksCanFinish() throws Exception {
        var api = ownerApi();
        var stale = ready();
        var staleReceipt = receipt(stale, List.of("FRONT"), "same");
        var staleBody = applyBody(api, staleReceipt, ids(stale, "FRONT"));
        jdbc.update("UPDATE book_copy SET version=version+1 WHERE id=?", Long.parseLong(stale.id()));
        assertThat(api.send("POST", API + staleReceipt + "/apply", staleBody, true).statusCode()).isEqualTo(409);

        var changed = ready();
        var valid = ready();
        var receipt = receipt(changed, List.of("FRONT"), "changing");
        addRows(receipt, valid, List.of("FRONT"), "same", 3);
        sourceVersion.set("2");
        var response = api.send("POST", API + receipt + "/apply",
                applyBody(api, receipt, List.of(ids(changed, "FRONT").getFirst(), ids(valid, "FRONT").getFirst())), true);
        assertThat(response.statusCode()).isEqualTo(202);
        var path = tree(response).path("statusPath").asString();
        finish(claim());
        var result = awaitStatus(api, path, "PARTIAL");
        assertThat(result.path("books").get(0).path("errorCode").asString()).isEqualTo("source_changed");
        assertThat(provider(ids(changed, "FRONT").getFirst())).isEqualTo("CLOUDINARY");
        assertThat(provider(ids(valid, "FRONT").getFirst())).isEqualTo("LOCAL");
    }

    @Test void sameBookCommitsOnceAndRollbackProtectsSubsequentEdits() throws Exception {
        var api = ownerApi();
        var book = ready();
        var selected = ids(book, "FRONT", "BACK");
        var priorMedia = selected.getFirst();
        var priorHash = "b".repeat(64);
        jdbc.update("INSERT INTO image_asset VALUES(?)", priorMedia);
        jdbc.update("""
                INSERT INTO image_source_binding(media_id,file_id,sha256,source_version,source_bytes,mime,status,binding_version,verified_at)
                VALUES (?,'old-file',?,'old-version',7,'image/jpeg','VERIFIED',4,now())
                """, priorMedia, priorHash);
        var receipt = receipt(book, List.of("FRONT", "BACK"), "same");
        String body = applyBody(api, receipt, selected);
        var staffApi = new AdminHttpClient(port);
        staffApi.login(staff.getEmail());
        assertThat(staffApi.send("POST", API + receipt + "/apply", body, true).statusCode()).isEqualTo(403);
        assertThat(api.send("POST", API + receipt + "/apply", body, false).statusCode()).isEqualTo(403);
        var accepted = api.send("POST", API + receipt + "/apply", body, true);
        assertThat(accepted.statusCode()).isEqualTo(202);
        var path = tree(accepted).path("statusPath").asString();
        assertThat(tree(api.send("POST", API + receipt + "/apply", body, true)).path("operationId"))
                .isEqualTo(tree(accepted).path("operationId"));
        finish(claim());
        assertThat(selected).allMatch(id -> provider(id).equals("CLOUDINARY"));
        finish(claim());
        awaitStatus(api, path, "APPLIED");
        assertThat(selected).allMatch(id -> provider(id).equals("LOCAL"));
        assertThat(version(book)).isEqualTo(book.version() + 1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM audit_event WHERE target_id=? AND action='IMAGE_MIGRATION_APPLIED'",
                Long.class, Long.parseLong(book.id()))).isEqualTo(1L);
        String bad = json(Map.of("requestKey", UUID.randomUUID(), "expectedBookVersions", Map.of(book.id(), book.version())));
        assertThat(api.send("POST", API + receipt + "/rollback", bad, true).statusCode()).isEqualTo(409);
        String good = json(Map.of("requestKey", UUID.randomUUID(), "expectedBookVersions", Map.of(book.id(), book.version() + 1)));
        assertThat(api.send("POST", API + receipt + "/rollback", good, true).statusCode()).isEqualTo(200);
        assertThat(api.send("POST", API + receipt + "/rollback", good, true).statusCode()).isEqualTo(200);
        assertThat(selected).allMatch(id -> provider(id).equals("CLOUDINARY"));
        assertThat(version(book)).isEqualTo(book.version() + 2);
        assertThat(provider(ids(book, "INSIDE_1").getFirst())).isEqualTo("CLOUDINARY");
        assertThat(jdbc.queryForObject("SELECT sha256 FROM image_source_binding WHERE media_id=?", String.class, priorMedia))
                .isEqualTo(priorHash);
        assertThat(jdbc.queryForObject("SELECT binding_version FROM image_source_binding WHERE media_id=?", Long.class, priorMedia))
                .isEqualTo(6L);
        jdbc.update("UPDATE image_migration_apply_book SET updated_at=now()-interval '2 hours' WHERE book_id=?",
                Long.parseLong(book.id()));
        cleanup.runOnce();
        assertThat(jdbc.queryForObject("""
                SELECT count(*) FROM image_generation WHERE media_id IN (?,?)
                """, Long.class, selected.get(0), selected.get(1))).isZero();
        assertThat(provider(priorMedia)).isEqualTo("CLOUDINARY");
    }

    @Test void rollbackDoesNotLoseAnUploadAddedAfterMigration() throws Exception {
        var api = ownerApi();
        var book = ready();
        UUID original = ids(book, "FRONT").getFirst();
        UUID receipt = receipt(book, List.of("FRONT"), "same");
        var accepted = api.send("POST", API + receipt + "/apply", applyBody(api, receipt, List.of(original)), true);
        assertThat(accepted.statusCode()).isEqualTo(202);
        var job = claim();
        finish(job);
        awaitStatus(api, tree(accepted).path("statusPath").asString(), "APPLIED");

        long bookId = Long.parseLong(book.id());
        UUID uploaded = UUID.randomUUID(), generation = UUID.randomUUID();
        jdbc.update("INSERT INTO image_asset VALUES(?)", uploaded);
        jdbc.update("INSERT INTO image_generation(id,media_id,recipe_version,published_at) VALUES (?,?,'v1',now())",
                generation, uploaded);
        jdbc.update("""
                INSERT INTO book_media(id,book_copy_id,role,state,storage_public_id,provider,serving_generation)
                VALUES (?,?,'INSIDE_2','ACTIVE',?,'LOCAL',?)
                """, uploaded, bookId, "local/" + uploaded, generation);
        jdbc.update("UPDATE book_copy SET version=version+1 WHERE id=?", bookId);
        String request = json(Map.of("requestKey", UUID.randomUUID(),
                "expectedBookVersions", Map.of(book.id(), book.version() + 1)));
        assertThat(api.send("POST", API + receipt + "/rollback", request, true).statusCode()).isEqualTo(409);
        assertThat(provider(original)).isEqualTo("LOCAL");
        assertThat(provider(uploaded)).isEqualTo("LOCAL");
        assertThat(jdbc.queryForObject("SELECT serving_generation FROM book_media WHERE id=?", UUID.class, uploaded))
                .isEqualTo(generation);
        assertThat(version(book)).isEqualTo(book.version() + 2);
    }

    @Test void missingWorkerJobFailsTheBookInsteadOfLeavingItPending() throws Exception {
        var api = ownerApi();
        var book = ready();
        UUID media = ids(book, "FRONT").getFirst();
        var receipt = receipt(book, List.of("FRONT"), "same");
        var accepted = api.send("POST", API + receipt + "/apply", applyBody(api, receipt, List.of(media)), true);
        assertThat(accepted.statusCode()).isEqualTo(202);
        var job = claim();
        jdbc.update("DELETE FROM image_job WHERE id=?", job.jobId());
        var failed = awaitStatus(api, tree(accepted).path("statusPath").asString(), "FAILED");
        assertThat(failed.path("books").get(0).path("errorCode").asString()).isEqualTo("image_job_missing");
        assertThat(provider(media)).isEqualTo("CLOUDINARY");
        assertThat(version(book)).isEqualTo(book.version());
    }

    private AdminHttpClient ownerApi() throws Exception {
        var api = new AdminHttpClient(port);
        api.login(owner.getEmail());
        return api;
    }

    private UUID receipt(BookDetail book, List<String> roles, String file) throws Exception {
        jdbc.update("INSERT INTO image_recipe VALUES('v1','fixture','{}') ON CONFLICT DO NOTHING");
        UUID receipt = UUID.randomUUID();
        jdbc.update("INSERT INTO image_migration_receipt(id,actor_id,recipe_version) VALUES (?,?,'v1')", receipt, owner.getId());
        addRows(receipt, book, roles, file, 2);
        return receipt;
    }

    private void addRows(UUID receipt, BookDetail book, List<String> roles, String file, int line) throws Exception {
        byte[] jpeg = ImageValidatorTest.image("jpeg");
        for (String role : roles) {
            var media = ids(book, role).getFirst();
            String key = jdbc.queryForObject("SELECT storage_public_id FROM book_media WHERE id=?", String.class, media);
            jdbc.update("""
                    INSERT INTO image_migration_row(id,receipt_id,line,media_id,book_id,book_code,role,book_version,
                        file_id,cloud_key,state,source_sha256,source_version,source_mime,source_bytes)
                    VALUES (?,?,?,?,?,?,?,?,?,?,'READY',?,'1','image/jpeg',?)
                    """, UUID.randomUUID(), receipt, line++, media, Long.parseLong(book.id()), book.bookCode(),
                    role, book.version(), file, key, hash(jpeg), jpeg.length);
        }
    }

    private String applyBody(AdminHttpClient api, UUID receipt, List<UUID> selected) throws Exception {
        var preview = tree(api.send("GET", API + receipt, null, false));
        return json(Map.of("digest", preview.path("digest").asString(), "requestKey", UUID.randomUUID(),
                "confirmedMediaIds", selected));
    }

    private tools.jackson.databind.JsonNode awaitStatus(AdminHttpClient api, String path, String status) throws Exception {
        long deadline = System.nanoTime() + java.time.Duration.ofSeconds(12).toNanos();
        do {
            var result = tree(api.send("GET", path, null, false));
            if (status.equals(result.path("status").asString())) return result;
            Thread.sleep(40);
        } while (System.nanoTime() < deadline);
        throw new AssertionError(api.send("GET", path, null, false).body());
    }

    private ImageTypes.JobLease claim() throws Exception {
        long deadline = System.nanoTime() + java.time.Duration.ofSeconds(12).toNanos();
        do {
            var job = worker.claim();
            if (job.isPresent()) return job.get();
            Thread.sleep(30);
        } while (System.nanoTime() < deadline);
        throw new AssertionError("Migration job was not queued");
    }

    private void finish(ImageTypes.JobLease lease) throws Exception {
        assertThat(lease.kind()).isEqualTo(ImageTypes.JobKind.MIGRATE);
        var variants = new ArrayList<ImageTypes.Variant>();
        var output = Files.createDirectories(root.resolve("staging/" + lease.token() + "/output"));
        byte[] jpeg = ImageValidatorTest.image("jpeg");
        byte[] webp = java.util.Base64.getDecoder().decode("UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA");
        for (int size : List.of(320, 480, 640, 1280, 1400)) {
            for (String format : size == 1280 ? List.of("jpg") : List.of("jpg", "webp")) {
                byte[] image = format.equals("jpg") ? jpeg : webp;
                String name = size + "." + format;
                Files.write(output.resolve(name), image);
                variants.add(new ImageTypes.Variant(Integer.toString(size),
                        "derived/" + lease.mediaId() + "/" + lease.generationId() + "/" + name,
                        format.equals("jpg") ? "image/jpeg" : "image/webp", 1, 1, image.length, hash(image)));
            }
        }
        worker.complete(lease.jobId(), lease.token(),
                new ImageTypes.Manifest(lease.mediaId(), lease.generationId(), lease.recipeVersion(), variants));
    }

    private List<UUID> ids(BookDetail book, String... roles) {
        return java.util.Arrays.stream(roles).map(role -> jdbc.queryForObject(
                "SELECT id FROM book_media WHERE book_copy_id=? AND role=?", UUID.class, Long.parseLong(book.id()), role)).toList();
    }
    private long version(BookDetail book) {
        return jdbc.queryForObject("SELECT version FROM book_copy WHERE id=?", Long.class, Long.parseLong(book.id()));
    }
    private String provider(UUID id) {
        return jdbc.queryForObject("SELECT provider FROM book_media WHERE id=?", String.class, id);
    }
    private static String hash(byte[] image) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(image));
    }
}
