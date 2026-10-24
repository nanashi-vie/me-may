package vn.memay.taxonomy;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Value;
import vn.memay.support.*;
import java.util.*;
import static vn.memay.support.AdminHttpClient.*;
import static org.assertj.core.api.Assertions.*;
class CollectionsApiTest extends CatalogueTestSupport {
 @Value("${local.server.port}") int port;
 @Test void ownerVersionSlugAndStaffBoundaries()throws Exception{
  var api=new AdminHttpClient(port);api.login("owner@catalogue.test");
  var payload=json(Map.of("name","Bộ đầu tiên","slug","bo-dau-tien","sortOrder",0,"active",true));
  var created=api.send("POST","/api/v1/admin/collections",payload,true);assertThat(created.statusCode()).isEqualTo(201);var b=tree(created);String path="/api/v1/admin/collections/"+b.path("id").asString();
  assertThat(api.send("POST","/api/v1/admin/collections",payload,true).statusCode()).isEqualTo(409);
  assertThat(api.send("PUT",path,json(Map.of("version",b.path("version").asLong(),"name","Bộ mới","sortOrder",1,"active",false)),true).statusCode()).isEqualTo(200);
  assertThat(api.send("PUT",path,json(Map.of("version",b.path("version").asLong(),"name","Cũ","sortOrder",1,"active",true)),true).statusCode()).isEqualTo(409);
  assertThat(api.send("PUT",path,json(Map.of("version",1,"name","A","slug","forged","sortOrder",0,"active",true)),true).statusCode()).isEqualTo(400);
  api.login("staff@catalogue.test");assertThat(api.send("POST","/api/v1/admin/collections",payload,true).statusCode()).isEqualTo(403);
  assertThat(api.send("GET","/api/v1/admin/taxonomy",null,false).statusCode()).isEqualTo(200);
 }
 @Test void inactiveCollectionsKeepOldAssignmentsButRejectNewOnes()throws Exception{
  var api=new AdminHttpClient(port);api.login("owner@catalogue.test");
  var c=tree(api.send("POST","/api/v1/admin/collections",json(Map.of("name","C","slug","c","sortOrder",0,"active",true)),true));String id=c.path("id").asString();
  var w=BookFixtures.write("A",null,null,null,null,null,List.of(),List.of(id));var b=commands.create(owner,w);
  api.send("PUT","/api/v1/admin/collections/"+id,json(Map.of("version",c.path("version").asLong(),"name","C","sortOrder",0,"active",false)),true);
  assertThatCode(()->commands.update(Long.parseLong(b.id()),b.version(),owner,w)).doesNotThrowAnyException();
  assertThatThrownBy(()->commands.create(owner,w)).isInstanceOf(vn.memay.common.AdminApiException.class);
  assertThat(jdbc.queryForObject("select count(*) from book_copy",Integer.class)).isEqualTo(1);
 }
}
