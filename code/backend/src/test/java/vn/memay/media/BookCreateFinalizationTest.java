package vn.memay.media;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Value;
import vn.memay.support.*;
import java.util.*;
import static vn.memay.support.AdminHttpClient.*;
import static org.assertj.core.api.Assertions.*;
class BookCreateFinalizationTest extends MediaTestSupport {
 @Value("${local.server.port}") int port;
 Map<String,Object> request(AdminHttpClient api,int count)throws Exception {
  var id=tree(api.send("POST","/api/v1/admin/upload-sessions","{}",true)).path("id").asString();var assignments=new ArrayList<Map<String,String>>();
  var roles=List.of("FRONT","BACK","SPINE","INSIDE_1","INSIDE_2","INSIDE_3");
  for(int i=0;i<count;i++){var r=api.upload("/api/v1/admin/upload-sessions/"+id+"/media",0,ImageValidatorTest.image("jpeg"),true);assertThat(r.statusCode()).isEqualTo(201);assignments.add(Map.of("mediaId",tree(r).path("id").asString(),"role",roles.get(i)));}
  return new LinkedHashMap<>(Map.of("write",BookFixtures.write("Physical copy","BOARD_BOOK",null,20000L,null,null,List.of(),List.of()),"uploadSessionId",id,"media",assignments,"confirmedActualCopy",true));
 }
 @Test void finalCreatesPublishedWithTwoOrSixImagesAndRetryCannotDuplicate()throws Exception {
  var api=new AdminHttpClient(port);api.login("owner@catalogue.test");
  for(int count:List.of(2,6)) {
   var body=request(api,count);var r=api.send("POST","/api/v1/admin/books",json(body),true);assertThat(r.statusCode()).isEqualTo(201);var book=tree(r);assertThat(book.path("publication").asString()).isEqualTo("PUBLISHED");assertThat(book.path("media").size()).isEqualTo(count);assertThat(book.path("id").isString()).isTrue();assertThat(r.headers().firstValue("location").orElse("")).endsWith("/books/"+book.path("id").asString());
   var retry=api.send("POST","/api/v1/admin/books",json(body),true);assertThat(tree(retry).path("id").asString()).isEqualTo(book.path("id").asString());
   body.put("confirmedActualCopy",false);assertThat(api.send("POST","/api/v1/admin/books",json(body),true).statusCode()).isEqualTo(409);
   cleanup.runOnce();assertThat(fake.assets.size()).isEqualTo(count==2?2:8);
  }
  assertThat(jdbc.queryForObject("select count(*) from book_copy",Integer.class)).isEqualTo(2);assertThat(jdbc.queryForObject("select count(*) from audit_event",Integer.class)).isEqualTo(4);
 }
 @Test void concurrentFinalizationAndAtomicReorderHaveVersionGuards()throws Exception {
  var api=new AdminHttpClient(port);api.login("owner@catalogue.test");var body=request(api,2);String payload=json(body);
  var first=java.util.concurrent.CompletableFuture.supplyAsync(()->{try{return api.send("POST","/api/v1/admin/books",payload,true);}catch(Exception e){throw new RuntimeException(e);}});
  var second=api.send("POST","/api/v1/admin/books",payload,true);var a=tree(first.get());var b=tree(second);assertThat(a.path("id").asString()).isEqualTo(b.path("id").asString());
  var write=new LinkedHashMap<String,Object>(JSON.convertValue(body.get("write"),Map.class));write.put("version",a.path("version").asLong());
  write.put("media",List.of(Map.of("mediaId",a.path("media").get(0).path("id").asString(),"role","BACK"),Map.of("mediaId",a.path("media").get(1).path("id").asString(),"role","FRONT")));
  var changed=api.send("PUT","/api/v1/admin/books/"+a.path("id").asString(),json(write),true);assertThat(changed.statusCode()).isEqualTo(200);assertThat(tree(changed).path("media").get(0).path("id").asString()).isEqualTo(a.path("media").get(1).path("id").asString());
  assertThat(api.send("PUT","/api/v1/admin/books/"+a.path("id").asString(),json(write),true).statusCode()).isEqualTo(409);
 }
 @Test void invalidFinalLeavesNoBooksAndReadyImagesCanRetryAfterAuditFailure()throws Exception {
  var api=new AdminHttpClient(port);api.login("owner@catalogue.test");var body=request(api,2);body.put("confirmedActualCopy",false);assertThat(api.send("POST","/api/v1/admin/books",json(body),true).statusCode()).isEqualTo(400);body.put("confirmedActualCopy",true);
  jdbc.execute("alter table audit_event add constraint m5_reject_create check(action<>'CREATE')");
  try{assertThat(api.send("POST","/api/v1/admin/books",json(body),true).statusCode()).isEqualTo(409);assertThat(jdbc.queryForObject("select count(*) from book_copy",Integer.class)).isZero();assertThat(jdbc.queryForObject("select count(*) from temporary_media where state='READY'",Integer.class)).isEqualTo(2);}finally{jdbc.execute("alter table audit_event drop constraint m5_reject_create");}
  assertThat(api.send("POST","/api/v1/admin/books",json(body),true).statusCode()).isEqualTo(201);
 }
 @Test void staffWritesAndDraftRequestsAreRejected()throws Exception {
  var api=new AdminHttpClient(port);api.login("owner@catalogue.test");var b=ready();api.login("staff@catalogue.test");
  assertThat(api.send("GET","/api/v1/admin/books",null,false).statusCode()).isEqualTo(200);
  for(String path:List.of("/books","/collections","/upload-sessions","/flash-sale"))assertThat(api.send("POST","/api/v1/admin"+path,"{}",true).statusCode()).isEqualTo(403);
  api.login("owner@catalogue.test");assertThat(api.send("PATCH","/api/v1/admin/books/"+b.id()+"/publication",json(Map.of("version",b.version(),"status","DRAFT")),true).statusCode()).isEqualTo(400);
 }
 @Test void rejectsMissingWeightRangesAndForeignOrDuplicateMediaWithoutConsumingSession()throws Exception {
  var api=new AdminHttpClient(port);api.login("owner@catalogue.test");var body=request(api,2);
  var valid=JSON.convertValue(body.get("write"),Map.class);
  for(String field:List.of("weightG","priceMinVnd","priceMaxVnd","title","conditionNote","categoryCode")) {
   var invalid=new LinkedHashMap<String,Object>(valid);invalid.put(field,null);var test=new LinkedHashMap<>(body);test.put("write",invalid);
   assertThat(api.send("POST","/api/v1/admin/books",json(test),true).statusCode()).isEqualTo(400);
  }
  for(Object bad:List.of(1.5,"250")) {
   var invalid=new LinkedHashMap<String,Object>(valid);invalid.put("weightG",bad);var test=new LinkedHashMap<>(body);test.put("write",invalid);assertThat(api.send("POST","/api/v1/admin/books",json(test),true).statusCode()).isEqualTo(400);
  }
  var list=(List<Map<String,String>>)body.get("media");
  for(var assignments:List.of(List.of(list.get(0)),List.of(list.get(0),list.get(0)),List.of(list.get(0),Map.of("mediaId",UUID.randomUUID().toString(),"role","BACK")))){
   var test=new LinkedHashMap<>(body);test.put("media",assignments);assertThat(api.send("POST","/api/v1/admin/books",json(test),true).statusCode()).isEqualTo(400);
  }
  assertThat(jdbc.queryForObject("select count(*) from book_copy",Integer.class)).isZero();assertThat(jdbc.queryForObject("select count(*) from temporary_media where state='READY'",Integer.class)).isEqualTo(2);
  assertThat(api.send("POST","/api/v1/admin/books",json(body),true).statusCode()).isEqualTo(201);
 }
}
