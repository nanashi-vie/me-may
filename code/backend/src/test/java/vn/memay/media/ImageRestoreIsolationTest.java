package vn.memay.media;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import vn.memay.media.source.DriveSourceClient;
import vn.memay.media.source.SourceAccessException;
import vn.memay.support.AdminHttpClient;
import vn.memay.support.CatalogueTestSupport;
import static org.assertj.core.api.Assertions.*;
import static vn.memay.support.AdminHttpClient.*;

@DirtiesContext
@TestPropertySource(properties = {"spring.profiles.active=test,restore", "memay.media.local.enabled=true",
        "CLOUDINARY_CLOUD_NAME=restore-fixture", "CLOUDINARY_API_KEY=fixture", "CLOUDINARY_API_SECRET=fixture",
        "MEMAY_DRIVE_CREDENTIALS_FILE=/does-not-exist/isolated-fixture"})
class ImageRestoreIsolationTest extends CatalogueTestSupport {
    @TempDir static Path root;
    @Value("${local.server.port}") int port;
    @Autowired ImageJobService worker;
    @Autowired ImageJobRepository jobs;
    @Autowired MediaGateway cloud;
    @Autowired DriveSourceClient drive;
    @Autowired MediaCleanupJob cleanup;
    @Autowired MediaRecoveryMode mode;

    @DynamicPropertySource static void settings(DynamicPropertyRegistry p) {
        p.add("memay.media.local.root", () -> {
            try { return root.toRealPath().toString(); }
            catch (java.io.IOException e) { throw new java.io.UncheckedIOException(e); }
        });
    }

    @Test void restoreStartsInQuarantine() throws Exception {
        UUID media = UUID.randomUUID(), generation = UUID.randomUUID();
        Path orphan = Files.createDirectories(root.resolve("derived/" + media + "/" + generation)).resolve("480.jpg");
        Files.write(orphan, new byte[]{1, 2, 3});
        Files.write(root.resolve("derived/unmanaged.jpg"), new byte[]{4});
        UUID staged = UUID.randomUUID();
        var old = Files.createDirectories(root.resolve("staging/" + staged));
        Files.setLastModifiedTime(old, java.nio.file.attribute.FileTime.from(java.time.Instant.now().minusSeconds(7200)));
        jdbc.update("INSERT INTO image_recipe VALUES ('restore-fixture','test','{}') ON CONFLICT DO NOTHING");
        UUID job = jobs.enqueue(UUID.randomUUID(), UUID.randomUUID(), ImageTypes.JobKind.PROCESS,
                "staging/" + UUID.randomUUID() + "/input", "restore-fixture", "isolated-test:" + UUID.randomUUID(), 1000);

        try {
            var api = new AdminHttpClient(port);
            api.login(owner.getEmail());
            String path = "/api/v1/admin/image-recovery";
            var inventory = api.send("GET", path + "/inventory?scope=all&scanDisk=true", null, false);
            assertThat(inventory.statusCode()).isEqualTo(200);
            assertThat(tree(inventory).path("unexpectedDiskLayout").asBoolean()).isTrue();
            assertThat(tree(inventory).path("untracked").get(0).path("mediaId").asString()).isEqualTo(media.toString());
            assertThat(api.send("POST", path + "/rebuild", json(Map.of("scope", "all")), true).statusCode()).isEqualTo(200);
            assertThat(api.send("POST", path + "/rebuild",
                    json(Map.of("apply", true, "requestKey", UUID.randomUUID(), "scope", "all")), true).statusCode()).isEqualTo(409);
            assertThat(api.send("POST", "/api/v1/admin/upload-sessions", "{}", true).statusCode()).isEqualTo(409);
            assertThat(mode.isolated()).isTrue();
            assertThat(worker.claim()).isEmpty();
            assertThat(jdbc.queryForObject("SELECT status FROM image_job WHERE id=?", String.class, job)).isEqualTo("PENDING");
            assertThat(cloud).isInstanceOf(UnconfiguredMediaGateway.class);
            assertThatThrownBy(() -> drive.download("fixture", UUID.randomUUID()))
                    .isInstanceOfSatisfying(SourceAccessException.class, e -> assertThat(e.code()).isEqualTo("RESTORE_ISOLATED"));
            cleanup.runOnce();
            assertThat(orphan).exists();
            assertThat(old).exists();
            assertThat(jdbc.queryForObject("SELECT count(*) FROM book_media WHERE id=?", Long.class, media)).isZero();
        } finally {
            jdbc.update("DELETE FROM image_job WHERE id=?", job);
        }
    }
}
