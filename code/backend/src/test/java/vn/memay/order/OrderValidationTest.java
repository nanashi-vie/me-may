package vn.memay.order;
import org.junit.jupiter.api.Test;
import java.time.Instant;
import java.util.List;
import static org.assertj.core.api.Assertions.*;
import static vn.memay.order.OrderDtos.*;
class OrderValidationTest {
 @Test void totalsIncludeShippingNotDepositTwice(){
  var t=OrderValidation.totals(List.of(new ItemValue(650000L,1,1250L)),50000,35000L,List.of(new PaymentValue(PaymentType.DEPOSIT,100000,false)));
  assertThat(t.goodsTotal()).isEqualTo(600000);assertThat(t.orderTotal()).isEqualTo(635000);assertThat(t.balance()).isEqualTo(535000);assertThat(t.totalBookWeightGrams()).isEqualTo(1250);assertThat(t.paymentStatus()).isEqualTo("PARTIALLY_PAID");
 }
 @Test void missingShippingAndWeightAreUnknown(){
  var t=OrderValidation.totals(List.of(new ItemValue(75000L,2,null)),0,null,List.of());
  assertThat(t.orderTotal()).isNull();assertThat(t.balance()).isNull();assertThat(t.totalBookWeightGrams()).isNull();assertThat(t.provisional()).isTrue();
 }
 @Test void refundAndVoidUseActualNetMoney(){
  var t=OrderValidation.totals(List.of(new ItemValue(0L,1,250L)),0,0L,List.of(new PaymentValue(PaymentType.DEPOSIT,500000,true),new PaymentValue(PaymentType.DEPOSIT,100000,false),new PaymentValue(PaymentType.REFUND,20000,false)));
  assertThat(t.paidAmount()).isEqualTo(80000);assertThat(t.balance()).isEqualTo(-80000);assertThat(t.paymentStatus()).isEqualTo("OVERPAID");
  assertThatThrownBy(()->OrderValidation.totals(List.of(),0,0L,List.of(new PaymentValue(PaymentType.REFUND,1,false)))).isInstanceOf(vn.memay.common.AdminApiException.class);
 }
 @Test void invalidAndOverflowNeverClamp(){
  assertThatThrownBy(()->OrderValidation.totals(List.of(new ItemValue(999999999999L,999999,1L)),0,0L,List.of())).isInstanceOf(vn.memay.common.AdminApiException.class);
  assertThatThrownBy(()->OrderValidation.totals(List.of(new ItemValue(100L,1,1L)),101,0L,List.of())).isInstanceOf(vn.memay.common.AdminApiException.class);
 }
 @Test void keepUsesLocalCalendarAndNotMonthArithmetic(){
  var started=Instant.parse("2026-11-16T05:12:00Z");
  assertThat(OrderValidation.keepUntil(started,14)).isEqualTo(Instant.parse("2026-11-30T17:00:00Z"));
  assertThat(OrderValidation.keepUntil(started,30)).isEqualTo(Instant.parse("2026-12-16T17:00:00Z"));
  assertThat(OrderValidation.keepUntil(Instant.parse("2028-02-28T12:00:00Z"),14)).isEqualTo(Instant.parse("2028-03-13T17:00:00Z"));
 }
 @Test void normalizedTitleHandlesAccentsAndWhitespace(){assertThat(OrderValidation.normalizeTitle("  ĐỐM   và Bé ")).isEqualTo("dom va be");}
}
