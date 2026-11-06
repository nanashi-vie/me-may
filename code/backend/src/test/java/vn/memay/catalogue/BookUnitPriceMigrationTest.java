package vn.memay.catalogue;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import vn.memay.support.PgTestData;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
class BookUnitPriceMigrationTest {
 @Test void v14PreservesLegacyBooksAndOnlyAddsNullableUnitPrice() {
  String schema="entry_"+UUID.randomUUID().toString().replace("-","");var db=PgTestData.jdbc(schema);
  var config=Flyway.configure().dataSource(PgTestData.requireTestJdbcUrl(System.getenv("TEST_DB_URL")),System.getenv("DB_USER"),System.getenv("DB_PASSWORD")).schemas(schema).defaultSchema(schema);
  try {
   config.target("13").load().migrate();
   db.update("insert into book_copy(id,book_code,title,availability,condition_grade,condition_note,weight_g) values(1,'MM-000001','Legacy','AVAILABLE','GOOD','keep private',450)");
   db.update("insert into listing(book_copy_id,slug,price_min_vnd,price_max_vnd,publication_status,published_at) values(1,'keep-url',36450,41918,'PUBLISHED','2026-10-01T00:00:00Z')");
   db.update("insert into book_variant(book_copy_id,name,stock,sort_order) values(1,'A',999999,0),(1,'B',2,1)");
   db.update("insert into book_media(id,book_copy_id,role,state,storage_public_id) values(?,1,'FRONT','ACTIVE','synthetic-only')",UUID.randomUUID());
   var book=db.queryForList("select * from book_copy order by id");var rows=new LinkedHashMap<String,List<Map<String,Object>>>();
   for(String table:List.of("listing","book_variant","book_media"))rows.put(table,db.queryForList("select * from "+table+" order by id"));
   long sequence=db.queryForObject("select last_value from book_code_seq",Long.class);
   config.target("14").load().migrate();var after=db.queryForList("select * from book_copy order by id");
   after.forEach(row->assertThat(row.remove("unit_price_per_kg_vnd")).isNull());assertThat(after).isEqualTo(book);
   rows.forEach((table,before)->assertThat(db.queryForList("select * from "+table+" order by id")).isEqualTo(before));
   assertThat(db.queryForObject("select last_value from book_code_seq",Long.class)).isEqualTo(sequence);
   db.update("update book_copy set unit_price_per_kg_vnd=80000 where id=1");
   assertThatThrownBy(()->db.update("update book_copy set unit_price_per_kg_vnd=0")).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
   assertThatThrownBy(()->db.update("update book_copy set unit_price_per_kg_vnd=1000000000000")).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
  } finally {PgTestData.jdbc().execute("drop schema if exists "+schema+" cascade");}
 }
}
