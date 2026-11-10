package vn.memay.media;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import vn.memay.media.source.DownloadedSource;
import vn.memay.media.source.DriveSourceClient;
import vn.memay.support.AdminHttpClient;
import static org.assertj.core.api.Assertions.assertThat;
import static vn.memay.support.AdminHttpClient.tree;

@TestPropertySource(properties = {"memay.media.local.enabled=true", "memay.media.migration.initial-delay-ms=0"})
@Import(ImageMigrationPreviewTest.DriveFixture.class)
class ImageMigrationPreviewTest extends MediaTestSupport {
    private static final String PATH = "/api/v1/admin/image-migrations";
    private static final String HEADER = "media_id,book_code,role,drive_file_id,expected_book_version";
    @TempDir static Path root;
    @Value("${local.server.port}") int port;
    @Autowired ImageJobService worker;

    @DynamicPropertySource static void settings(DynamicPropertyRegistry registry) {
        registry.add("memay.media.local.root", () -> {
            try { return root.toRealPath().toString(); }
            catch (java.io.IOException e) { throw new java.io.UncheckedIOException(e); }
        });
    }

    @TestConfiguration
    static class DriveFixture {
        @Bean @Primary DriveSourceClient migrationDrive(LocalImageStore store) {
            return (file, operation) -> {
                try {
                    var staged = store.stage(operation, new java.io.ByteArrayInputStream(ImageValidatorTest.image("jpeg")));
                    return new DownloadedSource(staged.key(), staged.sha256(), staged.bytes(), "image/jpeg", "fixture-v1");
                } catch (Exception e) {
                    throw new IllegalStateException(e);
                }
            };
        }
    }

    @Test void manifestIsGuardedAndDryRunDoesNotChangeBookOrAsset() throws Exception {
        var book = ready();
        long bookId = Long.parseLong(book.id());
        var front = mediaId(bookId, "FRONT");
        var back = mediaId(bookId, "BACK");
        var inside = mediaId(bookId, "INSIDE_1");
        var before = snapshot(bookId);
        var ownerApi = new AdminHttpClient(port);
        ownerApi.login(owner.getEmail());
        assertThat(ownerApi.send("GET", PATH + "/template", null, false).body()).startsWith(HEADER).contains(front.toString());
        var rejected = upload(ownerApi, String.join("\n", java.util.Collections.nCopies(101,
                line(front, book.bookCode(), "FRONT", "file", book.version()))), true);
        assertThat(rejected.statusCode()).isEqualTo(422);
        var response = upload(ownerApi, String.join("\n",
                line(front, book.bookCode(), "FRONT", "file", book.version()),
                line(front, book.bookCode(), "FRONT", "file", book.version()),
                line(UUID.randomUUID(), book.bookCode(), "FRONT", "file", book.version()),
                line(back, book.bookCode(), "FRONT", "file", book.version()),
                line(inside, book.bookCode(), "INSIDE_1", "file", book.version() + 1),
                line(UUID.randomUUID(), book.bookCode(), "FRONT", "", book.version())), true);
        assertThat(response.statusCode()).isEqualTo(202);
        var receipt = tree(response).path("receiptId").asString();
        var result = tree(ownerApi.send("GET", PATH + "/" + receipt, null, false));
        assertThat(result.path("digest").asString()).matches("[a-f0-9]{64}");
        assertThat(result.path("rows").values().stream().map(row -> row.path("errorCode").asString()).toList())
                .containsExactly("duplicate_media_id", "duplicate_media_id", "media_not_eligible",
                        "role_mismatch", "book_version_conflict", "missing_drive_file_id");
        assertThat(snapshot(bookId)).isEqualTo(before);
    }

