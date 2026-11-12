package vn.memay.customer;
import org.junit.jupiter.api.Test;
import vn.memay.common.AdminApiException;
import static org.assertj.core.api.Assertions.*;
import static vn.memay.customer.CustomerDtos.*;
class CustomerValidationTest {
 private CustomerWrite write(String name,String phone,String zalo,String tiktok,String threads,String address,String note){return new CustomerWrite(name,phone,address,zalo,tiktok,threads,note);}
 @Test void normalizesOptionalAndPhone(){
  assertThat(CustomerValidation.normalizePhone("+84 987-123.456")).isEqualTo("0987123456");
  assertThat(CustomerValidation.normalizePhone("   ")).isNull();
  var w=CustomerValidation.normalize(write(" Lan ",null,"  ",null," @Lan.Books ",null," "));
  assertThat(w.fullName()).isEqualTo("Lan"); assertThat(w.zaloName()).isNull();assertThat(w.note()).isNull();assertThat(w.threadsId()).isEqualTo("@Lan.Books");
 }
 @Test void rejectsInvalidTextAndLinks(){
  for(String phone:new String[]{"123","098712345a","0287123456","+849871234567","0987/123456"})assertThatThrownBy(()->CustomerValidation.normalizePhone(phone)).isInstanceOf(AdminApiException.class);
  for(String link:new String[]{"https://threads.com/@lan","HTTP://foo","www.foo.com","zalo.me/123","tiktok.com/@lan","threads.net/@lan","threads.com"})assertThatThrownBy(()->CustomerValidation.normalize(write("Lan",null,null,null,link,null,null))).isInstanceOf(AdminApiException.class);
  assertThatThrownBy(()->CustomerValidation.normalize(write(" ",null,null,null,null,null,null))).isInstanceOf(AdminApiException.class);
  assertThatThrownBy(()->CustomerValidation.normalize(write("x".repeat(151),null,null,null,null,null,null))).isInstanceOf(AdminApiException.class);
  for(int field=0;field<5;field++){final int f=field;assertThatThrownBy(()->CustomerValidation.normalize(write("Lan",null,f==0?"x".repeat(151):null,f==1?"x".repeat(101):null,f==2?"x".repeat(101):null,f==3?"x".repeat(501):null,f==4?"x".repeat(1001):null))).isInstanceOf(AdminApiException.class);}
 }
 @Test void keepsUsernameSpelling(){
  var w=CustomerValidation.normalize(write("x".repeat(150),null,"Lan Nguyễn","x".repeat(100),"@Lan.Books","x".repeat(500),"x".repeat(1000)));
  assertThat(w.zaloName()).isEqualTo("Lan Nguyễn"); assertThat(w.threadsId()).isEqualTo("@Lan.Books");
  assertThat(CustomerValidation.normalizeQuery("  Lan   Nguyễn  ")).isEqualTo("Lan Nguyễn");
 }
}
