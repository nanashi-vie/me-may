package vn.memay.order;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import vn.memay.support.OrderTestSupport;
import vn.memay.common.AdminApiException;
import java.util.*;
import static vn.memay.order.OrderDtos.*;
import static org.assertj.core.api.Assertions.*;
class OrderDraftTest extends OrderTestSupport {
 @Autowired OrderDraftService drafts;
 @Autowired CatalogMatchService matching;
 private ItemRequest item(long v,String source,String book,String title,Long price,long qty,Long weight,MatchConfirmation confirm){return new ItemRequest(v,UUID.randomUUID(),source,book,title,price,qty,weight,confirm);}
 @Test void sameBookDifferentPricesStaySeparateAndSnapshotsDoNotFollowSource(){
  var b=ready();long book=Long.parseLong(b.id());jdbc.update("update book_variant set stock=2 where book_copy_id=?",book);
  var d=drafts.create(new CreateRequest(Long.toString(customer()),"KEEP",UUID.randomUUID()),owner);long id=Long.parseLong(d.id());
  drafts.addItem(id,item(0,"CATALOG",b.id(),null,120000L,1,null,null),owner);
  drafts.addItem(id,item(1,"CATALOG",b.id(),null,150000L,1,300L,null),owner);
  var detail=orders.require(id,false);assertThat(detail.items()).hasSize(2);assertThat(detail.totalQuantity()).isEqualTo(2);assertThat(detail.totals().goodsTotal()).isEqualTo(270000);assertThat(detail.totals().totalBookWeightGrams()).isEqualTo(550);
  jdbc.update("update book_copy set title='Changed original',weight_g=999 where id=?",book);
  assertThat(orders.require(id,false).items()).extracting(OrderItem::titleSnapshot).containsExactly(b.title(),b.title());
  assertThat(jdbc.queryForObject("select sum(stock) from book_variant where book_copy_id=?",Long.class,book)).isEqualTo(2);
  assertThatThrownBy(()->drafts.addItem(id,item(2,"CATALOG",b.id(),null,1L,1,1L,null),owner)).isInstanceOfSatisfying(AdminApiException.class,e->assertThat(e.error).isEqualTo("stock_conflict"));
  assertThat(orders.require(id,false).items()).hasSize(2);
 }
 @Test void manualDoesNotCreateCatalogueAndRequiresPriceAndWeight(){
  long id=draft();long books=jdbc.queryForObject("select count(*) from book_copy",Long.class);
  drafts.addItem(id,item(0,"MANUAL",null,"Outside synthetic",75000L,2,250L,null),owner);
  var d=orders.require(id,false);assertThat(d.items().getFirst().bookCopyId()).isNull();assertThat(d.totals().goodsTotal()).isEqualTo(150000);assertThat(d.totals().totalBookWeightGrams()).isEqualTo(500);
  assertThat(jdbc.queryForObject("select count(*) from book_copy",Long.class)).isEqualTo(books);
  assertThatThrownBy(()->drafts.addItem(id,item(1,"MANUAL",null,"Other",null,1,250L,null),owner)).isInstanceOf(AdminApiException.class);
  assertThatThrownBy(()->drafts.addItem(id,item(1,"MANUAL",null,"Other",100L,1,null,null),owner)).isInstanceOf(AdminApiException.class);
 }
 @Test void archivedCustomerAndSwitchAfterPaymentAreBlocked(){
  long archived=customer();jdbc.update("update customer set status='ARCHIVED' where id=?",archived);
  assertThatThrownBy(()->drafts.create(new CreateRequest(Long.toString(archived),"IMMEDIATE",UUID.randomUUID()),owner)).isInstanceOf(AdminApiException.class);
  long id=draft();jdbc.update("insert into order_payments(order_id,transaction_type,amount,payment_method,occurred_at,created_by) values(?,'DEPOSIT',100000,'CASH',current_timestamp,?)",id,owner.getId());
  assertThatThrownBy(()->drafts.update(id,new UpdateRequest(0L,UUID.randomUUID(),Long.toString(customer()),"IMMEDIATE",0L,null,null,null,null,null,false),owner)).isInstanceOfSatisfying(AdminApiException.class,e->assertThat(e.status).isEqualTo(409));
 }
 @Test void manualConfirmationIsBoundToCurrentMatchesAndTitle(){
  var b=ready();long id=draft();var matches=matching.match(b.title());
  assertThatThrownBy(()->drafts.addItem(id,item(0,"MANUAL",null,b.title(),1L,1,1L,null),owner)).isInstanceOfSatisfying(CatalogMatchService.ManualMatchException.class,e->assertThat(e.matches.items()).isNotEmpty());
  var confirmation=new MatchConfirmation(matches.normalizedTitle(),matches.fingerprint(),"Different physical copy");
  drafts.addItem(id,item(0,"MANUAL",null,b.title(),1L,1,1L,confirmation),owner);
  ready();
  assertThatThrownBy(()->drafts.addItem(id,item(1,"MANUAL",null,b.title(),1L,1,1L,confirmation),owner)).isInstanceOf(CatalogMatchService.ManualMatchException.class);
 }
 @Test void keepingItemChangesReconcileOnlyDelta(){
  var b=ready();long book=Long.parseLong(b.id()),id=draft();jdbc.update("update book_variant set stock=2 where book_copy_id=?",book);
  drafts.addItem(id,item(0,"CATALOG",b.id(),null,100L,1,250L,null),owner);
  jdbc.update("update orders set status='KEEPING',fulfillment_type='KEEP',keep_started_at=current_timestamp,keep_until=current_timestamp+interval '14 days' where id=?",id);
  jdbc.update("update book_variant set stock=1 where book_copy_id=?",book);
  jdbc.update("insert into order_reservation(order_id,book_copy_id,quantity,state) values(?,?,1,'ACTIVE')",id,book);
  drafts.addItem(id,item(1,"CATALOG",b.id(),null,200L,1,300L,null),owner);
  assertThat(queries.detail(book,owner).totalStock()).isZero();
  var last=orders.require(id,false).items().getLast();drafts.removeItem(id,Long.parseLong(last.id()),new MutationMeta(2L,UUID.randomUUID()),owner);
  assertThat(queries.detail(book,owner).totalStock()).isEqualTo(1);
 }
}
