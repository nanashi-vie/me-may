package vn.memay.catalogue;
import vn.memay.support.PgTestData;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
class M3MigrationTest {
 @Test void removesOnlyBasisPreservingBooksMediaAuditAndCodeSequence(){
  String schema="m3_"+UUID.randomUUID().toString().replace("-","");var jdbc=PgTestData.jdbc(schema);var config=Flyway.configure().dataSource(PgTestData.requireTestJdbcUrl(System.getenv("TEST_DB_URL")),System.getenv("DB_USER"),System.getenv("DB_PASSWORD")).schemas(schema).defaultSchema(schema);
  try{config.target("3").load().migrate();jdbc.update("insert into admin_user(id,email,password_hash,role) values(1,'migration@m3.test','hash','OWNER')");jdbc.update("insert into book_copy(id,book_code,title) values(1,'MM-000042','Book')");jdbc.update("insert into listing(book_copy_id,slug,reading_level,reading_level_basis,reading_video_url) values(1,'mm-000042','A1','Historical basis',null)");jdbc.update("insert into book_media(id,book_copy_id,role,state,storage_public_id) values(?,1,'FRONT','ACTIVE','saved-reference')",UUID.randomUUID());jdbc.update("insert into audit_event(actor_id,target_type,target_id,action,after_data,aggregate_version) values(1,'BOOK',1,'CREATE','{\"readingLevelBasis\":\"Historical basis\"}',0)");jdbc.execute("select setval('book_code_seq',42,true)");
   config.target(org.flywaydb.core.api.MigrationVersion.LATEST).load().migrate();assertThat(jdbc.queryForObject("select count(*) from information_schema.columns where table_schema=? and column_name='reading_level_basis'",Integer.class,schema)).isZero();assertThat(jdbc.queryForObject("select reading_level from listing",String.class)).isEqualTo("A1");assertThat(jdbc.queryForObject("select storage_public_id from book_media",String.class)).isEqualTo("saved-reference");assertThat(jdbc.queryForObject("select after_data->>'readingLevelBasis' from audit_event",String.class)).isEqualTo("Historical basis");assertThat(jdbc.queryForObject("select nextval('book_code_seq')",Long.class)).isEqualTo(43);
  }finally{PgTestData.jdbc().execute("drop schema if exists "+schema+" cascade");}
 }
}
