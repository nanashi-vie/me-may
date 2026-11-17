package vn.memay.order;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import vn.memay.support.OrderTestSupport;
import vn.memay.common.AdminApiException;
import java.util.*;
import static vn.memay.order.OrderDtos.*;
import static org.assertj.core.api.Assertions.*;
class OrderPaymentTest extends OrderTestSupport {
 @Autowired OrderPaymentService payments;@Autowired OrderKeepService keep;
 private long invoice(){long id=draft();manual(id,500000,1,250);jdbc.update("update orders set shipping_fee=30000 where id=?",id);return id;}
 private PaymentRequest pay(long v,PaymentType type,long amount,boolean actual){return new PaymentRequest(v,UUID.randomUUID(),type,amount,"CASH",null,null,actual);}
 @Test void depositPlusShippingBalance(){
  long id=invoice();payments.record(id,pay(0,PaymentType.DEPOSIT,100000,false),owner);
  var d=orders.require(id,false);assertThat(d.totals().balance()).isEqualTo(430000);assertThat(d.totals().paidAmount()).isEqualTo(100000);assertThat(d.totals().paymentStatus()).isEqualTo("PARTIALLY_PAID");
  payments.record(id,pay(1,PaymentType.PAYMENT,500000,false),owner);assertThat(orders.require(id,false).totals().paymentStatus()).isEqualTo("OVERPAID");
  assertThatThrownBy(()->payments.record(id,pay(2,PaymentType.PAYMENT,0,false),owner)).isInstanceOf(AdminApiException.class);
 }
 @Test void refundRequiresActualConfirmationAndRetryDoesNotDuplicate(){
  long id=invoice();payments.record(id,pay(0,PaymentType.DEPOSIT,100000,false),owner);
  assertThatThrownBy(()->payments.record(id,pay(1,PaymentType.REFUND,40000,false),owner)).isInstanceOf(AdminApiException.class);
  var actual=pay(1,PaymentType.REFUND,40000,true);var first=payments.record(id,actual,owner);assertThat(payments.record(id,actual,owner)).isEqualTo(first);
  var d=orders.require(id,false);assertThat(d.payments()).hasSize(2);assertThat(d.totals().paidAmount()).isEqualTo(60000);
  assertThatThrownBy(()->payments.record(id,pay(2,PaymentType.REFUND,60001,true),owner)).isInstanceOf(AdminApiException.class);
 }
 @Test void voidCannotMakeRefundExceedReceiptsAndKeepsHistory(){
  long id=invoice();payments.record(id,pay(0,PaymentType.DEPOSIT,100000,false),owner);payments.record(id,pay(1,PaymentType.REFUND,40000,true),owner);
  var rows=orders.require(id,false).payments();long deposit=Long.parseLong(rows.getFirst().id()),refund=Long.parseLong(rows.getLast().id());
  assertThatThrownBy(()->payments.voidPayment(id,deposit,new ReasonRequest(2L,UUID.randomUUID(),"Wrong amount"),owner)).isInstanceOf(AdminApiException.class);
  assertThat(orders.require(id,false).payments().getFirst().voidedAt()).isNull();
  payments.voidPayment(id,refund,new ReasonRequest(2L,UUID.randomUUID(),"Incorrect refund entry"),owner);
  var d=orders.require(id,false);assertThat(d.payments()).hasSize(2);assertThat(d.payments().getLast().voidReason()).isEqualTo("Incorrect refund entry");assertThat(d.totals().paidAmount()).isEqualTo(100000);
 }
 @Test void cancelledOrderAllowsActualRefundButNoNewPayment(){
  long id=invoice();payments.record(id,pay(0,PaymentType.DEPOSIT,100000,false),owner);keep.cancel(id,new ReasonRequest(1L,UUID.randomUUID(),"Customer cancelled"),owner);
  assertThat(orders.require(id,false).payments()).hasSize(1);
  assertThatThrownBy(()->payments.record(id,pay(2,PaymentType.PAYMENT,1,false),owner)).isInstanceOfSatisfying(AdminApiException.class,e->assertThat(e.status).isEqualTo(409));
  payments.record(id,pay(2,PaymentType.REFUND,100000,true),owner);assertThat(orders.require(id,false).totals().paidAmount()).isZero();
 }
 @Test void receiptChangesReviewCodOnlyForUnsentShipment(){
  long id=invoice();jdbc.update("update orders set status='READY_TO_SHIP',cod_needs_review=false where id=?",id);
  payments.record(id,pay(0,PaymentType.DEPOSIT,100000,false),owner);assertThat(orders.require(id,false).codNeedsReview()).isTrue();
  jdbc.update("update orders set status='COMPLETED',cod_needs_review=false where id=?",id);
  payments.record(id,pay(1,PaymentType.PAYMENT,10000,false),owner);assertThat(orders.require(id,false).codNeedsReview()).isFalse();
 }
}
