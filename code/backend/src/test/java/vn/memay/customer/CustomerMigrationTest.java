package vn.memay.customer;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import vn.memay.support.PgTestData;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
class CustomerMigrationTest {
 @Test void addsCustomersWithoutChangingBooks(){
  String schema="customer_"+UUID.randomUUID().toString().replace("-","");var jdbc=PgTestData.jdbc(schema);
  var cfg=Flyway.configure().dataSource(PgTestData.requireTestJdbcUrl(System.getenv("TEST_DB_URL")),System.getenv("DB_USER"),System.getenv("DB_PASSWORD")).schemas(schema).defaultSchema(schema);
  try{
   cfg.target("31").load().migrate();
   jdbc.update("insert into book_copy(id,book_code,title,availability) values(1,'MM-000001','Preserved','AVAILABLE')");
   var before=jdbc.queryForList("select * from book_copy");cfg.target("32").load().migrate();
   assertThat(jdbc.queryForList("select * from book_copy")).isEqualTo(before);
   var a=jdbc.queryForMap("insert into customer(full_name,phone) values('Lan','0987123456') returning *");
   var b=jdbc.queryForMap("insert into customer(full_name,phone) values('Other','0987123456') returning *");
   assertThat(a.get("customer_code")).isEqualTo("KH-000001");assertThat(b.get("customer_code")).isEqualTo("KH-000002");
   assertThat(a.get("threads_id")).isNull();assertThat(a.get("status")).isEqualTo("ACTIVE");assertThat(a.get("version")).isEqualTo(0L);
   assertThat(jdbc.queryForObject("insert into customer(id,full_name) values(1000000,'Large') returning customer_code",String.class)).isEqualTo("KH-1000000");
   assertThatThrownBy(()->jdbc.update("insert into customer(full_name,status) values('Bad','BAD')")).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
   assertThatThrownBy(()->jdbc.update("insert into customer(full_name,version) values('Bad',-1)")).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
  }finally{PgTestData.jdbc().execute("drop schema if exists "+schema+" cascade");}
 }
}
