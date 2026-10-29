package vn.memay.catalogue;
import vn.memay.support.PgTestData;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
class M5MigrationTest {
 @Test void upgradesV5FieldsWithoutInventingWeightsOrChangingMediaIdentity() {
  String schema="m5_"+UUID.randomUUID().toString().replace("-","");var jdbc=PgTestData.jdbc(schema);
  var config=Flyway.configure().dataSource(PgTestData.requireTestJdbcUrl(System.getenv("TEST_DB_URL")),System.getenv("DB_USER"),System.getenv("DB_PASSWORD")).schemas(schema).defaultSchema(schema);
  var media=UUID.randomUUID();
  try {
   config.target("5").load().migrate();
   jdbc.update("insert into book_copy(id,book_code,title) values(1,'MM-000042','Existing')");
   jdbc.update("insert into listing(book_copy_id,slug,price_vnd,publication_status) values(1,'mm-000042',20000,'PUBLISHED')");
   jdbc.update("insert into book_media(id,book_copy_id,role,state,storage_public_id) values(?,1,'INSIDE','ACTIVE','saved-asset')",media);
   config.target("6").load().migrate();
   assertThat(jdbc.queryForObject("select price_min_vnd from listing",Long.class)).isEqualTo(20000L);
   assertThat(jdbc.queryForObject("select price_max_vnd from listing",Long.class)).isEqualTo(20000L);
   assertThat(jdbc.queryForObject("select weight_g from book_copy",Integer.class)).isNull();
   assertThat(jdbc.queryForObject("select publication_status from listing",String.class)).isEqualTo("PUBLISHED");
   assertThat(jdbc.queryForObject("select role from book_media where id=?",String.class,media)).isEqualTo("INSIDE_1");
   assertThat(jdbc.queryForObject("select storage_public_id from book_media where id=?",String.class,media)).isEqualTo("saved-asset");
   assertThatThrownBy(()->jdbc.update("update listing set price_min_vnd=30000,price_max_vnd=20000")).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
  } finally { PgTestData.jdbc().execute("drop schema if exists "+schema+" cascade"); }
 }
 @Test void retiresOnlyLegacyDraftWhilePreservingHistoricalAuditAndPublishedBooks() {
  String schema="m5state_"+UUID.randomUUID().toString().replace("-","");var jdbc=PgTestData.jdbc(schema);
  var config=Flyway.configure().dataSource(PgTestData.requireTestJdbcUrl(System.getenv("TEST_DB_URL")),System.getenv("DB_USER"),System.getenv("DB_PASSWORD")).schemas(schema).defaultSchema(schema);
  try {
   config.target("7").load().migrate();jdbc.update("insert into admin_user(id,email,password_hash,role) values(1,'history@test.example','hash','OWNER')");
   jdbc.update("insert into book_copy(id,book_code) values(1,'MM-000001'),(2,'MM-000002')");
   jdbc.update("insert into listing(book_copy_id,slug,publication_status) values(1,'mm-000001','DRAFT'),(2,'mm-000002','PUBLISHED')");
   jdbc.update("insert into audit_event(actor_id,target_type,target_id,action,after_data,aggregate_version) values(1,'BOOK',1,'CREATE','{\"publication\":\"DRAFT\"}',0)");
   config.target(org.flywaydb.core.api.MigrationVersion.LATEST).load().migrate();
   assertThat(jdbc.queryForObject("select publication_status from listing where book_copy_id=1",String.class)).isEqualTo("ARCHIVED");assertThat(jdbc.queryForObject("select publication_status from listing where book_copy_id=2",String.class)).isEqualTo("PUBLISHED");
   assertThat(jdbc.queryForObject("select after_data->>'publication' from audit_event",String.class)).isEqualTo("DRAFT");assertThat(jdbc.queryForObject("select weight_g from book_copy where id=2",Long.class)).isNull();
  }finally{PgTestData.jdbc().execute("drop schema if exists "+schema+" cascade");}
 }
}
