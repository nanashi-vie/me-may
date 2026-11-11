package vn.memay.media.source;

import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;
import vn.memay.support.PgTestData;
import static org.assertj.core.api.Assertions.*;

class DriveBatchMigrationTest {
    @Test void upgradesV30WithoutChangingBooksMediaOrAttendance() {
        String schema="drive_upgrade_"+UUID.randomUUID().toString().replace("-","");
        var db=PgTestData.jdbc(schema);
        var config=Flyway.configure().dataSource(PgTestData.requireTestJdbcUrl(System.getenv("TEST_DB_URL")),
                System.getenv("DB_USER"),System.getenv("DB_PASSWORD")).schemas(schema).defaultSchema(schema);
        try {
            config.target("30").load().migrate();
            db.update("INSERT INTO book_copy(id,book_code,title,availability) VALUES(1,'MM-000001','Preserved','AVAILABLE')");
            db.update("INSERT INTO listing(book_copy_id,slug,publication_status) VALUES(1,'preserved','ARCHIVED')");
            db.update("INSERT INTO book_media(id,book_copy_id,role,state,storage_public_id) VALUES(?,1,'FRONT','ACTIVE','cloudinary/kept')",UUID.randomUUID());
            db.update("INSERT INTO employee_profile(full_name,display_name) VALUES('Fixture Employee','Fixture')");
            var books=db.queryForList("SELECT * FROM book_copy");
            var listings=db.queryForList("SELECT * FROM listing");
            var media=db.queryForList("SELECT * FROM book_media");
            var employees=db.queryForList("SELECT * FROM employee_profile");
            var checksums=db.queryForList("SELECT version,checksum,success FROM flyway_schema_history WHERE version IS NOT NULL ORDER BY installed_rank");
            config.target(MigrationVersion.LATEST).load().migrate();
            config.load().validate();
            assertThat(db.queryForList("SELECT * FROM book_copy")).isEqualTo(books);
            assertThat(db.queryForList("SELECT * FROM listing")).isEqualTo(listings);
            assertThat(db.queryForList("SELECT * FROM book_media")).isEqualTo(media);
            assertThat(db.queryForList("SELECT * FROM employee_profile")).isEqualTo(employees);
            assertThat(db.queryForList("SELECT version,checksum,success FROM flyway_schema_history WHERE version::int<=30 ORDER BY installed_rank")).isEqualTo(checksums);
            assertThat(db.queryForObject("SELECT count(*) FROM drive_image_batch",Long.class)).isZero();
            assertThat(db.queryForObject("SELECT count(*) FROM drive_image_batch_item",Long.class)).isZero();
        } finally {PgTestData.jdbc().execute("DROP SCHEMA IF EXISTS "+schema+" CASCADE");}
    }
}
