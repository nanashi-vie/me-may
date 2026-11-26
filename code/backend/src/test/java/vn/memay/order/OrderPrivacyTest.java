package vn.memay.order;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import vn.memay.support.*;
import java.util.*;
import static vn.memay.support.AdminHttpClient.*;
import static org.assertj.core.api.Assertions.*;
class OrderPrivacyTest extends OrderTestSupport {
 @Value("${local.server.port}") int port;
 @Test void customerCountsAreOwnerOnlyAndDoNotCountDraftCancelledOrUnsuccessful()throws Exception{
  long c=customer();for(String status:List.of("DRAFT","KEEPING","READY_TO_SHIP","COMPLETED","CANCELLED"))jdbc.update("insert into orders(customer_id,customer_code_snapshot,customer_name_snapshot,status) values(?,'KH-TEST','Synthetic customer',?)",c,status);
  var a=new AdminHttpClient(port);a.login("owner@catalogue.test");var own=tree(a.send("GET","/api/v1/admin/customers",null,false));assertThat(own.path("items").get(0).path("orderCount").asLong()).isEqualTo(3);
  a.login("staff@catalogue.test");var staff=tree(a.send("GET","/api/v1/admin/customers",null,false)).path("items").get(0);assertThat(staff.get("orderCount")==null||staff.path("orderCount").isNull()).isTrue();
 }
 @Test void anonymousAndPublicNeverReadOrderPersonalData()throws Exception{
  long c=customer();jdbc.update("update customer set full_name='PRIVATE-ORDER-NAME',default_address='PRIVATE-ORDER-ADDRESS' where id=?",c);
  var a=new AdminHttpClient(port);a.login("owner@catalogue.test");var made=a.send("POST","/api/v1/admin/orders",json(Map.of("customerId",Long.toString(c),"requestId",UUID.randomUUID())),true);assertThat(made.statusCode()).isEqualTo(201);String id=tree(made).path("id").asString();
  var anonymous=new AdminHttpClient(port);for(String path:List.of("/api/v1/admin/orders","/api/v1/admin/orders/"+id,"/api/v1/admin/orders/stats"))assertThat(anonymous.send("GET",path,null,false).statusCode()).isEqualTo(401);
  for(String path:List.of("/api/v1/books","/api/v1/home","/api/v1/collections","/api/v1/flash-sale"))assertThat(anonymous.send("GET",path,null,false).body()).doesNotContain("PRIVATE-ORDER-NAME","PRIVATE-ORDER-ADDRESS");
  a.login("staff@catalogue.test");assertThat(a.send("GET","/api/v1/admin/orders?customerId="+c,null,false).statusCode()).isEqualTo(403);
 }
}