    @Test void previewIsOwnerOnlyAndExpires() throws Exception {
        var book = ready();
        long bookId = Long.parseLong(book.id());
        var id = mediaId(bookId, "FRONT");
        var before = snapshot(bookId);
        var key = jdbc.queryForObject("SELECT storage_public_id FROM book_media WHERE id=?", String.class, id);
        byte[] jpeg = ImageValidatorTest.image("jpeg");
        fake.assets.put(key, jpeg);
        var anonymous = new AdminHttpClient(port);
        assertThat(anonymous.send("GET", PATH + "/template", null, false).statusCode()).isEqualTo(401);
        var staffApi = new AdminHttpClient(port);
        staffApi.login(staff.getEmail());
        assertThat(staffApi.send("GET", PATH + "/template", null, false).statusCode()).isEqualTo(403);
        var api = new AdminHttpClient(port);
        api.login(owner.getEmail());
        String line = line(id, book.bookCode(), "FRONT", "file", book.version());
        assertThat(upload(api, line, false).statusCode()).isEqualTo(403);
        var response = upload(api, line, true);
        assertThat(response.statusCode()).isEqualTo(202);
        var receipt = UUID.fromString(tree(response).path("receiptId").asString());
        var expiredLease = awaitWorker();
        jdbc.update("UPDATE image_migration_row SET lease_until=now()-interval '1 second' WHERE id=?", expiredLease.jobId());
        var job = awaitWorker();
        assertThat(job.jobId()).isEqualTo(expiredLease.jobId());
        assertThat(job.token()).isNotEqualTo(expiredLease.token());
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> worker.heartbeat(job.jobId(), expiredLease.token()))
                .isInstanceOfSatisfying(vn.memay.common.AdminApiException.class, error -> assertThat(error.status).isEqualTo(409));
        String name = "480.jpg";
        var directory = Files.createDirectories(root.resolve("staging/" + job.token() + "/output"));
        Files.write(directory.resolve(name), jpeg);
        String hash = java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(jpeg));
        worker.complete(job.jobId(), job.token(), new ImageTypes.Manifest(job.mediaId(), job.generationId(), job.recipeVersion(),
                List.of(new ImageTypes.Variant("480", "derived/" + job.mediaId() + "/" + job.generationId() + "/" + name,
                        "image/jpeg", 1, 1, jpeg.length, hash))));
        String receiptPath = PATH + "/" + receipt;
        var result = api.send("GET", receiptPath, null, false);
        assertThat(result.body()).doesNotContain(key, "staging/", "derived/", "signed");
        var row = tree(result).path("rows").get(0);
        assertThat(row.path("sourceSha256").asString()).isEqualTo(hash);
        var preview = row.path("previewPath").asString();
        var previous = row.path("currentPhotoPath").asString();
        assertThat(staffApi.download(preview).statusCode()).isEqualTo(403);
        assertThat(staffApi.download(previous).statusCode()).isEqualTo(403);
        assertThat(api.download(preview).body()).isEqualTo(jpeg);
        assertThat(api.download(previous).body()).isEqualTo(jpeg);
        assertThat(api.download(preview).headers().firstValue("Cache-Control")).hasValue("no-store");
        assertThat(snapshot(bookId)).isEqualTo(before);
        var old = java.nio.file.attribute.FileTime.from(java.time.Instant.now().minusSeconds(7200));
        var stagedPreview = directory.getParent();
        var stagedOriginal = root.resolve(job.inputKey()).getParent();
        Files.setLastModifiedTime(stagedPreview, old);
        Files.setLastModifiedTime(stagedOriginal, old);
        cleanup.runOnce();
        assertThat(stagedPreview).exists();
        assertThat(stagedOriginal).exists();
        jdbc.update("UPDATE image_migration_receipt SET expires_at=now()-interval '1 second' WHERE id=?", receipt);
        cleanup.runOnce();
        assertThat(stagedPreview).doesNotExist();
        assertThat(stagedOriginal).doesNotExist();
        assertThat(api.send("GET", receiptPath, null, false).statusCode()).isEqualTo(410);
        assertThat(api.download(preview).statusCode()).isEqualTo(410);
    }

    private ImageTypes.JobLease awaitWorker() throws Exception {
        long deadline = System.nanoTime() + java.time.Duration.ofSeconds(8).toNanos();
        do {
            var job = worker.claim();
            if (job.isPresent()) return job.get();
            Thread.sleep(30);
        } while (System.nanoTime() < deadline);
        throw new AssertionError("Preview job never became ready for Sharp");
    }

    private UUID mediaId(long book, String role) {
        return jdbc.queryForObject("SELECT id FROM book_media WHERE book_copy_id=? AND role=?", UUID.class, book, role);
    }

    private List<Object> snapshot(long book) {
        return List.of(jdbc.queryForMap("SELECT * FROM book_copy WHERE id=?", book),
                jdbc.queryForList("SELECT * FROM book_media WHERE book_copy_id=? ORDER BY id", book),
                jdbc.queryForObject("SELECT count(*) FROM image_asset a JOIN book_media m ON m.id=a.media_id WHERE m.book_copy_id=?", Long.class, book));
    }

    private static String line(UUID media, String code, String role, String file, long version) {
        return String.join(",", media.toString(), code, role, file, Long.toString(version));
    }

    private static java.net.http.HttpResponse<String> upload(AdminHttpClient api, String body, boolean csrf) throws Exception {
        return api.multipart(PATH + "/preview", "mapping.csv", (HEADER + "\n" + body).getBytes(StandardCharsets.UTF_8), Map.of(), csrf);
    }
}
