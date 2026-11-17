package vn.memay.order;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.*;
import vn.memay.support.OrderTestSupport;
import vn.memay.common.AdminApiException;
import java.util.*;
import java.time.*;
import static vn.memay.order.OrderDtos.*;
import static org.assertj.core.api.Assertions.*;
@Import(OrderKeepTest.FixedClock.class)
class OrderKeepTest extends OrderTestSupport {
 @TestConfiguration static class FixedClock {@Bean @Primary Clock orderKeepClock(){return Clock.fixed(Instant.parse("2026-11-16T05:12:00Z"),ZoneOffset.UTC);}}
 @Autowired OrderDraftService drafts;@Autowired OrderKeepService keep;
 private long populated(String type,long stock){var b=ready();jdbc.update("update book_variant set stock=? where book_copy_id=?",stock,Long.parseLong(b.id()));
  var d=drafts.create(new CreateRequest(Long.toString(customer()),type,UUID.randomUUID()),owner);long id=Long.parseLong(d.id());
  drafts.addItem(id,new ItemRequest(0L,UUID.randomUUID(),"CATALOG",b.id(),null,100000L,2L,250L,null),owner);return id;
 }
 private void deposit(long id){jdbc.update("insert into order_payments(order_id,transaction_type,amount,payment_method,occurred_at,created_by) values(?,'DEPOSIT',100000,'CASH',current_timestamp,?)",id,owner.getId());}
 @Test void keepDeductsOnceAndDoesNotExtendOnAdd(){
  long id=populated("KEEP",5);deposit(id);var key=UUID.randomUUID();keep.keep(id,new KeepRequest(1L,key,false,null),owner);var first=orders.require(id,false);String book=first.items().getFirst().bookCopyId();
  assertThat(first.keepUntil()).isEqualTo(Instant.parse("2026-11-30T17:00:00Z"));assertThat(queries.detail(Long.parseLong(book),owner).totalStock()).isEqualTo(3);
  keep.keep(id,new KeepRequest(1L,key,false,null),owner);assertThat(queries.detail(Long.parseLong(book),owner).totalStock()).isEqualTo(3);
  drafts.addItem(id,new ItemRequest(2L,UUID.randomUUID(),"CATALOG",book,null,150000L,1L,300L,null),owner);
  assertThat(orders.require(id,false).keepUntil()).isEqualTo(first.keepUntil());assertThat(queries.detail(Long.parseLong(book),owner).totalStock()).isEqualTo(2);
 }
 @Test void exceptionRequiresExplicitReasonAndCancelRestoresOnlyOnce(){
  long id=populated("KEEP",2);var book=orders.require(id,false).items().getFirst().bookCopyId();
  assertThatThrownBy(()->keep.keep(id,new KeepRequest(1L,UUID.randomUUID(),false,null),owner)).isInstanceOfSatisfying(AdminApiException.class,e->assertThat(e.error).isEqualTo("deposit_required"));
  assertThatThrownBy(()->keep.keep(id,new KeepRequest(1L,UUID.randomUUID(),true," "),owner)).isInstanceOf(AdminApiException.class);
  keep.keep(id,new KeepRequest(1L,UUID.randomUUID(),true,"Owner exception"),owner);var key=UUID.randomUUID();
  keep.cancel(id,new ReasonRequest(2L,key,"Cancelled before shipping"),owner);keep.cancel(id,new ReasonRequest(2L,key,"Cancelled before shipping"),owner);
  assertThat(queries.detail(Long.parseLong(book),owner).totalStock()).isEqualTo(2);assertThat(orders.require(id,false).payments()).isEmpty();
 }
 @Test void extensionIsCappedAtThirtyCalendarDaysAndRetainsReason(){
  long id=populated("KEEP",2);deposit(id);keep.keep(id,new KeepRequest(1L,UUID.randomUUID(),false,null),owner);
  keep.extend(id,new ExtendRequest(2L,UUID.randomUUID(),"2026-12-16","Requested extra time"),owner);
  assertThat(orders.require(id,false).keepUntil()).isEqualTo(Instant.parse("2026-12-16T17:00:00Z"));
  assertThat(jdbc.queryForObject("select reason from order_action_notes where order_id=? and operation='EXTEND_KEEP'",String.class,id)).isEqualTo("Requested extra time");
  assertThatThrownBy(()->keep.extend(id,new ExtendRequest(3L,UUID.randomUUID(),"2026-12-17","Too far"),owner)).isInstanceOf(AdminApiException.class);
 }
 @Test void expiredKeepDoesNotAutoReleaseAndCanExtendWithinCap(){
  long id=populated("KEEP",2);deposit(id);keep.keep(id,new KeepRequest(1L,UUID.randomUUID(),false,null),owner);
  jdbc.update("update orders set keep_started_at='2026-10-30T05:00:00Z',keep_until='2026-11-14T17:00:00Z' where id=?",id);
  keep.extend(id,new ExtendRequest(2L,UUID.randomUUID(),"2026-11-20","Extend overdue"),owner);
  var d=orders.require(id,false);assertThat(d.status()).isEqualTo(Status.KEEPING);assertThat(queries.detail(Long.parseLong(d.items().getFirst().bookCopyId()),owner).totalStock()).isZero();
 }
 @Test void stockShortageRollsBackAllReservations(){
  long id=populated("KEEP",2);var first=orders.require(id,false).items().getFirst();var other=ready();
  drafts.addItem(id,new ItemRequest(1L,UUID.randomUUID(),"CATALOG",other.id(),null,100L,1L,250L,null),owner);deposit(id);
  jdbc.update("update book_variant set stock=0 where book_copy_id=?",Long.parseLong(other.id()));
  assertThatThrownBy(()->keep.keep(id,new KeepRequest(2L,UUID.randomUUID(),false,null),owner)).isInstanceOf(AdminApiException.class);
  assertThat(orders.require(id,false).status()).isEqualTo(Status.DRAFT);assertThat(queries.detail(Long.parseLong(first.bookCopyId()),owner).totalStock()).isEqualTo(2);
  assertThat(jdbc.queryForObject("select count(*) from order_reservation where order_id=?",Integer.class,id)).isZero();
 }
 @Test void reopenKeepsKeepDeadlineButImmediateReleasesStock(){
  for(String type:List.of("KEEP","IMMEDIATE")){
   long id=populated(type,2);deposit(id);if(type.equals("KEEP"))keep.keep(id,new KeepRequest(1L,UUID.randomUUID(),false,null),owner);
   else{jdbc.update("update book_variant set stock=0 where book_copy_id=?",Long.parseLong(orders.require(id,false).items().getFirst().bookCopyId()));jdbc.update("insert into order_reservation(order_id,book_copy_id,quantity,state) values(?,?,2,'ACTIVE')",id,Long.parseLong(orders.require(id,false).items().getFirst().bookCopyId()));}
   var before=orders.require(id,false);jdbc.update("update orders set status='READY_TO_SHIP' where id=?",id);
   keep.reopen(id,new ReasonRequest(before.version(),UUID.randomUUID(),"Add another book"),owner);var after=orders.require(id,false);
   assertThat(after.status()).isEqualTo(type.equals("KEEP")?Status.KEEPING:Status.DRAFT);assertThat(after.keepUntil()).isEqualTo(before.keepUntil());
   assertThat(queries.detail(Long.parseLong(after.items().getFirst().bookCopyId()),owner).totalStock()).isEqualTo(type.equals("KEEP")?0:2);
  }
 }
 @Test void twoOrdersCannotKeepSameLastCopies()throws Exception{
  var b=ready();long book=Long.parseLong(b.id());jdbc.update("update book_variant set stock=2 where book_copy_id=?",book);var ids=new ArrayList<Long>();
  for(int i=0;i<2;i++){var d=drafts.create(new CreateRequest(Long.toString(customer()),"KEEP",UUID.randomUUID()),owner);long id=Long.parseLong(d.id());drafts.addItem(id,new ItemRequest(0L,UUID.randomUUID(),"CATALOG",b.id(),null,100000L,2L,250L,null),owner);deposit(id);ids.add(id);}
  var barrier=new java.util.concurrent.CyclicBarrier(2);
  try(var pool=java.util.concurrent.Executors.newFixedThreadPool(2)){
   var calls=ids.stream().<java.util.concurrent.Callable<Object>>map(id->()->{barrier.await();try{return keep.keep(id,new KeepRequest(1L,UUID.randomUUID(),false,null),owner);}catch(AdminApiException e){return e;}}).toList();
   var results=pool.invokeAll(calls);var values=List.of(results.get(0).get(),results.get(1).get());assertThat(values.stream().filter(MutationResult.class::isInstance).count()).isEqualTo(1);
   assertThat(queries.detail(book,owner).totalStock()).isZero();assertThat(jdbc.queryForObject("select sum(quantity) from order_reservation where book_copy_id=? and state='ACTIVE'",Long.class,book)).isEqualTo(2);
  }
 }

}
