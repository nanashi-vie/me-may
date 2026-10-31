package vn.memay.catalogue;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;
import vn.memay.support.PgTestData;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;

class BookImportMigrationTest {
    @Test void addsReceiptsWithoutChangingExistingBooks() {
        String schema="imports_"+UUID.randomUUID().toString().replace("-","");var jdbc=PgTestData.jdbc(schema);
        var config=Flyway.configure().dataSource(PgTestData.requireTestJdbcUrl(System.getenv("TEST_DB_URL")),System.getenv("DB_USER"),System.getenv("DB_PASSWORD")).schemas(schema).defaultSchema(schema);
        try {
            config.target("10").load().migrate();
            jdbc.update("insert into book_copy(id,book_code,title,availability) values(1,'MM-000001','Old book','AVAILABLE')");
            jdbc.update("insert into listing(book_copy_id,slug,publication_status,published_at) values(1,'keep-url','PUBLISHED','2026-10-01T00:00:00Z')");
            var before=jdbc.queryForList("select b.*,l.slug,l.published_at from book_copy b join listing l on l.book_copy_id=b.id");
            config.target(MigrationVersion.LATEST).load().migrate();
            assertThat(jdbc.queryForList("select b.*,l.slug,l.published_at from book_copy b join listing l on l.book_copy_id=b.id")).isEqualTo(before);
            assertThat(jdbc.queryForObject("select count(*) from book_import_batch",Long.class)).isZero();
            assertThat(jdbc.queryForObject("select count(*) from book_import_item",Long.class)).isZero();
        } finally {PgTestData.jdbc().execute("drop schema if exists "+schema+" cascade");}
    }
}
