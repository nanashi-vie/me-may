package vn.memay.catalogue;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;
import vn.memay.support.PgTestData;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;

class BookVariantMigrationTest {
    @Test void migratesAvailableAndSoldWithoutChangingIdentity() {
        String schema = "variants_" + UUID.randomUUID().toString().replace("-", "");
        var jdbc = PgTestData.jdbc(schema);
        var config = Flyway.configure().dataSource(PgTestData.requireTestJdbcUrl(System.getenv("TEST_DB_URL")),
                System.getenv("DB_USER"), System.getenv("DB_PASSWORD")).schemas(schema).defaultSchema(schema);
        UUID media = UUID.randomUUID();
        try {
            config.target("9").load().migrate();
            jdbc.update("insert into book_copy(id,book_code,availability,condition_grade) values(1,'MM-000041','AVAILABLE','VERY_GOOD'),(2,'MM-000042','SOLD','FAIR')");
            jdbc.update("insert into listing(book_copy_id,slug,price_min_vnd,price_max_vnd,publication_status,published_at) values(1,'saved-url',21000,31000,'PUBLISHED','2026-10-01T00:00:00Z'),(2,'sold-url',22000,22000,'ARCHIVED',null)");
            jdbc.update("insert into book_media(id,book_copy_id,role,state,storage_public_id) values(?,1,'FRONT','ACTIVE','saved-asset')", media);
            var before = jdbc.queryForList("select b.*,l.slug,l.price_min_vnd,l.price_max_vnd,l.publication_status,l.published_at from book_copy b join listing l on l.book_copy_id=b.id order by b.id");
            Long sequence = jdbc.queryForObject("select last_value from book_code_seq", Long.class);
            config.target(MigrationVersion.LATEST).load().migrate();
            assertThat(jdbc.queryForList("select stock from book_variant order by book_copy_id", Long.class)).containsExactly(1L, 0L);
            assertThat(jdbc.queryForObject("select count(distinct id) from book_variant", Long.class)).isEqualTo(2L);
            assertThat(jdbc.queryForList("select b.*,l.slug,l.price_min_vnd,l.price_max_vnd,l.publication_status,l.published_at from book_copy b join listing l on l.book_copy_id=b.id order by b.id")).isEqualTo(before);
            assertThat(jdbc.queryForObject("select last_value from book_code_seq", Long.class)).isEqualTo(sequence);
            assertThat(jdbc.queryForObject("select storage_public_id from book_media where id=?", String.class, media)).isEqualTo("saved-asset");
            jdbc.update("update book_copy set condition_grade='HIGH_FRESHNESS' where id=1");
            jdbc.update("update book_copy set condition_grade='MINOR_FLAWS' where id=2");
            jdbc.update("update book_variant set stock=999999 where book_copy_id=1");
            assertThatThrownBy(() -> jdbc.update("update book_variant set stock=-1")).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
            assertThatThrownBy(() -> jdbc.update("update book_variant set stock=1000000")).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
            jdbc.update("update book_variant set name='Độ mới cao' where book_copy_id=1");
            assertThatThrownBy(() -> jdbc.update("insert into book_variant(id,book_copy_id,name,stock,sort_order) values(?,1,' độ mới cao ',1,1)", UUID.randomUUID())).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        } finally { PgTestData.jdbc().execute("drop schema if exists " + schema + " cascade"); }
    }
}
