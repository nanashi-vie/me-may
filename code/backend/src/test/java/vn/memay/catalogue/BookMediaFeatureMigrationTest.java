package vn.memay.catalogue;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import vn.memay.support.PgTestData;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
class BookMediaFeatureMigrationTest {
 @Test void v15PreservesLegacyRowsAndEnforcesFeatureAndMediaConstraints() {
  String schema="features_"+UUID.randomUUID().toString().replace("-","");var db=PgTestData.jdbc(schema);
  var config=Flyway.configure().dataSource(PgTestData.requireTestJdbcUrl(System.getenv("TEST_DB_URL")),System.getenv("DB_USER"),System.getenv("DB_PASSWORD")).schemas(schema).defaultSchema(schema);
  try {
   config.target("14").load().migrate();
   db.update("insert into book_copy(id,book_code,title,availability,weight_g,unit_price_per_kg_vnd) values(1,'MM-000001','Legacy','AVAILABLE',450,80000)");
   long listing=db.queryForObject("insert into listing(book_copy_id,slug,price_min_vnd,price_max_vnd,publication_status,published_at) values(1,'keep-url',36000,42000,'PUBLISHED','2026-10-01T00:00:00Z') returning id",Long.class);
   db.update("insert into book_media(id,book_copy_id,role,state,storage_public_id) values(?,1,'FRONT','ACTIVE','synthetic-only')",UUID.randomUUID());
   var snapshot=new LinkedHashMap<String,List<Map<String,Object>>>();
   for(String table:List.of("book_copy","listing","book_media"))snapshot.put(table,db.queryForList("select * from "+table+" order by id"));
   config.target("15").load().migrate();
   snapshot.forEach((table,before)->assertThat(db.queryForList("select * from "+table+" order by id")).isEqualTo(before));
   assertThat(db.queryForObject("select count(*) from listing_feature",Integer.class)).isZero();
   assertThat(db.queryForList("select code from book_feature order by sort_order",String.class)).containsExactly("SOUND","FLAP","SLIDE","POP_UP","TOUCH","SPIN");
   for(String role:List.of("INTERNAL_1","INTERNAL_2"))db.update("insert into book_media(id,book_copy_id,role,state,storage_public_id) values(?,1,?,'ACTIVE',?)",UUID.randomUUID(),role,role);
   db.update("insert into listing_feature values(?,'SOUND',1)",listing);
   for(String sql:List.of("insert into listing_feature values(?,'SOUND',2)","insert into listing_feature values(?,'FLAP',1)","insert into listing_feature values(?,'FLAP',4)","insert into listing_feature values(?,'FAKE',2)"))
    assertThatThrownBy(()->db.update(sql,listing)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
   config.target("23").load().migrate();
   long employee=db.queryForObject("insert into employee_profile(full_name,display_name) values('Test Employee','Fixture') returning id",Long.class);
   db.update("insert into employee_pin_credential(employee_id,pin_hash) values(?,'test-only')",employee);
   db.update("insert into attendance_week(week_start_date) values(date '2026-11-09')");
   db.update("insert into employee_weekly_schedule values(?,date '2026-11-09',31)",employee);
   long session=db.queryForObject("""
       insert into attendance_session(employee_id,started_at,original_started_at,is_out_of_schedule,start_request)
       values(?,now(),now(),false,?) returning id
       """,Long.class,employee,UUID.randomUUID());
   db.update("""
       insert into attendance_audit_log(session_id,actor_email,old_started_at,new_started_at,reason)
       values(?,'fixture@example.test',now(),now(),'synthetic')
       """,session);
   db.update("insert into attendance_period_note values(?,'WEEK',date '2026-11-09','Employee note')",employee);
   db.update("insert into attendance_report_note values('WEEK',date '2026-11-09','Shared note')");

   var unchanged = new LinkedHashMap<String,List<Map<String,Object>>>();
   for(String table:List.of("listing","employee_profile","employee_pin_credential","attendance_week",
       "employee_weekly_schedule","attendance_session","attendance_audit_log","attendance_period_note","attendance_report_note"))
    unchanged.put(table,db.queryForList("select * from "+table));
   var bookBefore = db.queryForMap("select * from book_copy where id=1");
   var mediaBefore = db.queryForList("select * from book_media order by id");
   mediaBefore.forEach(row -> {
    row.remove("show_on_product");
    String role = (String) row.get("role");
    row.put("role", switch(role) {
     case "INTERNAL_1" -> "INSIDE_4";
     case "INTERNAL_2" -> "INSIDE_5";
     default -> role;
    });
    row.put("provider", "CLOUDINARY");
    row.put("serving_generation", null);
   });
   bookBefore.put("version", (Long) bookBefore.get("version") + 1);
   config.target("30").load().migrate();
   unchanged.forEach((table,before)->assertThat(db.queryForList("select * from "+table)).as(table).isEqualTo(before));
   assertThat(db.queryForMap("select * from book_copy where id=1")).isEqualTo(bookBefore);
   assertThat(db.queryForList("select * from book_media order by id")).isEqualTo(mediaBefore);
   assertThat(db.queryForList("select version from flyway_schema_history where installed_rank > 23 order by installed_rank",String.class))
       .containsExactly("24","25","26","27","28","29","30");
   assertThat(db.queryForList("""
       select tablename from pg_tables where schemaname=current_schema()
           and (tablename like 'image_%' or tablename='local_image_commit')
       """,String.class)).containsExactlyInAnyOrder("image_asset","image_recipe","image_generation","image_variant",
       "image_source_binding","image_job","image_source_verification","local_image_commit","image_migration_receipt",
       "image_migration_row","image_migration_apply","image_migration_apply_book","image_migration_apply_item",
       "image_migration_rollback","image_recovery_operation","image_recovery_item");
  } finally {PgTestData.jdbc().execute("drop schema if exists "+schema+" cascade");}
 }
}
