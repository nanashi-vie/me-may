package vn.memay.catalogue;
import vn.memay.support.PgTestData;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
class M2MigrationTest {
 @Test void upgradesM1WithoutLosingAdmin(){
  String schema="m2_"+UUID.randomUUID().toString().replace("-","");
  var jdbc=PgTestData.jdbc(schema);
  var config=Flyway.configure().dataSource(PgTestData.requireTestJdbcUrl(System.getenv("TEST_DB_URL")),System.getenv("DB_USER"),System.getenv("DB_PASSWORD")).schemas(schema).defaultSchema(schema);
  try {
   config.target("1").load().migrate();
   jdbc.update("insert into admin_user(email,password_hash,role) values ('migration@test.local','test-hash','OWNER')");
   config.target("3").load().migrate();
   assertThat(jdbc.queryForObject("select count(*) from admin_user",Integer.class)).isEqualTo(1);
   assertThat(jdbc.queryForObject("select count(*) from category",Integer.class)).isEqualTo(6);
   assertThat(jdbc.queryForObject("select count(*) from book_copy",Integer.class)).isZero();
   config.load().migrate();
   assertThat(jdbc.queryForObject("select count(*) from category",Integer.class)).isEqualTo(6);
   jdbc.update("insert into book_copy(book_code) values ('MM-000001')");
   assertThatThrownBy(()->jdbc.update("insert into book_copy(book_code) values ('MM-000001')")).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
  } finally { PgTestData.jdbc().execute("drop schema if exists "+schema+" cascade"); }
 }
 @Test void rejectsMultipleActiveMediaPerRole(){
  String schema="m2_"+UUID.randomUUID().toString().replace("-",""); var jdbc=PgTestData.jdbc(schema);
  try {
   Flyway.configure().dataSource(PgTestData.requireTestJdbcUrl(System.getenv("TEST_DB_URL")),System.getenv("DB_USER"),System.getenv("DB_PASSWORD")).schemas(schema).defaultSchema(schema).load().migrate();
   Long id=jdbc.queryForObject("insert into book_copy(book_code) values ('MM-000001') returning id",Long.class);
   jdbc.update("insert into book_media(id,book_copy_id,role,state,storage_public_id) values (?,?,'FRONT','ACTIVE','one')",UUID.randomUUID(),id);
   assertThatThrownBy(()->jdbc.update("insert into book_media(id,book_copy_id,role,state,storage_public_id) values (?,?,'FRONT','ACTIVE','two')",UUID.randomUUID(),id)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
   jdbc.update("insert into book_media(id,book_copy_id,role,state,storage_public_id) values (?,?,'FRONT','UPLOADING','pending')",UUID.randomUUID(),id);
  } finally { PgTestData.jdbc().execute("drop schema if exists "+schema+" cascade"); }
 }
}
