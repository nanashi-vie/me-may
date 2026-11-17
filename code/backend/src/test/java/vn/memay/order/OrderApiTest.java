package vn.memay.order;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import vn.memay.support.*;
import java.util.*;
import java.time.*;
import java.sql.Timestamp;
import static vn.memay.support.AdminHttpClient.*;
import static org.assertj.core.api.Assertions.*;
class OrderApiTest extends OrderTestSupport {
 @Value("${local.server.port}") int port;
 private static final String BASE="/api/v1/admin/orders";
 private AdminHttpClient api()throws Exception{var a=new AdminHttpClient(port);a.login("owner@catalogue.test");return a;}
 @Test void ownerPagesStaffSeesNoOrderData()throws Exception{
  var a=api();var ids=new ArrayList<Long>();for(int i=0;i<25;i++){long id=draft();manual(id,100000,1,250);ids.add(id);}
  jdbc.update("update orders set status='KEEPING',keep_started_at=current_timestamp,keep_until=? where id in (?,?)",Timestamp.from(OrderValidation.keepUntil(Instant.now(),2)),ids.get(0),ids.get(1));
  var r=a.send("GET",BASE,null,false);assertThat(r.statusCode()).isEqualTo(200);assertThat(r.headers().firstValue("cache-control")).contains("no-store");assertThat(tree(r).path("items").size()).isEqualTo(20);assertThat(tree(r).path("totalElements").asLong()).isEqualTo(25);
  var stats=tree(a.send("GET",BASE+"/stats?status=KEEPING&size=1",null,false));assertThat(stats.path("keeping").asLong()).isEqualTo(2);
  a.login("staff@catalogue.test");for(String path:List.of(BASE,BASE+"/stats",BASE+"/catalog",BASE+"/catalog-match?title=book",BASE+"/"+ids.getFirst()))assertThat(a.send("GET",path,null,false).statusCode()).isEqualTo(403);
 }
 @Test void apiCreateKeepAndDeleteRequiresReasonBody()throws Exception{
  var a=api();var b=ready();var made=a.send("POST",BASE,json(Map.of("customerId",Long.toString(customer()),"fulfillmentType","KEEP","requestId",UUID.randomUUID())),true);assertThat(made.statusCode()).isEqualTo(201);String id=tree(made).path("id").asString();assertThat(tree(made).path("id").isString()).isTrue();assertThat(tree(made).path("orderCode").asString()).startsWith("DH-");
  assertThat(a.send("POST",BASE+"/"+id+"/items",json(Map.of("version",0,"requestId",UUID.randomUUID(),"sourceType","CATALOG","bookCopyId",b.id(),"unitPriceVnd",75000,"quantity",1,"unitWeightGrams",250)),true).statusCode()).isEqualTo(200);
  assertThat(a.send("POST",BASE+"/"+id+"/keep",json(Map.of("version",1,"requestId",UUID.randomUUID(),"allowInsufficientDeposit",true,"reason","Owner exception")),true).statusCode()).isEqualTo(200);
  var detail=tree(a.send("GET",BASE+"/"+id,null,false));String item=detail.path("items").get(0).path("id").asString();
  assertThat(a.send("DELETE",BASE+"/"+id+"/items/"+item,json(Map.of("version",2,"requestId",UUID.randomUUID())),true).statusCode()).isEqualTo(400);
  var body=Map.of("version",2,"requestId",UUID.randomUUID(),"reason","Customer removed book");assertThat(a.send("DELETE",BASE+"/"+id+"/items/"+item,json(body),true).statusCode()).isEqualTo(200);
  assertThat(tree(a.send("GET",BASE+"/"+id,null,false)).path("items").size()).isZero();assertThat(queries.detail(Long.parseLong(b.id()),owner).totalStock()).isEqualTo(1);
 }
 @Test void queryDateRangeAndLiteralSearchAreSafe()throws Exception{
  var a=api();long included=draft(),excluded=draft();jdbc.update("update orders set created_at='2026-11-17T16:59:59Z' where id=?",included);jdbc.update("update orders set created_at='2026-11-17T17:00:00Z' where id=?",excluded);
  var page=tree(a.send("GET",BASE+"?createdFrom=2026-11-17&createdTo=2026-11-17",null,false));assertThat(page.path("totalElements").asLong()).isEqualTo(1);assertThat(page.path("items").get(0).path("id").asString()).isEqualTo(Long.toString(included));
  assertThat(tree(a.send("GET",BASE+"?q=%25",null,false)).path("totalElements").asLong()).isZero();
  assertThat(tree(a.send("GET",BASE+"?q=%27%20OR%201%3D1--",null,false)).path("totalElements").asLong()).isZero();
  for(String query:List.of("size=101","page=-1","status=BAD","keepWarning=BAD","createdFrom=2026-11-18&createdTo=2026-11-17"))assertThat(a.send("GET",BASE+"?"+query,null,false).statusCode()).isEqualTo(400);
 }
 @Test void numericFieldsNeverCoerceFractionStringsOrBooleans()throws Exception{
  var a=api();long id=draft();
  for(Object bad:List.of(1.5,"1000",true)){
   var body=new HashMap<String,Object>();body.put("version",0);body.put("requestId",UUID.randomUUID());body.put("sourceType","MANUAL");body.put("title","Synthetic outside");body.put("unitPriceVnd",bad);body.put("quantity",1);body.put("unitWeightGrams",250);
   assertThat(a.send("POST",BASE+"/"+id+"/items",json(body),true).statusCode()).isEqualTo(400);
  }
  assertThat(a.send("POST",BASE,json(Map.of("customerId",customer(),"requestId",UUID.randomUUID())),true).statusCode()).isEqualTo(400);
  assertThat(a.send("POST",BASE,json(Map.of("customerId",Long.toString(customer()),"requestId",UUID.randomUUID(),"status","COMPLETED")),true).statusCode()).isEqualTo(400);
  assertThat(jdbc.queryForObject("select count(*) from order_items",Integer.class)).isZero();
 }
 @Test void manualMatchResponseAndCrossOrderIds()throws Exception{
  var a=api();var b=ready();long id=draft(),other=draft();long foreign=manual(other,1,1,1);
  var body=Map.of("version",0,"requestId",UUID.randomUUID(),"sourceType","MANUAL","title",b.title(),"unitPriceVnd",100,"quantity",1,"unitWeightGrams",250);
  var warning=a.send("POST",BASE+"/"+id+"/items",json(body),true);assertThat(warning.statusCode()).isEqualTo(409);assertThat(tree(warning).path("matches").path("items").size()).isPositive();
  assertThat(a.send("DELETE",BASE+"/"+id+"/items/"+foreign,json(Map.of("version",0,"requestId",UUID.randomUUID())),true).statusCode()).isEqualTo(404);
  assertThat(a.send("POST",BASE,json(Map.of("customerId",Long.toString(customer()),"requestId",UUID.randomUUID())),false).statusCode()).isEqualTo(403);
 }
 @Test void catalogShowsCurrentSaleReferenceButNeverAssignsSaleAsItemPrice()throws Exception{
  var a=api();var b=ready();long book=Long.parseLong(b.id());long listing=jdbc.queryForObject("select id from listing where book_copy_id=?",Long.class,book);
  jdbc.update("update listing set publication_status='PUBLISHED' where id=?",listing);jdbc.update("update flash_sale set enabled=true,starts_at=current_timestamp-interval '1 hour',ends_at=current_timestamp+interval '1 hour'");jdbc.update("insert into flash_sale_item(listing_id,sale_price_vnd) values(?,7000)",listing);
  var result=tree(a.send("GET",BASE+"/catalog?q="+b.bookCode(),null,false));assertThat(result.path("items").get(0).path("salePriceVnd").asLong()).isEqualTo(7000);
  long id=draft();assertThat(a.send("POST",BASE+"/"+id+"/items",json(Map.of("version",0,"requestId",UUID.randomUUID(),"sourceType","CATALOG","bookCopyId",b.id(),"quantity",1)),true).statusCode()).isEqualTo(400);assertThat(orders.require(id,false).items()).isEmpty();
 }

}
