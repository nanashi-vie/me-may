package vn.memay.customer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import vn.memay.support.CatalogueTestSupport;
import vn.memay.common.AdminApiException;
import java.util.*;
import java.util.concurrent.*;
import static vn.memay.customer.CustomerDtos.*;
import static org.assertj.core.api.Assertions.*;
class CustomerConcurrencyTest extends CatalogueTestSupport {
 @Autowired CustomerService service;
 private CreateRequest create(String name){return new CreateRequest(name,null,null,null,null,null,null,false,null);}
 private UpdateRequest edit(String name,long version){return new UpdateRequest(name,null,null,null,null,null,null,version,false,null);}
 private List<Object> race(Callable<?> a,Callable<?> b)throws Exception{
  var barrier=new CyclicBarrier(2);try(var pool=Executors.newFixedThreadPool(2)){
   var futures=pool.invokeAll(List.<Callable<Object>>of(()->{barrier.await();try{return a.call();}catch(AdminApiException e){return e;}},()->{barrier.await();try{return b.call();}catch(AdminApiException e){return e;}}));
   return List.of(futures.get(0).get(),futures.get(1).get());
  }
 }
 @Test void parallelCreatesHaveDistinctCodes()throws Exception{
  var results=race(()->service.create(create("A"),owner),()->service.create(create("B"),owner));
  assertThat(results).allMatch(CustomerDetail.class::isInstance);
  assertThat(((CustomerDetail)results.get(0)).customerCode()).isNotEqualTo(((CustomerDetail)results.get(1)).customerCode());
 }
 @Test void sameVersionHasOneWinner()throws Exception{
  var c=service.create(create("Start"),owner);long id=Long.parseLong(c.id());
  var results=race(()->service.update(id,edit("A",0),owner),()->service.update(id,edit("B",0),owner));
  assertThat(results.stream().filter(CustomerDetail.class::isInstance).count()).isEqualTo(1);
  var conflict=(AdminApiException)results.stream().filter(AdminApiException.class::isInstance).findFirst().orElseThrow();assertThat(conflict.status).isEqualTo(409);assertThat(conflict.currentVersion).isEqualTo(1);
  var next=race(()->service.update(id,edit("C",1),owner),()->service.status(id,new StatusRequest(Status.ARCHIVED,1L),owner));
  assertThat(next.stream().filter(CustomerDetail.class::isInstance).count()).isEqualTo(1);
  assertThat(jdbc.queryForObject("select count(*) from audit_event where target_type='CUSTOMER'",Integer.class)).isEqualTo(3);
 }
 @Test void auditFailureRollsBack(){
  var c=service.create(create("Original"),owner);long id=Long.parseLong(c.id());
  jdbc.execute("alter table audit_event add constraint customer_test_audit_failure check(target_type <> 'CUSTOMER') not valid");
  try{
   assertThatThrownBy(()->service.update(id,edit("Changed",0),owner)).isInstanceOf(RuntimeException.class);
   assertThatThrownBy(()->service.status(id,new StatusRequest(Status.ARCHIVED,0L),owner)).isInstanceOf(RuntimeException.class);
   assertThatThrownBy(()->service.create(create("Not created"),owner)).isInstanceOf(RuntimeException.class);
   var current=service.detail(id,owner);assertThat(current.fullName()).isEqualTo("Original");assertThat(current.version()).isZero();assertThat(current.status()).isEqualTo(Status.ACTIVE);
   assertThat(jdbc.queryForObject("select count(*) from customer",Integer.class)).isEqualTo(1);
  }finally{jdbc.execute("alter table audit_event drop constraint customer_test_audit_failure");}
 }
 @Test void noopDoesNotAudit(){
  var c=service.create(create("Same"),owner);long id=Long.parseLong(c.id());
  assertThat(service.update(id,edit("Same",0),owner)).isEqualTo(c);
  assertThat(service.status(id,new StatusRequest(Status.ACTIVE,0L),owner)).isEqualTo(c);
  assertThat(jdbc.queryForObject("select count(*) from audit_event where target_type='CUSTOMER'",Integer.class)).isEqualTo(1);
 }
}
