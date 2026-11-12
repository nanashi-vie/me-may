package vn.memay.customer;
import java.util.regex.Pattern;
import vn.memay.common.AdminApiException;
import static vn.memay.customer.CustomerDtos.*;
public final class CustomerValidation {
 private CustomerValidation(){}
 private static final Pattern LINK=Pattern.compile("(?i)^(?:[a-z][a-z0-9+.-]*://|//|www\\.|(?:[a-z0-9-]+\\.)*(?:zalo\\.me|zalo\\.com|tiktok\\.com|threads\\.net|threads\\.com)(?:[/:?#]|$))");
 public static CustomerWrite normalize(CustomerWrite w){
  String name=text(w.fullName(),"fullName",150);
  if(name==null)throw AdminApiException.field("fullName","Vui lòng nhập tên khách hàng");
  return new CustomerWrite(name,normalizePhone(w.phone()),text(w.defaultAddress(),"defaultAddress",500),username(w.zaloName(),"zaloName",150),username(w.tiktokId(),"tiktokId",100),username(w.threadsId(),"threadsId",100),text(w.note(),"note",1000));
 }
 private static String text(String v,String field,int max){
  if(v==null || v.strip().isEmpty())return null; v=v.strip();
  if(v.codePointCount(0,v.length())>max)throw AdminApiException.field(field,"Tối đa "+max+" ký tự"); return v;
 }
 private static String username(String v,String field,int max){v=text(v,field,max);if(v!=null&&LINK.matcher(v).find())throw AdminApiException.field(field,"Chỉ nhập tên tài khoản, không nhập đường dẫn");return v;}
 public static String normalizePhone(String value){
  if(value==null||value.strip().isEmpty())return null;
  String phone=value.replaceAll("[\\s.\\-]","");if(phone.startsWith("+84"))phone="0"+phone.substring(3);
  if(!phone.matches("0[35789][0-9]{8}"))throw AdminApiException.field("phone","Số di động Việt Nam không hợp lệ");return phone;
 }
 public static String normalizeQuery(String q){return q==null?"":q.strip().replaceAll("\\s+"," ");}
}
