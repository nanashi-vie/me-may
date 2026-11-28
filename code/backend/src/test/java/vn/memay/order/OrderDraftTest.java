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
 @Test void saleDateDefaultsToTodayCanBeCorrectedAndSortsLines(){
  long id=draft();var today=java.time.LocalDate.now(OrderValidation.ZONE);
  drafts.addItem(id,item(0,"MANUAL",null,"Sold today synthetic",1000L,1,100L,null),owner);
  var first=orders.require(id,false).items().getFirst();assertThat(first.soldOn()).isEqualTo(today);
  drafts.addItem(id,new ItemRequest(1L,UUID.randomUUID(),"MANUAL",null,"Sold earlier synthetic",2000L,1L,100L,null,null,today.minusDays(1).toString()),owner);
  assertThat(orders.require(id,false).items()).extracting(OrderItem::titleSnapshot).containsExactly("Sold earlier synthetic","Sold today synthetic");
  assertThatThrownBy(()->drafts.updateItem(id,Long.parseLong(first.id()),new ItemRequest(2L,UUID.randomUUID(),null,null,first.titleSnapshot(),1000L,1L,100L,null,null,today.plusDays(1).toString()),owner)).isInstanceOfSatisfying(AdminApiException.class,e->assertThat(e.status).isEqualTo(400));
  drafts.updateItem(id,Long.parseLong(first.id()),new ItemRequest(2L,UUID.randomUUID(),null,null,first.titleSnapshot(),1500L,1L,100L,null,null,today.minusDays(3).toString()),owner);
  var lines=orders.require(id,false).items();assertThat(lines.getFirst().titleSnapshot()).isEqualTo("Sold today synthetic");assertThat(lines.getFirst().soldOn()).isEqualTo(today.minusDays(3));
  drafts.updateItem(id,Long.parseLong(first.id()),item(3,"MANUAL",null,first.titleSnapshot(),1500L,1,100L,null),owner);
  assertThat(orders.require(id,false).items().getFirst().soldOn()).isEqualTo(today.minusDays(3));
 }
 @Autowired OrderQueryService orderQueries;
 @Test void outsideBookLotIsTrimmedOptionalSuggestedAndRefusedForWebsiteBooks(){
  long id=draft();
  drafts.addItem(id,new ItemRequest(0L,UUID.randomUUID(),"MANUAL",null,"Lot synthetic",1000L,1L,100L,null,null,null,"  Lô Mỹ 11/26 "),owner);
  var line=orders.require(id,false).items().getFirst();assertThat(line.lotLabel()).isEqualTo("Lô Mỹ 11/26");
  assertThat(orderQueries.recentLots(owner)).first().isEqualTo("Lô Mỹ 11/26");
  drafts.updateItem(id,Long.parseLong(line.id()),new ItemRequest(1L,UUID.randomUUID(),null,null,line.titleSnapshot(),1000L,1L,100L,null,null,null,""),owner);
  assertThat(orders.require(id,false).items().getFirst().lotLabel()).isNull();
  assertThatThrownBy(()->drafts.addItem(id,new ItemRequest(2L,UUID.randomUUID(),"MANUAL",null,"Long lot",1000L,1L,100L,null,null,null,"x".repeat(61)),owner)).isInstanceOf(AdminApiException.class);
  var b=ready();
  assertThatThrownBy(()->drafts.addItem(id,new ItemRequest(2L,UUID.randomUUID(),"CATALOG",b.id(),null,1000L,1L,100L,null,null,null,"Lô web"),owner)).isInstanceOfSatisfying(AdminApiException.class,e->assertThat(e.status).isEqualTo(400));
 }
 @Test void orderSearchMatchesCustomerSocialChannels(){
  long id=draft();jdbc.update("update customer set zalo_name='Huyền Hab',tiktok_id='em bé hyhy',threads_id='minh.threads' where id=(select customer_id from orders where id=?)",id);
  for(String q:List.of("hyhy","@em bé","huyền hab","MINH.THREADS"))
   assertThat(orderQueries.list(new OrderFilter(q,"ALL",null,null,null,"ALL",0,20,"ALL"),owner).items()).as(q).extracting(OrderSummary::id).contains(Long.toString(id));
  assertThat(orderQueries.list(new OrderFilter("không-có-kênh-này","ALL",null,null,null,"ALL",0,20,"ALL"),owner).items()).isEmpty();
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
  long id=draft();jdbc.update("insert into order_payments(order_id,transaction_type,amount,occurred_at,created_by) values(?,'DEPOSIT',100000,current_timestamp,?)",id,owner.getId());
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
  var last=orders.require(id,false).items().getLast();drafts.removeItem(id,Long.parseLong(last.id()),new ReasonRequest(2L,UUID.randomUUID(),"Book no longer wanted"),owner);
  assertThat(queries.detail(book,owner).totalStock()).isEqualTo(1);
 }
 @Autowired OrderKeepService keeps;
 private long removableKeep(){var b=ready();jdbc.update("update book_variant set stock=2 where book_copy_id=?",Long.parseLong(b.id()));var d=drafts.create(new CreateRequest(Long.toString(customer()),"KEEP",UUID.randomUUID()),owner);long id=Long.parseLong(d.id());drafts.addItem(id,item(0,"CATALOG",b.id(),null,100L,2,250L,null),owner);keeps.keep(id,new KeepRequest(1L,UUID.randomUUID(),true,"Owner keep exception"),owner);return id;}
 @Test void removingKeepingItemRequiresReason(){
  long id=removableKeep();var d=orders.require(id,false);var line=d.items().getFirst();
  assertThatThrownBy(()->drafts.removeItem(id,Long.parseLong(line.id()),new ReasonRequest(2L,UUID.randomUUID(),null),owner)).isInstanceOfSatisfying(AdminApiException.class,e->assertThat(e.status).isEqualTo(400));
  assertThat(orders.require(id,false).items()).hasSize(1);assertThat(queries.detail(Long.parseLong(line.bookCopyId()),owner).totalStock()).isZero();assertThat(orders.require(id,false).version()).isEqualTo(2);
 }
 @Test void reducingKeepingQuantityAlsoRequiresReason(){
  long id=removableKeep();var line=orders.require(id,false).items().getFirst();
  assertThatThrownBy(()->drafts.updateItem(id,Long.parseLong(line.id()),item(2,"CATALOG",line.bookCopyId(),null,100L,1,250L,null),owner)).isInstanceOfSatisfying(AdminApiException.class,e->assertThat(e.status).isEqualTo(400));
  assertThat(queries.detail(Long.parseLong(line.bookCopyId()),owner).totalStock()).isZero();assertThat(orders.require(id,false).items().getFirst().quantity()).isEqualTo(2);
 }

 @Test void reasonHistorySurvivesDeletionAndRetryRestoresOnlyOnce(){
  long id=removableKeep();var line=orders.require(id,false).items().getFirst();var r=new ReasonRequest(2L,UUID.randomUUID(),"Customer changed choice");
  assertThatThrownBy(()->drafts.removeItem(id,Long.parseLong(line.id()),new ReasonRequest(2L,UUID.randomUUID(),"  "),owner)).isInstanceOf(AdminApiException.class);
  var first=drafts.removeItem(id,Long.parseLong(line.id()),r,owner);assertThat(drafts.removeItem(id,Long.parseLong(line.id()),r,owner)).isEqualTo(first);
  var d=orders.require(id,false);assertThat(d.items()).isEmpty();assertThat(queries.detail(Long.parseLong(line.bookCopyId()),owner).totalStock()).isEqualTo(2);
  var note=d.notes().getLast();assertThat(note.reason()).isEqualTo("Customer changed choice");assertThat(note.itemId()).isEqualTo(line.id());assertThat(note.bookCodeSnapshot()).isEqualTo(line.bookCodeSnapshot());assertThat(note.titleSnapshot()).isEqualTo(line.titleSnapshot());assertThat(note.quantityRemoved()).isEqualTo(2);assertThat(note.actorId()).isEqualTo(owner.getId().toString());
 }
 @Test void quantityReductionStoresReasonAndRemovedQuantity(){
  long id=removableKeep();var line=orders.require(id,false).items().getFirst();
  drafts.updateItem(id,Long.parseLong(line.id()),new ItemRequest(2L,UUID.randomUUID(),"CATALOG",line.bookCopyId(),null,100L,1L,250L,null,"Customer reduced quantity"),owner);
  var d=orders.require(id,false);assertThat(d.items().getFirst().quantity()).isEqualTo(1);assertThat(d.notes().getLast().quantityRemoved()).isEqualTo(1);assertThat(d.notes().getLast().reason()).isEqualTo("Customer reduced quantity");assertThat(queries.detail(Long.parseLong(line.bookCopyId()),owner).totalStock()).isEqualTo(1);
 }
 @Test void draftRemovalDoesNotRequireReason(){long id=draft();long item=manual(id,100L,1,250);drafts.removeItem(id,item,new ReasonRequest(0L,UUID.randomUUID(),null),owner);assertThat(orders.require(id,false).items()).isEmpty();}

 private void rename(String id,String title){jdbc.update("update book_copy set title=? where id=?",title,Long.parseLong(id));}
 @Test void nearTitleSavesWithoutReason(){
  rename(ready().id(),"Harry Potter tập 3");long id=draft();
  drafts.addItem(id,item(0,"MANUAL",null,"Harry Potter tập 2",1L,1,1L,null),owner);
  assertThat(orders.require(id,false).items().getFirst().manualMatchOverrideReason()).isNull();
 }
 @Test void titleDifferingOnlyByPunctuationStillNeedsConfirmation(){
  rename(ready().id(),"Totto-chan!");long id=draft();
  assertThatThrownBy(()->drafts.addItem(id,item(0,"MANUAL",null,"totto chan",1L,1,1L,null),owner)).isInstanceOfSatisfying(CatalogMatchService.ManualMatchException.class,e->assertThat(e.matches.items().getFirst().exact()).isTrue());
 }
 @Test void unchangedOldLineKeepsStoredReasonWhenNoLongerExact(){
  var b=ready();long id=draft();var m=matching.match(b.title());
  drafts.addItem(id,item(0,"MANUAL",null,b.title(),75000L,1,1L,new MatchConfirmation(m.normalizedTitle(),m.fingerprint(),"Different physical copy")),owner);
  long itemId=Long.parseLong(orders.require(id,false).items().getFirst().id());
  rename(b.id(),"Hoàn toàn khác");
  drafts.updateItem(id,itemId,item(1,"MANUAL",null,b.title(),99000L,1,1L,null),owner);
  var row=jdbc.queryForMap("select manual_match_override_reason r,manual_match_evidence e,unit_price_vnd p from order_items where id=?",itemId);
  assertThat(row).containsEntry("r","Different physical copy").containsEntry("e",m.fingerprint()).containsEntry("p",99000L);
  drafts.updateItem(id,itemId,item(2,"MANUAL",null,"Tên mới hẳn",99000L,1,1L,null),owner);
  assertThat(orders.require(id,false).items().getFirst().manualMatchOverrideReason()).isNull();
 }
}
