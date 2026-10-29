package vn.memay.catalogue;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import vn.memay.support.*;
import java.util.*;
import static vn.memay.support.AdminHttpClient.*;
import static org.assertj.core.api.Assertions.*;
class M5FieldsApiTest extends CatalogueTestSupport {
 @Value("${local.server.port}") int port;
 @Test void acceptsRangesAndWeightAndRejectsReversedOrPartialValues() throws Exception {
  var api=new AdminHttpClient(port);api.login("owner@catalogue.test");
  for(long max:List.of(20000L,30000L)) {
   var values=new LinkedHashMap<String,Object>();values.put("title","Range");values.put("conditionNote","Actual");values.put("categoryCode","BOARD_BOOK");values.put("priceMinVnd",20000);values.put("priceMaxVnd",max);values.put("weightG",250);
   var r=api.send("POST","/api/v1/admin/books",json(values),true);
   assertThat(r.statusCode()).isEqualTo(201);assertThat(tree(r).path("priceMinVnd").asLong()).isEqualTo(20000);assertThat(tree(r).path("priceMaxVnd").asLong()).isEqualTo(max);assertThat(tree(r).path("weightG").asInt()).isEqualTo(250);
   for(String key:List.of("priceMinVnd","priceMaxVnd","weightG")) {
    var invalid=new LinkedHashMap<>(values);invalid.put(key,-1);assertThat(api.send("POST","/api/v1/admin/books",json(invalid),true).statusCode()).isEqualTo(400);
   }
   values.put("priceMaxVnd",10000);assertThat(api.send("POST","/api/v1/admin/books",json(values),true).statusCode()).isEqualTo(400);
   values.remove("priceMaxVnd");assertThat(api.send("POST","/api/v1/admin/books",json(values),true).statusCode()).isEqualTo(400);
  }
 }
 @Test void rangeSortingUsesUpperEndpointBeforeStableBookCode()throws Exception {
  var a=commands.create(owner,BookFixtures.write("Lower max","BOARD_BOOK",null,20000L,null,null,List.of(),List.of()));
  var b=commands.create(owner,BookFixtures.write("Higher max","BOARD_BOOK",null,20000L,null,null,List.of(),List.of()));
  jdbc.update("update listing set publication_status='PUBLISHED',price_max_vnd=30000 where book_copy_id=?",Long.parseLong(a.id()));
  jdbc.update("update listing set publication_status='PUBLISHED',price_max_vnd=50000 where book_copy_id=?",Long.parseLong(b.id()));
  var api=new AdminHttpClient(port);
  assertThat(tree(api.send("GET","/api/v1/books?sort=price_asc",null,false)).path("items").get(0).path("id").asString()).isEqualTo(a.id());
  assertThat(tree(api.send("GET","/api/v1/books?sort=price_desc",null,false)).path("items").get(0).path("id").asString()).isEqualTo(b.id());
 }
}
