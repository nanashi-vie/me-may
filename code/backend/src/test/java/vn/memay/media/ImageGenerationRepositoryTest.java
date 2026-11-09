package vn.memay.media;

import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import vn.memay.support.PgTestData;
import static org.assertj.core.api.Assertions.*;

class ImageGenerationRepositoryTest {
    @Test void rolledBackSwitchKeepsOldGenerationAndReportsUnservedOutput() {
        String schema = "images_" + UUID.randomUUID().toString().replace("-", "");
        var db = PgTestData.jdbc(schema);
        var config = Flyway.configure()
                .dataSource(PgTestData.requireTestJdbcUrl(System.getenv("TEST_DB_URL")),
                        System.getenv("DB_USER"), System.getenv("DB_PASSWORD"))
                .schemas(schema).defaultSchema(schema);
        try {
            config.target("21").load().migrate();
            UUID media = UUID.randomUUID(), old = UUID.randomUUID(), next = UUID.randomUUID();
            db.update("INSERT INTO book_copy(id,book_code,title,availability) VALUES(1,'MM-000001','Legacy','AVAILABLE')");
            db.update("INSERT INTO book_media(id,book_copy_id,role,state,storage_public_id) VALUES(?,1,'FRONT','ACTIVE','legacy')", media);
            config.target("22").load().migrate();
            assertThat(db.queryForMap("SELECT provider,storage_public_id FROM book_media WHERE id=?", media))
                    .containsEntry("provider", "CLOUDINARY").containsEntry("storage_public_id", "legacy");
            db.update("INSERT INTO image_asset(media_id) VALUES(?)", media);
            db.update("INSERT INTO image_recipe VALUES('v1','test-digest','{}')");
            for (UUID generation : new UUID[]{old, next}) {
                db.update("INSERT INTO image_generation(id,media_id,recipe_version,published_at) VALUES(?,?,'v1',now())",
                        generation, media);
            }
            var repo = new ImageGenerationRepository(db);
            assertThat(repo.switchGeneration(media, null, old)).isTrue();
            new TransactionTemplate(new DataSourceTransactionManager(db.getDataSource())).executeWithoutResult(tx -> {
                assertThat(repo.switchGeneration(media, old, next)).isTrue();
                tx.setRollbackOnly();
            });
            assertThat(repo.currentGeneration(media)).isEqualTo(old);
            assertThat(repo.unservedPublishedGenerations()).containsExactly(next);
            assertThat(repo.switchGeneration(media, null, next)).isFalse();
        } finally {
            PgTestData.jdbc().execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
        }
    }
}
