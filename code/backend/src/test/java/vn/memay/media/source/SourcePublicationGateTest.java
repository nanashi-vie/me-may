package vn.memay.media.source;

import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import vn.memay.common.AdminApiException;
import vn.memay.media.SourceBindingRepository;
import vn.memay.support.PgTestData;
import static org.assertj.core.api.Assertions.*;

class SourcePublicationGateTest {
    @Test void requiresVerifiedHashForActiveLocalMediaOnly() {
        String schema = "source_" + UUID.randomUUID().toString().replace("-", "");
        var db = PgTestData.jdbc(schema);
        try {
            Flyway.configure().dataSource(PgTestData.requireTestJdbcUrl(System.getenv("TEST_DB_URL")),
                    System.getenv("DB_USER"), System.getenv("DB_PASSWORD")).schemas(schema).defaultSchema(schema)
                    .load().migrate();
            UUID media = UUID.randomUUID(), generation = UUID.randomUUID();
            String sha = "a".repeat(64);
            db.update("INSERT INTO book_copy(id,book_code,title,availability) VALUES(1,'MM-000001','Book','AVAILABLE')");
            db.update("INSERT INTO book_media(id,book_copy_id,role,state,storage_public_id) VALUES(?,1,'FRONT','ACTIVE','legacy')", media);
            var bindings = new SourceBindingRepository(db);
            bindings.requireVerifiedForBook(1);
            db.update("INSERT INTO image_asset VALUES(?)", media);
            db.update("INSERT INTO image_recipe VALUES('v1','fixture','{}')");
            db.update("""
                    INSERT INTO image_generation(id,media_id,recipe_version,published_at,input_sha256)
                    VALUES(?,?,'v1',now(),?)
                    """, generation, media, sha);
            db.update("UPDATE book_media SET provider='LOCAL', serving_generation=? WHERE id=?", generation, media);
            assertThatThrownBy(() -> bindings.requireVerifiedForBook(1))
                    .isInstanceOfSatisfying(AdminApiException.class, e -> assertThat(e.error).isEqualTo("image_source_unverified"));
            db.update("""
                    INSERT INTO image_source_binding(media_id,file_id,sha256,source_bytes,mime,status,verified_at)
                    VALUES(?,'file',?,3,'image/jpeg','VERIFIED',now())
                    """, media, "b".repeat(64));
            assertThatThrownBy(() -> bindings.requireVerifiedForBook(1)).isInstanceOf(AdminApiException.class);
            db.update("UPDATE image_source_binding SET sha256=? WHERE media_id=?", sha, media);
            bindings.requireVerifiedForBook(1);
        } finally {
            PgTestData.jdbc().execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
        }
    }
}
