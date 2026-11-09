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
   config.target("20").load().migrate();
   var before = db.queryForList("select id,storage_public_id from book_media order by id");
   long version = db.queryForObject("select version from book_copy where id=1",Long.class);
   config.target("21").load().migrate();
   assertThat(db.queryForList("select id,storage_public_id from book_media order by id")).isEqualTo(before);
   assertThat(db.queryForList("select role from book_media order by role",String.class))
       .containsExactly("FRONT","INSIDE_4","INSIDE_5");
   assertThat(db.queryForObject("select version from book_copy where id=1",Long.class)).isEqualTo(version+1);
  } finally {PgTestData.jdbc().execute("drop schema if exists "+schema+" cascade");}
 }
}
