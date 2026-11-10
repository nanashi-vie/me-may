package vn.memay.media;

import java.util.UUID;
import java.util.List;
import java.nio.file.Path;
import java.nio.file.Files;
import java.util.HexFormat;
import java.security.MessageDigest;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import vn.memay.media.ImageTypes.Manifest;
import vn.memay.media.ImageTypes.Variant;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import vn.memay.common.AdminApiException;
import vn.memay.media.ImageTypes.JobKind;
import vn.memay.support.PgTestData;
import static org.assertj.core.api.Assertions.*;

class ImageJobLeaseTest {
    @TempDir Path root;

    @Test void expiredLeaseCannotChangeJobAndThirdFailureIsTerminal() throws Exception {
        String schema = "lease_" + UUID.randomUUID().toString().replace("-", "");
        var db = PgTestData.jdbc(schema);
        var config = Flyway.configure()
                .dataSource(PgTestData.requireTestJdbcUrl(System.getenv("TEST_DB_URL")),
                        System.getenv("DB_USER"), System.getenv("DB_PASSWORD"))
                .schemas(schema).defaultSchema(schema);
        try {
            config.load().migrate();
            db.update("INSERT INTO image_recipe VALUES('v1','test','{}')");
            var jobs = new ImageJobRepository(db);
            UUID media = UUID.randomUUID(), generation = UUID.randomUUID();
            String input = "staging/" + UUID.randomUUID() + "/input";
            UUID id = jobs.enqueue(media, generation, JobKind.PROCESS, input, "v1", "test", 0);
            assertThat(jobs.enqueue(media, generation, JobKind.PROCESS, input, "v1", "test", 0)).isEqualTo(id);
            var first = jobs.claim().orElseThrow();
            assertThat(jobs.claim()).isEmpty();
            db.update("UPDATE image_job SET lease_until=now()-interval '1 second' WHERE id=?", id);
            var second = new ImageJobRepository(db).claim().orElseThrow();
            assertThat(second.token()).isNotEqualTo(first.token());
            assertThatThrownBy(() -> jobs.heartbeat(id, first.token())).isInstanceOf(AdminApiException.class);
            assertThat(jobs.heartbeat(id, second.token())).isAfter(second.expiresAt());
            jobs.fail(id, second.token(), "worker_failed", true);
            assertThat(jobs.claim()).isEmpty();
            db.update("UPDATE image_job SET available_at=now()-interval '1 second' WHERE id=?", id);
            var third = jobs.claim().orElseThrow();
            jobs.fail(id, third.token(), "worker_failed", true);
            assertThat(db.queryForObject("SELECT status FROM image_job WHERE id=?", String.class, id)).isEqualTo("FAILED");
            assertThat(jobs.claim()).isEmpty();

            var service = new ImageJobService(jobs, new LocalImageStore(root.toRealPath()),
                    org.mockito.Mockito.mock(ImageMigrationPreviewQueue.class));
            var tx = new TransactionTemplate(new DataSourceTransactionManager(db.getDataSource()));
            UUID session = UUID.randomUUID(), upload = UUID.randomUUID(), version = UUID.randomUUID();
            long owner = db.queryForObject("""
                    INSERT INTO admin_user(email,password_hash,role) VALUES('lease@example.test','fixture','OWNER')
                    RETURNING id
                    """, Long.class);
            db.update("""
                    INSERT INTO upload_session(id,owner_id,created_at,expires_at)
                    VALUES(?,?,now(),now()+interval '1 hour')
                    """, session, owner);
            db.update("""
                    INSERT INTO temporary_media(id,session_id,state,storage_public_id,created_at,updated_at,delete_after)
                    VALUES(?,?,'UPLOADING','fixture',now(),now(),now()+interval '1 hour')
                    """, upload, session);
            var staged = new LocalImageStore(root.toRealPath()).stage(UUID.randomUUID(),
                    new java.io.ByteArrayInputStream(ImageValidatorTest.image("jpeg")));
            UUID work = service.enqueue(upload, version, JobKind.PROCESS, staged.key(), "v1", "completion", 0);
            var expired = service.claim().orElseThrow();
            db.update("UPDATE image_job SET lease_until=now()-interval '1 second' WHERE id=?", work);
            var active = service.claim().orElseThrow();
            var output = Files.createDirectories(root.resolve("staging/" + active.token() + "/output"));
            byte[] image = ImageValidatorTest.image("jpeg");
            Files.write(output.resolve("320.jpg"), image);
            String key = "derived/" + upload + "/" + version + "/320.jpg";
            var manifest = new Manifest(upload, version, "v1", List.of(new Variant("320", key, "image/jpeg",
                    1, 1, image.length, HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(image)))));
            assertThatThrownBy(() -> tx.executeWithoutResult(t -> service.complete(work, expired.token(), manifest)))
                    .isInstanceOfSatisfying(AdminApiException.class, e -> assertThat(e.status).isEqualTo(409));
            assertThat(root.resolve(key)).doesNotExist();
            tx.executeWithoutResult(t -> service.complete(work, active.token(), manifest));
            assertThat(root.resolve(key)).hasBinaryContent(image);
            assertThat(db.queryForObject("SELECT status FROM image_job WHERE id=?", String.class, work))
                    .isEqualTo("READY");
            assertThat(db.queryForObject("SELECT storage_key FROM image_variant WHERE generation_id=?", String.class,
                    version)).isEqualTo(key);
        } finally {
            PgTestData.jdbc().execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
        }
    }
}
