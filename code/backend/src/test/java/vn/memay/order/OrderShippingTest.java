package vn.memay.order;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import vn.memay.support.OrderShippingTestSupport;
import vn.memay.common.AdminApiException;
import java.util.*;
import static vn.memay.order.OrderDtos.*;
import static org.assertj.core.api.Assertions.*;
class OrderShippingTest extends OrderShippingTestSupport {
 @Autowired OrderKeepService keeps;
 @Test void handoffCompletesWithoutMarkingPaidAndRetryNeverDeductsAgain(){
  long id=readyOrder();var before=orders.require(id,false);long book=Long.parseLong(before.items().getFirst().bookCopyId());var request=new ShipRequest(2L,UUID.randomUUID(),"TRACK-ONE");
  var result=shipping.ship(id,request,owner);assertThat(result.status()).isEqualTo(Status.COMPLETED);assertThat(shipping.ship(id,request,owner)).isEqualTo(result);
  var after=orders.require(id,false);assertThat(after.totals().paidAmount()).isEqualTo(before.totals().paidAmount());assertThat(after.totals().balance()).isEqualTo(530000);assertThat(queries.detail(book,owner).totalStock()).isZero();assertThat(after.shipments()).hasSize(1);assertThat(after.shipments().getFirst().handedOverAt()).isNotNull();assertThat(after.declaredValue()).isEqualTo(500000);
 }
 @Test void finalizeRequiresFeeEveryItemWeightAndCodConfirmation(){
  long id=sale(1);assertThatThrownBy(()->shipping.finalizeOrder(id,shipping(1,null,300L,0),owner)).isInstanceOf(AdminApiException.class);
  var noCod=new ShippingRequest(1L,UUID.randomUUID(),"Synthetic receiver","0901234567","Synthetic address",30000L,300L,true,true,0L,false,"PP_CASH",null,0L,null);
  assertThatThrownBy(()->shipping.finalizeOrder(id,noCod,owner)).isInstanceOf(AdminApiException.class);
  jdbc.update("update order_items set unit_weight_grams=null where order_id=?",id);
  assertThatThrownBy(()->shipping.finalizeOrder(id,shipping(1,30000L,300L,0),owner)).isInstanceOf(AdminApiException.class);
  assertThat(orders.require(id,false).status()).isEqualTo(Status.DRAFT);assertThat(queries.detail(Long.parseLong(orders.require(id,false).items().getFirst().bookCopyId()),owner).totalStock()).isEqualTo(1);
 }
 @Test void changedItemsAfterWeightOverrideNeedExplicitReview(){
  long id=sale(1);jdbc.update("update orders set parcel_weight_grams=300,parcel_weight_overridden=true,parcel_weight_needs_review=true where id=?",id);
  var noReview=new ShippingRequest(1L,UUID.randomUUID(),"Synthetic receiver","0901234567","Synthetic address",30000L,300L,true,false,0L,true,"PP_CASH",null,0L,null);
  assertThatThrownBy(()->shipping.finalizeOrder(id,noReview,owner)).isInstanceOf(AdminApiException.class);
  shipping.finalizeOrder(id,shipping(1,30000L,350L,0),owner);assertThat(orders.require(id,false).parcelWeightGrams()).isEqualTo(350);assertThat(orders.require(id,false).parcelWeightNeedsReview()).isFalse();
 }
 @Test void receiptOrFeeChangesRequireCodReviewBeforeHandoff(){
  long id=readyOrder();payments.record(id,new PaymentRequest(2L,UUID.randomUUID(),PaymentType.DEPOSIT,100000L,"CASH",null,null,false),owner);
  assertThatThrownBy(()->shipping.ship(id,new ShipRequest(3L,UUID.randomUUID(),"TRACK-ONE"),owner)).isInstanceOfSatisfying(AdminApiException.class,e->assertThat(e.error).isEqualTo("cod_review_required"));
  shipping.updateShipping(id,shipping(3,35000L,300L,435000),owner);var d=orders.require(id,false);assertThat(d.codNeedsReview()).isFalse();assertThat(d.codAmount()).isEqualTo(435000);assertThat(d.shipments().getFirst().shippingSnapshot().get("codAmount").toString()).isEqualTo("435000");shipping.ship(id,new ShipRequest(4L,UUID.randomUUID(),"TRACK-ONE"),owner);
 }
 @Test void feeAloneInvalidatesPreviouslyConfirmedCod(){
  long id=readyOrder();var req=new ShippingRequest(2L,UUID.randomUUID(),null,null,null,35000L,300L,true,true,0L,false,"PP_CASH",null,0L,null);
  assertThatThrownBy(()->shipping.updateShipping(id,req,owner)).isInstanceOf(AdminApiException.class);assertThat(orders.require(id,false).shippingFee()).isEqualTo(30000);
 }
 @Test void trackingRequiredAndCorrectionKeepsAuditReason(){
  long id=readyOrder();assertThatThrownBy(()->shipping.ship(id,new ShipRequest(2L,UUID.randomUUID()," "),owner)).isInstanceOf(AdminApiException.class);
  shipping.ship(id,new ShipRequest(2L,UUID.randomUUID(),"TRACK-ONE"),owner);
  var noReason=new ShippingRequest(3L,UUID.randomUUID(),null,null,null,null,null,null,null,null,null,null,"CORRECTED",null,null);
  assertThatThrownBy(()->shipping.updateShipping(id,noReason,owner)).isInstanceOf(AdminApiException.class);
  var correct=new ShippingRequest(3L,UUID.randomUUID(),null,null,null,null,null,null,null,null,null,null,"CORRECTED",null,"Correct mistyped tracking");
  shipping.updateShipping(id,correct,owner);var d=orders.require(id,false);assertThat(d.trackingCode()).isEqualTo("CORRECTED");assertThat(d.shipments().getFirst().trackingCode()).isEqualTo("CORRECTED");assertThat(d.notes().getLast().reason()).isEqualTo("Correct mistyped tracking");
  var data=jdbc.queryForObject("select after_data::text from audit_event where target_type='ORDER' and target_id=? and aggregate_version=4",String.class,id);assertThat(data).contains("CORRECTED").doesNotContain("Synthetic receiver","0901234567");
 }
 @Test void keepFinalizeAndHandoffDoNotDecrementAgain(){
  var b=ready();var d=drafts.create(new CreateRequest(Long.toString(customer()),"KEEP",UUID.randomUUID()),owner);long id=Long.parseLong(d.id());drafts.addItem(id,new ItemRequest(0L,UUID.randomUUID(),"CATALOG",b.id(),null,100000L,1L,250L,null),owner);
  keeps.keep(id,new KeepRequest(1L,UUID.randomUUID(),true,"Owner exception"),owner);shipping.finalizeOrder(id,shipping(2,0L,300L,0),owner);shipping.ship(id,new ShipRequest(3L,UUID.randomUUID(),"TRACK-KEEP"),owner);
  assertThat(queries.detail(Long.parseLong(b.id()),owner).totalStock()).isZero();assertThat(jdbc.queryForObject("select state from order_reservation where order_id=?",String.class,id)).isEqualTo("CONSUMED");
 }
}
