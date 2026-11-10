package vn.memay.media.source;

import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;
import vn.memay.auth.AdminUser;
import vn.memay.common.AdminApiException;
import vn.memay.media.ImageJobRepository;
import vn.memay.media.SourceBindingRepository;
import vn.memay.support.PgTestData;
import static org.assertj.core.api.Assertions.*;

class SourceBindingIntegrationTest {
    @Test void matchingBytesCommitOnceAndFailuresKeepPriorBinding() {
        String schema = "verify_" + UUID.randomUUID().toString().replace("-", "");
        JdbcTemplate db = PgTestData.jdbc(schema);
        try {
            Flyway.configure().dataSource(PgTestData.requireTestJdbcUrl(System.getenv("TEST_DB_URL")),
                    System.getenv("DB_USER"), System.getenv("DB_PASSWORD")).schemas(schema).defaultSchema(schema)
                    .load().migrate();
            var tx = new TransactionTemplate(new DataSourceTransactionManager(db.getDataSource()));
            var actor = new AdminUser("owner@source.test", "fixture", AdminUser.Role.OWNER);
            long owner = db.queryForObject("""
                    INSERT INTO admin_user(email,password_hash,role) VALUES('owner@source.test','fixture','OWNER')
                    RETURNING id
                    """, Long.class);
            ReflectionTestUtils.setField(actor, "id", owner);
            var jobs = new ImageJobRepository(db);
            var repo = new SourceBindingRepository(db);
            var service = new SourceBindingService(db, repo, jobs, new ObjectMapper());
            UUID media = UUID.randomUUID(), generation = UUID.randomUUID();
            String hash = "a".repeat(64);
            db.update("INSERT INTO book_copy(id,book_code,title,availability) VALUES(1,'MM-000001','Book','AVAILABLE')");
            db.update("INSERT INTO image_asset VALUES(?)", media);
            db.update("INSERT INTO image_recipe VALUES('v1','fixture','{}')");
            db.update("""
                    INSERT INTO image_generation(id,media_id,recipe_version,published_at,input_sha256)
                    VALUES(?,?,'v1',now(),?)
                    """, generation, media, hash);
            db.update("""
                    INSERT INTO book_media(id,book_copy_id,role,state,storage_public_id,provider,serving_generation)
                    VALUES(?,1,'FRONT','ACTIVE','local','LOCAL',?)
                    """, media, generation);
            UUID key = UUID.randomUUID();
            UUID first = tx.execute(t -> service.verify(media, "file-1", 0, 0L, key, actor));
            UUID replay = tx.execute(t -> service.verify(media, "file-1", 0, 0L, key, actor));
            assertThat(replay).isEqualTo(first);
            assertThat(jobs.claim()).isEmpty();
            var lease = jobs.claimVerification().orElseThrow();
            var matching = new DownloadedSource("fixture", hash, 3, "image/jpeg", "1");
            var different = new DownloadedSource("fixture", "b".repeat(64), 3, "image/jpeg", "1");
            assertThatThrownBy(() -> tx.executeWithoutResult(t -> service.complete(lease, different)))
                    .isInstanceOfSatisfying(AdminApiException.class, e -> assertThat(e.error).isEqualTo("source_hash_mismatch"));
            assertThat(repo.find(media)).isEmpty();
            tx.executeWithoutResult(t -> service.complete(lease, matching));
            assertThat(repo.find(media).orElseThrow().fileId()).isEqualTo("file-1");
            assertThat(repo.find(media).orElseThrow().bindingVersion()).isEqualTo(1);
            assertThat(db.queryForObject("SELECT version FROM book_copy WHERE id=1", Long.class)).isEqualTo(1);
            assertThat(db.queryForObject("SELECT after_data::text FROM audit_event", String.class)).doesNotContain("file-1");

            tx.execute(t -> service.verify(media, "file-2", 1, 1L, UUID.randomUUID(), actor));
            var second = jobs.claimVerification().orElseThrow();
            db.execute("ALTER TABLE audit_event ADD CONSTRAINT reject_verification CHECK (action <> 'SOURCE_VERIFIED') NOT VALID");
            assertThatThrownBy(() -> tx.executeWithoutResult(t -> service.complete(second, matching)))
                    .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
            assertThat(repo.find(media).orElseThrow().fileId()).isEqualTo("file-1");
            assertThat(db.queryForObject("SELECT version FROM book_copy WHERE id=1", Long.class)).isEqualTo(1);
            db.execute("ALTER TABLE audit_event DROP CONSTRAINT reject_verification");
            db.update("UPDATE book_copy SET version=version+1 WHERE id=1");
            assertThatThrownBy(() -> tx.executeWithoutResult(t -> service.complete(second, matching)))
                    .isInstanceOfSatisfying(AdminApiException.class, e -> assertThat(e.error).isEqualTo("source_binding_conflict"));
            db.update("UPDATE admin_user SET active=false WHERE id=?", owner);
            assertThatThrownBy(() -> tx.executeWithoutResult(t -> service.complete(second, matching)))
                    .isInstanceOfSatisfying(AdminApiException.class, e -> assertThat(e.status).isEqualTo(403));
            assertThat(repo.find(media).orElseThrow().fileId()).isEqualTo("file-1");

            db.update("UPDATE admin_user SET active=true WHERE id=?", owner);
            UUID session = UUID.randomUUID(), temporary = UUID.randomUUID(), tempGeneration = UUID.randomUUID();
            db.update("""
                    INSERT INTO upload_session(id,owner_id,created_at,expires_at)
                    VALUES(?,?,now(),now()+interval '1 hour')
                    """, session, owner);
            db.update("""
                    INSERT INTO temporary_media(id,session_id,state,storage_public_id,created_at,updated_at,delete_after)
                    VALUES(?,?,'UPLOADING','temp-fixture',now(),now(),now()+interval '1 hour')
                    """, temporary, session);
            db.update("INSERT INTO image_asset VALUES(?)", temporary);
            db.update("""
                    INSERT INTO image_generation(id,media_id,recipe_version,published_at,input_sha256)
                    VALUES(?,?,'v1',now(),?)
                    """, tempGeneration, temporary, hash);
            tx.execute(t -> service.verify(temporary, "file-3", 0, null, UUID.randomUUID(), actor));
            var tempLease = jobs.claimVerification().orElseThrow();
            assertThat(tempLease.mediaId()).isEqualTo(temporary);
            db.update("""
                    UPDATE upload_session SET created_at=now()-interval '2 hours',
                    expires_at=now()-interval '1 hour' WHERE id=?
                    """, session);
            assertThatThrownBy(() -> tx.executeWithoutResult(t -> service.complete(tempLease, matching)))
                    .isInstanceOfSatisfying(AdminApiException.class, e -> assertThat(e.status).isEqualTo(404));
            assertThat(repo.find(temporary)).isEmpty();
        } finally {
            PgTestData.jdbc().execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
        }
    }
}
