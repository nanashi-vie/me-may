package vn.memay.customer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import vn.memay.support.*;
import java.util.*;
import static vn.memay.support.AdminHttpClient.*;
import static org.assertj.core.api.Assertions.*;
class CustomerIntegrationTest extends CatalogueTestSupport {
 @Value("${local.server.port}") int port;
 private static final String BASE="/api/v1/admin/customers";
 private AdminHttpClient ownerApi()throws Exception{var a=new AdminHttpClient(port);a.login("owner@catalogue.test");return a;}
 private Map<String,Object> body(String name,String phone){var b=new HashMap<String,Object>();b.put("fullName",name);b.put("phone",phone);return b;}
 @Test void createReadUpdateArchiveRestore()throws Exception{
  var a=ownerApi();var response=a.send("POST",BASE,json(body(" Lan ",null)),true);assertThat(response.statusCode()).isEqualTo(201);var c=tree(response);String path=BASE+"/"+c.path("id").asString();
  assertThat(c.path("id").isString()).isTrue();assertThat(c.path("customerCode").asString()).startsWith("KH-");assertThat(c.path("fullName").asString()).isEqualTo("Lan");assertThat(c.path("threadsId").isNull()).isTrue();assertThat(c.path("createdBy").asString()).isEqualTo(owner.getId().toString());
  var b=body("Lan",null);b.put("threadsId","@lan.books");b.put("version",0);
  var edited=a.send("PUT",path,json(b),true);assertThat(edited.statusCode()).isEqualTo(200);assertThat(tree(edited).path("version").asLong()).isEqualTo(1);assertThat(tree(edited).path("customerCode")).isEqualTo(c.path("customerCode"));
  var stale=a.send("PUT",path,json(b),true);assertThat(stale.statusCode()).isEqualTo(409);assertThat(tree(stale).path("currentVersion").asLong()).isEqualTo(1);
  assertThat(a.send("PATCH",path+"/status",json(Map.of("status","ARCHIVED","version",1)),true).statusCode()).isEqualTo(200);
  assertThat(tree(a.send("GET",BASE,null,false)).path("totalElements").asLong()).isZero();
  assertThat(a.send("PATCH",path+"/status",json(Map.of("status","ACTIVE","version",2)),true).statusCode()).isEqualTo(200);
  assertThat(a.send("GET",path,null,false).headers().firstValue("cache-control")).contains("no-store");
  var count=jdbc.queryForObject("select count(*) from audit_event where target_type='CUSTOMER'",Integer.class);assertThat(count).isEqualTo(4);
  assertThat(jdbc.queryForObject("select before_data::text||after_data::text from audit_event where target_type='CUSTOMER' limit 1",String.class)).isEqualTo("{}{}");
 }
 @Test void staffAndAnonymousBoundaries()throws Exception{
  var a=ownerApi();var c=tree(a.send("POST",BASE,json(Map.of("fullName","Lan")),true));String path=BASE+"/"+c.path("id").asString();
  a.login("staff@catalogue.test");for(String p:List.of(BASE,path,BASE+"/duplicates?phone=0987123456"))assertThat(a.send("GET",p,null,false).statusCode()).isEqualTo(200);
  assertThat(a.send("POST",BASE,json(Map.of("fullName","Bad")),true).statusCode()).isEqualTo(403);
  assertThat(a.send("PUT",path,json(Map.of("fullName","Bad","version",0)),true).statusCode()).isEqualTo(403);
  assertThat(a.send("PATCH",path+"/status",json(Map.of("status","ARCHIVED","version",0)),true).statusCode()).isEqualTo(403);
  var anon=new AdminHttpClient(port);for(String p:List.of(BASE,path,BASE+"/duplicates?phone=0987123456"))assertThat(anon.send("GET",p,null,false).statusCode()).isEqualTo(401);
  var own=ownerApi();assertThat(own.send("POST",BASE,json(Map.of("fullName","No CSRF")),false).statusCode()).isEqualTo(403);
  assertThat(jdbc.queryForObject("select count(*) from customer",Integer.class)).isEqualTo(1);
 }
 @Test void duplicatesRequirePhoneBoundConfirmation()throws Exception{
  var a=ownerApi();var b=body("Lan","0987123456");var c=tree(a.send("POST",BASE,json(b),true));String path=BASE+"/"+c.path("id").asString();
  a.send("PATCH",path+"/status",json(Map.of("status","ARCHIVED","version",0)),true);
  b.put("phone","+84 987-123.456");var dup=a.send("POST",BASE,json(b),true);assertThat(dup.statusCode()).isEqualTo(409);assertThat(tree(dup).path("error").asString()).isEqualTo("CUSTOMER_PHONE_DUPLICATE");assertThat(tree(dup).path("duplicates").path("items").get(0).path("status").asString()).isEqualTo("ARCHIVED");
  b.put("confirmDuplicatePhone",true);b.put("confirmedPhone","0901234567");assertThat(a.send("POST",BASE,json(b),true).statusCode()).isEqualTo(400);
  b.put("confirmedPhone","0987123456");assertThat(a.send("POST",BASE,json(b),true).statusCode()).isEqualTo(201);
  var page=tree(a.send("GET",BASE+"/duplicates?phone=%2B84987123456&size=1",null,false));assertThat(page.path("totalElements").asLong()).isEqualTo(2);assertThat(page.path("items").size()).isEqualTo(1);
  assertThat(tree(a.send("GET",BASE+"/duplicates?phone=0987123456&excludeId="+c.path("id").asString(),null,false)).path("totalElements").asLong()).isEqualTo(1);
  var update=body("Lan renamed","0987123456");update.put("version",1);assertThat(a.send("PUT",path,json(update),true).statusCode()).isEqualTo(200);
 }
 @Test void searchFiltersAndPagination()throws Exception{
  var a=ownerApi();var b=body("Lan Nguyễn","0987123456");b.put("zaloName","Lan Zalo");b.put("tiktokId","@Special_Tik");b.put("threadsId","@Lan.Books");b.put("note","secret-note");b.put("defaultAddress","secret-address");
  var c=tree(a.send("POST",BASE,json(b),true));
  for(String q:List.of("lan","ZALO","Special_Tik","@lan.books","lan.books","%2B84987123456","987123",c.path("customerCode").asString()))assertThat(tree(a.send("GET",BASE+"?q="+q,null,false)).path("totalElements").asLong()).as(q).isEqualTo(1);
  for(String q:List.of("%25","secret-note","secret-address"))assertThat(tree(a.send("GET",BASE+"?q="+q,null,false)).path("totalElements").asLong()).isZero();
  for(String query:List.of("page=-1","size=101","status=BAD"))assertThat(a.send("GET",BASE+"?"+query,null,false).statusCode()).isEqualTo(400);
  assertThat(tree(a.send("GET",BASE+"?page=99",null,false)).path("items").size()).isZero();
  assertThat(a.send("GET",BASE+"/999999",null,false).statusCode()).isEqualTo(404);
  assertThat(a.send("POST",BASE,json(Map.of("fullName","X","customerCode","forged")),true).statusCode()).isEqualTo(400);
  assertThat(a.send("PUT",BASE+"/"+c.path("id").asString(),json(Map.of("fullName","X")),true).statusCode()).isEqualTo(400);
 }
}
