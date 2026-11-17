package vn.memay.order;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import vn.memay.support.OrderTestSupport;
import vn.memay.common.AdminApiException;
import static vn.memay.order.OrderDtos.*;
import static org.assertj.core.api.Assertions.*;
class OrderMutationTest extends OrderTestSupport {
 @Autowired OrderMutations mutations;
 @Test void replayDoesNotRepeatWriteAndCanonicalMapOrderDoesNotMatter(){
  long id=draft();var meta=new MutationMeta(0L,UUID.randomUUID());var calls=new AtomicInteger();
  var payload=new LinkedHashMap<String,Object>();payload.put("a",1);payload.put("b",2);
  var first=mutations.run(owner,"TEST",id,meta,payload,()->{calls.incrementAndGet();jdbc.update("update orders set shipping_fee=30000 where id=?",id);return id;});
  var reordered=new LinkedHashMap<String,Object>();reordered.put("b",2);reordered.put("a",1);
  var second=mutations.run(owner,"TEST",id,meta,reordered,()->{calls.incrementAndGet();return id;});
  assertThat(second).isEqualTo(first);assertThat(calls.get()).isEqualTo(1);assertThat(orders.require(id,false).shippingFee()).isEqualTo(30000);
  assertThat(orders.require(id,false).version()).isEqualTo(1);
  assertThatThrownBy(()->mutations.run(owner,"TEST",id,meta,Map.of("a",9),()->id)).isInstanceOfSatisfying(AdminApiException.class,e->assertThat(e.error).isEqualTo("idempotency_conflict"));
  assertThatThrownBy(()->mutations.run(owner,"TEST",id,new MutationMeta(0L,UUID.randomUUID()),Map.of(),()->id)).isInstanceOfSatisfying(AdminApiException.class,e->assertThat(e.error).isEqualTo("version_conflict"));
 }
 @Test void auditFailureRollsBackReceiptAndData(){
  long id=draft();var meta=new MutationMeta(0L,UUID.randomUUID());
  jdbc.execute("alter table audit_event add constraint order_test_audit_failure check(target_type <> 'ORDER') not valid");
  try{
   assertThatThrownBy(()->mutations.run(owner,"TEST",id,meta,Map.of(),()->{jdbc.update("update orders set shipping_fee=20 where id=?",id);return id;})).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
   assertThat(orders.require(id,false).version()).isZero();assertThat(orders.require(id,false).shippingFee()).isNull();
   assertThat(jdbc.queryForObject("select count(*) from order_mutation_receipt",Integer.class)).isZero();
  }finally{jdbc.execute("alter table audit_event drop constraint order_test_audit_failure");}
 }
 @Test void replayStillRequiresCurrentRole(){
  long id=draft();var meta=new MutationMeta(0L,UUID.randomUUID());mutations.run(owner,"TEST",id,meta,Map.of(),()->id);
  jdbc.update("update admin_user set role='STAFF' where id=?",owner.getId());
  assertThatThrownBy(()->mutations.run(owner,"TEST",id,meta,Map.of(),()->id)).isInstanceOfSatisfying(AdminApiException.class,e->assertThat(e.status).isEqualTo(403));
 }
 @Test void concurrentSameRequestCommitsOnlyOnce()throws Exception{
  long id=draft();var meta=new MutationMeta(0L,UUID.randomUUID());var calls=new AtomicInteger();var barrier=new CyclicBarrier(2);
  try(var pool=Executors.newFixedThreadPool(2)){
   Callable<MutationResult> call=()->{barrier.await();return mutations.run(owner,"RACE",id,meta,Map.of(),()->{calls.incrementAndGet();return id;});};
   var futures=pool.invokeAll(List.of(call,call));assertThat(futures.get(0).get()).isEqualTo(futures.get(1).get());assertThat(calls.get()).isEqualTo(1);
  }
 }
 @Test void auditPreservesChangesWithoutCustomerData(){
  long id=draft();mutations.run(owner,"TEST",id,new MutationMeta(0L,UUID.randomUUID()),Map.of(),()->{jdbc.update("update orders set recipient_name='private-name',shipping_fee=35 where id=?",id);return id;});
  String data=jdbc.queryForObject("select before_data::text||after_data::text from audit_event where target_type='ORDER'",String.class);
  assertThat(data).contains("shippingFee","35").doesNotContain("private-name","Synthetic customer","0901234567");
 }
}
