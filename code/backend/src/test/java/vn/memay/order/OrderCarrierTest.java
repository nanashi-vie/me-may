package vn.memay.order;
import org.junit.jupiter.api.Test;
import vn.memay.common.AdminApiException;
import vn.memay.support.OrderShippingTestSupport;
import java.util.*;
import static vn.memay.order.OrderDtos.*;
import static org.assertj.core.api.Assertions.*;
/** Owner 27/11/2026: J&T, Shopee Express or customer pickup; tracking codes checked; a payment without receipt needs a note. */
class OrderCarrierTest extends OrderShippingTestSupport {
 private ShippingRequest bill(long v,String provider,String address,Long fee,Long weight,String mode){
  return new ShippingRequest(v,UUID.randomUUID(),"Synthetic receiver","0901234567",address,fee,weight,true,true,0L,true,"PP_CASH",mode,null,0L,null,provider);
 }
 private PaymentRequest unreceipted(long v,long amount,String note){return new PaymentRequest(v,UUID.randomUUID(),PaymentType.DEPOSIT,amount,note,false);}
 private static String field(Throwable e){return ((AdminApiException)e).fieldErrors.keySet().iterator().next();}

 @Test void newOrdersShipWithJntByDefault(){
  long id=readyOrder();var d=orders.require(id,false);
  assertThat(d.shippingProvider()).isEqualTo("JNT");
  assertThat(d.shipments().getFirst().shippingSnapshot()).containsEntry("shippingProvider","JNT");
 }
 @Test void pickupBillNeedsOnlyNameAndPhoneAndChargesNoShipping(){
  long id=sale(1);
  shipping.finalizeOrder(id,bill(1,"PICKUP",null,null,null,null),owner);
  var d=orders.require(id,false);
  assertThat(d.shippingProvider()).isEqualTo("PICKUP");
  assertThat(d.shippingFee()).isZero();assertThat(d.codAmount()).isZero();assertThat(d.parcelWeightGrams()).isNull();
  assertThat(d.totals().orderTotal()).isEqualTo(500000);
  assertThat(d.shipments().getFirst().shippingSnapshot()).containsEntry("shippingProvider","PICKUP");
 }
 @Test void pickupHandsOverOnlyWhenPaidAndWithoutTracking(){
  long id=sale(1);shipping.finalizeOrder(id,bill(1,"PICKUP",null,null,null,null),owner);
  assertThatThrownBy(()->shipping.ship(id,new ShipRequest(2L,UUID.randomUUID(),null),owner)).satisfies(e->assertThat(field(e)).isEqualTo("balance"));
  payments.record(id,unreceipted(2,500000,"Paid in cash at the shop"),null,owner);
  shipping.ship(id,new ShipRequest(3L,UUID.randomUUID(),null),owner);
  var d=orders.require(id,false);
  assertThat(d.status()).isEqualTo(Status.COMPLETED);assertThat(d.trackingCode()).isNull();
  assertThat(d.payments().getFirst().hasProof()).isFalse();
 }
 @Test void trackingIsTrimmedUpperCasedAndChecked(){
  long id=readyOrder();
  for(var bad:List.of("hi","AB-12345678","A".repeat(31)))
   assertThatThrownBy(()->shipping.ship(id,new ShipRequest(2L,UUID.randomUUID(),bad),owner)).satisfies(e->assertThat(field(e)).isEqualTo("trackingCode"));
  shipping.ship(id,new ShipRequest(2L,UUID.randomUUID()," jt 0123 4567 89 "),owner);
  assertThat(orders.require(id,false).trackingCode()).isEqualTo("JT0123456789");
 }
 @Test void trackingCannotRepeatAnotherOrder(){
  long first=readyOrder();shipping.ship(first,new ShipRequest(2L,UUID.randomUUID(),"SPXVN0123456789"),owner);
  long second=readyOrder();
  assertThatThrownBy(()->shipping.ship(second,new ShipRequest(2L,UUID.randomUUID(),"spxvn0123456789"),owner)).satisfies(e->assertThat(field(e)).isEqualTo("trackingCode"));
 }
 @Test void handoverSwitchesBetweenCarriersButNotToPickup(){
  long id=readyOrder();
  assertThatThrownBy(()->shipping.ship(id,new ShipRequest(2L,UUID.randomUUID(),null,"PICKUP"),owner)).satisfies(e->assertThat(field(e)).isEqualTo("shippingProvider"));
  shipping.ship(id,new ShipRequest(2L,UUID.randomUUID(),"SPXVN0000000001","SPX"),owner);
  var d=orders.require(id,false);
  assertThat(d.shippingProvider()).isEqualTo("SPX");assertThat(d.shipments().getFirst().shippingSnapshot()).containsEntry("shippingProvider","SPX");
 }
 @Test void correctionCanFixTheCarrierWithAReason(){
  long id=readyOrder();shipping.ship(id,new ShipRequest(2L,UUID.randomUUID(),"JT0000000001"),owner);
  var fix=new ShippingRequest(3L,UUID.randomUUID(),null,null,null,null,null,null,null,null,null,null,null,"SPXVN0000000002",null,"Wrong carrier","SPX");
  shipping.updateShipping(id,fix,owner);
  var d=orders.require(id,false);
  assertThat(d.shippingProvider()).isEqualTo("SPX");assertThat(d.trackingCode()).isEqualTo("SPXVN0000000002");
  assertThat(d.shipments().getFirst().shippingSnapshot()).containsEntry("shippingProvider","SPX");
  var toPickup=new ShippingRequest(4L,UUID.randomUUID(),null,null,null,null,null,null,null,null,null,null,null,"SPXVN0000000002",null,"Wrong carrier","PICKUP");
  assertThatThrownBy(()->shipping.updateShipping(id,toPickup,owner)).satisfies(e->assertThat(field(e)).isEqualTo("shippingProvider"));
 }
 @Test void paymentWithoutReceiptNeedsANote(){
  long id=sale(1);
  for(var note:Arrays.asList(null,"  "))
   assertThatThrownBy(()->payments.record(id,unreceipted(1,1000,note),null,owner)).satisfies(e->assertThat(field(e)).isEqualTo("proof"));
  payments.record(id,unreceipted(1,1000,"Paid in cash at the shop"),null,owner);
  var paid=orders.require(id,false).payments().getFirst();
  assertThat(paid.hasProof()).isFalse();assertThat(paid.note()).isEqualTo("Paid in cash at the shop");
 }
}
