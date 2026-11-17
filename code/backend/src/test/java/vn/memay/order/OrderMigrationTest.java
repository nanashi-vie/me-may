package vn.memay.order;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import vn.memay.support.PgTestData;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
class OrderMigrationTest {
 @Test void addsOrdersWithoutChangingBooksOrCustomers(){
  String schema="order_"+UUID.randomUUID().toString().replace("-","");var jdbc=PgTestData.jdbc(schema);
  var cfg=Flyway.configure().dataSource(PgTestData.requireTestJdbcUrl(System.getenv("TEST_DB_URL")),System.getenv("DB_USER"),System.getenv("DB_PASSWORD")).schemas(schema).defaultSchema(schema);
  try{
   cfg.target("33").load().migrate();
   jdbc.update("insert into book_copy(book_code,title) values('MM-TEST','Preserved')");
   jdbc.update("insert into customer(full_name) values('Synthetic customer')");
   var books=jdbc.queryForList("select * from book_copy");var customers=jdbc.queryForList("select * from customer");
   cfg.target("34").load().migrate();
   assertThat(jdbc.queryForObject("select to_regclass('orders') is not null",Boolean.class)).isTrue();
   assertThat(jdbc.queryForList("select * from book_copy")).isEqualTo(books);
   assertThat(jdbc.queryForList("select * from customer")).isEqualTo(customers);
   long customer=((Number)customers.getFirst().get("id")).longValue();
   String code=jdbc.queryForObject("insert into orders(customer_id,customer_code_snapshot,customer_name_snapshot) values(?,'KH-TEST','Synthetic customer') returning order_code",String.class,customer);
   assertThat(code).isEqualTo("DH-000001");
   assertThatThrownBy(()->jdbc.update("update orders set status='BAD'")).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
   assertThatThrownBy(()->jdbc.update("update orders set discount_amount=-1")).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
   assertThatThrownBy(()->jdbc.update("delete from customer where id=?",customer)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
  }finally{PgTestData.jdbc().execute("drop schema if exists "+schema+" cascade");}
 }
}
