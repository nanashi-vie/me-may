package vn.memay.order;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import vn.memay.support.*;
import java.util.List;
import static org.assertj.core.api.Assertions.*;
class OrderAccessTest extends OrderTestSupport {
 @Value("${local.server.port}") int port;
 @Test void orderReadsAreOwnerOnly()throws Exception{
  var a=new AdminHttpClient(port);a.login("staff@catalogue.test");
  for(String path:List.of("/api/v1/admin/orders","/api/v1/admin/orders/stats","/api/v1/admin/orders/catalog-match?title=book","/api/v1/admin/orders/1"))
   assertThat(a.send("GET",path,null,false).statusCode()).isEqualTo(403);
  var anonymous=new AdminHttpClient(port);assertThat(anonymous.send("GET","/api/v1/admin/orders",null,false).statusCode()).isEqualTo(401);
 }
}
