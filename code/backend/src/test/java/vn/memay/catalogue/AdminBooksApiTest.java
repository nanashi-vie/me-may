package vn.memay.catalogue;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Value;
import vn.memay.support.*;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;
import static vn.memay.support.AdminHttpClient.*;
import static org.assertj.core.api.Assertions.*;
class AdminBooksApiTest extends CatalogueTestSupport {
 @Value("${local.server.port}") int port;AdminHttpClient api;
 @BeforeEach void login()throws Exception{api=new AdminHttpClient(port);api.login("owner@catalogue.test");}
 @Test void readsStringIdsAndPrivateAuditForExistingArchivedBooks()throws Exception{
  var b=seed(owner,BookFixtures.draft("Legacy archived"));
  var get=api.send("GET","/api/v1/admin/books/"+b.id(),null,false);assertThat(get.statusCode()).isEqualTo(200);assertThat(tree(get).path("id").isString()).isTrue();assertThat(tree(get).path("publication").asString()).isEqualTo("ARCHIVED");assertThat(get.headers().firstValue("cache-control").orElse("")).contains("no-store");
  assertThat(tree(api.send("GET","/api/v1/admin/books/"+b.id()+"/audit",null,false)).path("totalElements").asInt()).isEqualTo(1);
 }
 @Test void forgedBookCodeOrActorReturns400()throws Exception{
  for(String key:List.of("bookCode","actor","publication","unexpected"))assertThat(api.send("POST","/api/v1/admin/books",json(Map.of(key,"forged")),true).statusCode()).isEqualTo(400);
  assertThat(api.send("POST","/api/v1/admin/books","{\"priceMinVnd\":1.5}",true).statusCode()).isEqualTo(400);
  assertThat(jdbc.queryForObject("select count(*) from book_copy",Integer.class)).isZero();
 }
 @Test void previewDoesNotLeakInternalFields()throws Exception{
  var b=seed(owner,BookFixtures.write("A",null,null,10L,"A1","PRIVATE-BASIS",List.of(),List.of()));
  var r=api.send("GET","/api/v1/admin/books/"+b.id()+"/preview",null,false);assertThat(r.statusCode()).isEqualTo(200);assertThat(r.body()).doesNotContain("readingLevelBasis","sourceRef","storagePublicId","PRIVATE-BASIS");
 }
 @Test void searchTreatsPercentAndUnderscoreLiterally()throws Exception{
  for(String title:List.of("100% sách_đẹp O'Reilly","1000 sáchAđẹp","Khác"))seed(owner,BookFixtures.draft(title));
  for(String q:List.of("%","_","O'Reilly","sách_đẹp")){
   var r=api.send("GET","/api/v1/admin/books?q="+URLEncoder.encode(q,StandardCharsets.UTF_8),null,false);assertThat(r.statusCode()).isEqualTo(200);assertThat(tree(r).path("totalElements").asInt()).isEqualTo(1);
  }
 }
 @Test void invalidPagingEnumAndMissingVersionAre400()throws Exception{
  for(String query:List.of("size=101","page=-1","availability=HELD","q="+"x".repeat(201)))assertThat(api.send("GET","/api/v1/admin/books?"+query,null,false).statusCode()).isEqualTo(400);
  var b=seed(owner,BookFixtures.draft("A"));assertThat(api.send("PUT","/api/v1/admin/books/"+b.id(),json(BookFixtures.draft("B")),true).statusCode()).isEqualTo(400);
 }
 @Test void sessionCsrfAndStaffAreEnforced()throws Exception{
  var anon=new AdminHttpClient(port);assertThat(anon.send("GET","/api/v1/admin/books",null,false).statusCode()).isEqualTo(401);
  assertThat(api.send("POST","/api/v1/admin/books","{}",false).statusCode()).isEqualTo(403);
  var b=ready();api.login("staff@catalogue.test");assertThat(api.send("PATCH","/api/v1/admin/books/"+b.id()+"/publication",json(Map.of("version",b.version(),"status","PUBLISHED","confirmedActualCopy",true)),true).statusCode()).isEqualTo(403);
 }
 @Test void equivalentAgeSelectionDoesNotCreateAudit()throws Exception{
  var b=seed(owner,BookFixtures.write("A","PICTURE_BOOK","PAPERBACK",1L,null,null,List.of("AGE_4_6","AGE_7_9"),List.of()));
  var data=new LinkedHashMap<String,Object>(JSON.convertValue(BookFixtures.write("A","PICTURE_BOOK","PAPERBACK",1L,null,null,List.of("AGE_7_9","AGE_4_6"),List.of()),Map.class));data.put("version",b.version());data.put("variants",b.variants());
  var r=api.send("PUT","/api/v1/admin/books/"+b.id(),json(data),true);assertThat(r.statusCode()).isEqualTo(200);assertThat(tree(r).path("version").asLong()).isEqualTo(b.version());
 }
 @Test void listIsStableAndCodeLookupIsCaseInsensitive()throws Exception{
  var first=seed(owner,BookFixtures.draft("A"));var second=seed(owner,BookFixtures.draft("B"));
  jdbc.update("update book_copy set updated_at='2026-01-01T00:00:00Z'");
  var r=api.send("GET","/api/v1/admin/books?size=1",null,false);assertThat(tree(r).path("items").get(0).path("id").asString()).isEqualTo(second.id());
  var next=api.send("GET","/api/v1/admin/books?size=1&page=1",null,false);assertThat(tree(next).path("items").get(0).path("id").asString()).isEqualTo(first.id());
  var code=api.send("GET","/api/v1/admin/books?q="+first.bookCode().toLowerCase(Locale.ROOT),null,false);assertThat(tree(code).path("totalElements").asLong()).isEqualTo(1);
  assertThat(api.send("GET","/api/v1/admin/books/999999999",null,false).statusCode()).isEqualTo(404);
 }
 @Test void jsonNumbersCannotBeCoercedFromStrings()throws Exception{
  assertThat(api.send("POST","/api/v1/admin/books",json(Map.of("priceMinVnd","1000")),true).statusCode()).isEqualTo(400);
  var b=seed(owner,BookFixtures.draft("A"));assertThat(api.send("PATCH","/api/v1/admin/books/"+b.id()+"/availability",json(Map.of("version","0","availability","SOLD")),true).statusCode()).isEqualTo(400);
 }
}
