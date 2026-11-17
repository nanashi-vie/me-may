package vn.memay.order;
import org.junit.jupiter.api.Test;
import vn.memay.support.OrderShippingTestSupport;
import vn.memay.common.AdminApiException;
import java.util.*;
import static vn.memay.order.OrderDtos.*;
import static org.assertj.core.api.Assertions.*;
class OrderReturnTest extends OrderShippingTestSupport {
 @Test void failedResendAndAbortKeepStockMoneyAndWaybillHistory(){
  long id=failedOrder();var d=orders.require(id,false);long book=Long.parseLong(d.items().getFirst().bookCopyId());assertThat(queries.detail(book,owner).totalStock()).isZero();assertThat(d.payments()).isEmpty();
  var request=resendRequest(4,10000);shipping.resend(id,request,owner);assertThat(orders.require(id,false).shippingFee()).isEqualTo(40000);assertThat(queries.detail(book,owner).totalStock()).isZero();
  shipping.abortResend(id,new ReasonRequest(5L,UUID.randomUUID(),"Wait for customer"),owner);assertThat(orders.require(id,false).status()).isEqualTo(Status.UNSUCCESSFUL);
  shipping.resend(id,resendRequest(6,0),owner);shipping.ship(id,new ShipRequest(7L,UUID.randomUUID(),"TRACK-THREE"),owner);
  d=orders.require(id,false);assertThat(d.shipments()).hasSize(3);assertThat(d.shipments()).extracting(Shipment::state).containsExactly("FAILED","ABORTED","HANDED_OVER");assertThat(d.shipments().getFirst().trackingCode()).isEqualTo("TRACK-ONE");assertThat(d.shipments().getLast().trackingCode()).isEqualTo("TRACK-THREE");assertThat(d.shippingFee()).isEqualTo(40000);assertThat(d.payments()).isEmpty();assertThat(queries.detail(book,owner).totalStock()).isZero();
 }
 private ReturnRequest returned(long id,long version,boolean actual,long received,long restocked){var line=orders.require(id,false).items().getFirst();return new ReturnRequest(version,UUID.randomUUID(),"Carrier return confirmed",actual,List.of(new ReturnItem(line.id(),received,restocked,"Actual stock received")));}
 @Test void actualReturnRestocksOnceAndCannotResendClosedOrder(){
  long id=failedOrder();long book=Long.parseLong(orders.require(id,false).items().getFirst().bookCopyId());var r=returned(id,4,true,1,1);
  var first=shipping.returnOrder(id,r,owner);assertThat(first.status()).isEqualTo(Status.CANCELLED);assertThat(shipping.returnOrder(id,r,owner)).isEqualTo(first);
  var d=orders.require(id,false);assertThat(queries.detail(book,owner).totalStock()).isEqualTo(1);assertThat(d.payments()).isEmpty();assertThat(d.returns()).hasSize(1);assertThat(d.returns().getFirst().quantityRestocked()).isEqualTo(1);
  assertThatThrownBy(()->shipping.resend(id,resendRequest(5,0),owner)).isInstanceOf(AdminApiException.class);
 }
 @Test void invalidActualQuantitiesAndMissingConfirmationDoNotChangeStock(){
  long id=failedOrder();long book=Long.parseLong(orders.require(id,false).items().getFirst().bookCopyId());
  assertThatThrownBy(()->shipping.returnOrder(id,returned(id,4,false,1,1),owner)).isInstanceOf(AdminApiException.class);
  assertThatThrownBy(()->shipping.returnOrder(id,returned(id,4,true,0,1),owner)).isInstanceOf(AdminApiException.class);
  assertThatThrownBy(()->shipping.returnOrder(id,returned(id,4,true,2,2),owner)).isInstanceOf(AdminApiException.class);
  assertThat(queries.detail(book,owner).totalStock()).isZero();assertThat(orders.require(id,false).status()).isEqualTo(Status.UNSUCCESSFUL);assertThat(orders.require(id,false).returns()).isEmpty();
 }
 @Test void partialResellableCopiesAndManualItemsAreRecordedSeparately(){
  long id=sale(2);drafts.addItem(id,new ItemRequest(1L,UUID.randomUUID(),"MANUAL",null,"Outside stock",50000L,1L,100L,null),owner);shipping.finalizeOrder(id,shipping(2,30000L,650L,0),owner);shipping.ship(id,new ShipRequest(3L,UUID.randomUUID(),"TRACK-RETURN"),owner);shipping.fail(id,new ReasonRequest(4L,UUID.randomUUID(),"Returned"),owner);
  var d=orders.require(id,false);var catalog=d.items().getFirst();var manual=d.items().getLast();
  var r=new ReturnRequest(5L,UUID.randomUUID(),"Partial resellable return",true,List.of(new ReturnItem(catalog.id(),2L,1L,"One damaged"),new ReturnItem(manual.id(),1L,0L,"Outside stock")));
  shipping.returnOrder(id,r,owner);assertThat(queries.detail(Long.parseLong(catalog.bookCopyId()),owner).totalStock()).isEqualTo(1);assertThat(orders.require(id,false).returns()).hasSize(2);
  assertThat(jdbc.queryForObject("select returned_quantity from order_reservation where order_id=?",Long.class,id)).isEqualTo(2);assertThat(jdbc.queryForObject("select restocked_quantity from order_reservation where order_id=?",Long.class,id)).isEqualTo(1);
 }
 @Test void returnAuditFailureRollsBackStockAndRecords(){
  long id=failedOrder();long book=Long.parseLong(orders.require(id,false).items().getFirst().bookCopyId());jdbc.execute("alter table audit_event add constraint order_return_audit_failure check(target_type <> 'ORDER') not valid");
  try{assertThatThrownBy(()->shipping.returnOrder(id,returned(id,4,true,1,1),owner)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);assertThat(queries.detail(book,owner).totalStock()).isZero();assertThat(orders.require(id,false).status()).isEqualTo(Status.UNSUCCESSFUL);assertThat(orders.require(id,false).returns()).isEmpty();}
  finally{jdbc.execute("alter table audit_event drop constraint order_return_audit_failure");}
 }
}
