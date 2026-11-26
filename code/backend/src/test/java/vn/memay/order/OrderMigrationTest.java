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
 @Test void v39MergesPaymentsAndClosesUnsuccessful(){
  String schema="order_"+UUID.randomUUID().toString().replace("-","");var jdbc=PgTestData.jdbc(schema);
  var cfg=Flyway.configure().dataSource(PgTestData.requireTestJdbcUrl(System.getenv("TEST_DB_URL")),System.getenv("DB_USER"),System.getenv("DB_PASSWORD")).schemas(schema).defaultSchema(schema);
  try{
   cfg.target("38").load().migrate();
   long admin=jdbc.queryForObject("insert into admin_user(email,password_hash,role) values('owner@v39.test','x','OWNER') returning id",Long.class);
   long customer=jdbc.queryForObject("insert into customer(full_name) values('Synthetic customer') returning id",Long.class);
   long order=jdbc.queryForObject("insert into orders(customer_id,customer_code_snapshot,customer_name_snapshot,status,created_by) values(?,'KH-TEST','Synthetic customer','UNSUCCESSFUL',?) returning id",Long.class,customer,admin);
   jdbc.update("insert into order_shipments(order_id,attempt_no,state,shipping_snapshot,failed_at,failed_by,failure_reason) values(?,1,'FAILED','{}',now(),?,'Returned')",order,admin);
   for(var row:new Object[][]{{"DEPOSIT",100000,"BANK_TRANSFER"},{"PAYMENT",200000,"CASH"},{"REFUND",50000,"OTHER"}})
    jdbc.update("insert into order_payments(order_id,transaction_type,amount,payment_method,occurred_at,created_by) values(?,?,?,?,now(),?)",order,row[0],row[1],row[2],admin);
   cfg.target("39").load().migrate();
   assertThat(jdbc.queryForObject("select status from orders where id=?",String.class,order)).isEqualTo("COMPLETED");
   assertThat(jdbc.queryForObject("select state from order_shipments where order_id=?",String.class,order)).isEqualTo("FAILED");
   assertThat(jdbc.queryForObject("select count(*) from order_payments where transaction_type='PAYMENT'",Long.class)).isZero();
   assertThat(jdbc.queryForObject("select sum(case when transaction_type='REFUND' then -amount else amount end) from order_payments",Long.class)).isEqualTo(250000);
   assertThat(jdbc.queryForObject("select count(*) from information_schema.columns where table_schema=? and table_name='order_payments' and column_name='payment_method'",Long.class,schema)).isZero();
   assertThat(jdbc.queryForObject("select count(*) from order_payments where proof_key is null",Long.class)).isEqualTo(3);
   assertThatThrownBy(()->jdbc.update("insert into order_payments(order_id,transaction_type,amount,occurred_at,created_by) values(?,'PAYMENT',1,now(),?)",order,admin)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
   assertThatThrownBy(()->jdbc.update("update orders set status='UNSUCCESSFUL'")).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
   assertThatThrownBy(()->jdbc.update("update order_payments set proof_key='x'")).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
  }finally{PgTestData.jdbc().execute("drop schema if exists "+schema+" cascade");}
 }
}
