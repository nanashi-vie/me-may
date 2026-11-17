package vn.memay.order;
import java.math.BigInteger;
import java.text.Normalizer;
import java.time.*;
import java.util.*;
import vn.memay.common.AdminApiException;
import static vn.memay.order.OrderDtos.*;
public final class OrderValidation {
 public static final long MAX=9007199254740991L, MAX_PRICE=999999999999L;
 public static final ZoneId ZONE=ZoneId.of("Asia/Ho_Chi_Minh");
 private OrderValidation(){}
 public static long number(Long n,String field,long min,long max){if(n==null||n<min||n>max)throw AdminApiException.field(field,"Giá trị không hợp lệ");return n;}
 public static long checked(BigInteger n,String field){if(n.signum()<0||n.compareTo(BigInteger.valueOf(MAX))>0)throw AdminApiException.field(field,"Tổng vượt giới hạn");return n.longValueExact();}
 public static long add(long a,long b,String field){return checked(BigInteger.valueOf(a).add(BigInteger.valueOf(b)),field);}
 public static Totals totals(List<ItemValue> items,long discount,Long shipping,List<PaymentValue> payments){
  if(items.size()>1000)throw AdminApiException.field("items","Tối đa 1000 dòng");
  long subtotal=0,weight=0,received=0,refunded=0;boolean known=true;
  for(var i:items){number(i.unitPriceVnd(),"unitPriceVnd",0,MAX_PRICE);number(i.quantity(),"quantity",1,999999);
   subtotal=add(subtotal,checked(BigInteger.valueOf(i.unitPriceVnd()).multiply(BigInteger.valueOf(i.quantity())),"subtotal"),"subtotal");
   if(i.unitWeightGrams()==null)known=false;
   else{number(i.unitWeightGrams(),"unitWeightGrams",1,MAX);weight=add(weight,checked(BigInteger.valueOf(i.unitWeightGrams()).multiply(BigInteger.valueOf(i.quantity())),"totalBookWeightGrams"),"totalBookWeightGrams");}
  }
  number(discount,"discountAmount",0,subtotal);long goods=subtotal-discount;
  for(var p:payments){number(p.amount(),"amount",1,MAX);if(p.type()==null)throw AdminApiException.field("transactionType","Chọn loại giao dịch");if(p.voided())continue;
   if(p.type()==PaymentType.REFUND)refunded=add(refunded,p.amount(),"refunded");else received=add(received,p.amount(),"received");}
  if(refunded>received)throw AdminApiException.field("amount","Tiền hoàn vượt tiền đã nhận");
  long paid=received-refunded;Long total=shipping==null?null:add(goods,number(shipping,"shippingFee",0,MAX),"orderTotal");
  String state=total==null?"PROVISIONAL":paid>total?"OVERPAID":paid==total?"PAID":paid==0?"UNPAID":"PARTIALLY_PAID";
  return new Totals(subtotal,goods,total,paid,total==null?null:total-paid,known?weight:null,shipping==null,state);
 }
 public static Instant keepUntil(Instant started,int days){return started.atZone(ZONE).toLocalDate().plusDays(days+1L).atStartOfDay(ZONE).toInstant();}
 public static String text(String v,String field,int max,boolean required){var s=v==null?null:v.trim();if(s!=null&&s.isEmpty())s=null;if(required&&s==null||s!=null&&s.length()>max)throw AdminApiException.field(field,"Kiểm tra nội dung và độ dài");return s;}
 public static String normalizeTitle(String title){if(title==null)return "";return Normalizer.normalize(title.toLowerCase(Locale.ROOT),Normalizer.Form.NFD).replaceAll("\\p{M}","").replace('đ','d').trim().replaceAll("\\s+"," ");}
 public static void transition(boolean valid){if(!valid)throw new AdminApiException(409,"transition_conflict");}
}
