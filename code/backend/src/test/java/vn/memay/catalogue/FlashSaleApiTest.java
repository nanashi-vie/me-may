package vn.memay.catalogue;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Value;
import vn.memay.support.*;
import java.time.Instant;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static vn.memay.support.AdminHttpClient.*;
class FlashSaleApiTest extends CatalogueTestSupport {
 @Value("${local.server.port}") int port;AdminHttpClient api,anon;
 @BeforeEach void client()throws Exception{api=new AdminHttpClient(port);api.login("owner@catalogue.test");anon=new AdminHttpClient(port);}
 Map<String,Object> sale(long version,String code,long price){return Map.of("version",version,"enabled",true,"startsAt",Instant.now().minusSeconds(60).toString(),"endsAt",Instant.now().plusSeconds(3600).toString(),"items",List.of(Map.of("bookCode",code,"salePriceVnd",price)));}
 BookDtos.BookDetail published(){var b=ready();jdbc.update("update listing set publication_status='PUBLISHED',published_at=current_timestamp where book_copy_id=?",Long.parseLong(b.id()));return b;}
 @Test void activeSaleChangesDetailListAndFlashPricesAndStopsOnExpiry()throws Exception{
  var b=published();var r=api.send("PUT","/api/v1/admin/flash-sale",json(sale(0,b.bookCode(),7000)),true);assertThat(r.statusCode()).isEqualTo(200);
  for(String path:List.of("/api/v1/books/"+b.slug(),"/api/v1/books","/api/v1/flash-sale")){
   var data=anon.send("GET",path,null,false);assertThat(data.statusCode()).isEqualTo(200);assertThat(data.body()).contains("\"priceVnd\":7000","\"originalPriceVnd\":10000").doesNotContain("storagePublicId","sourceRef");
  }
  jdbc.update("update flash_sale set ends_at=current_timestamp-interval '1 second',starts_at=current_timestamp-interval '1 hour'");
  assertThat(tree(anon.send("GET","/api/v1/books/"+b.slug(),null,false)).path("priceVnd").asLong()).isEqualTo(10000);
  assertThat(tree(anon.send("GET","/api/v1/flash-sale",null,false)).path("items").size()).isZero();
 }
 @Test void soldHiddenOrInvalidDiscountNeverShowsSale()throws Exception{
  var b=published();assertThat(api.send("PUT","/api/v1/admin/flash-sale",json(sale(0,b.bookCode(),7000)),true).statusCode()).isEqualTo(200);
  jdbc.update("update book_copy set availability='SOLD' where id=?",Long.parseLong(b.id()));
  assertThat(tree(anon.send("GET","/api/v1/books/"+b.slug(),null,false)).path("priceVnd").asLong()).isEqualTo(10000);
  assertThat(tree(anon.send("GET","/api/v1/flash-sale",null,false)).path("items").size()).isZero();
  jdbc.update("update book_copy set availability='AVAILABLE' where id=?",Long.parseLong(b.id()));jdbc.update("update listing set price_vnd=6000 where book_copy_id=?",Long.parseLong(b.id()));
  assertThat(tree(anon.send("GET","/api/v1/books/"+b.slug(),null,false)).path("priceVnd").asLong()).isEqualTo(6000);
  jdbc.update("update listing set publication_status='ARCHIVED' where book_copy_id=?",Long.parseLong(b.id()));assertThat(tree(anon.send("GET","/api/v1/flash-sale",null,false)).path("items").size()).isZero();
 }
 @Test void canDisableCampaignAfterBookSells()throws Exception{
  var b=published();assertThat(api.send("PUT","/api/v1/admin/flash-sale",json(sale(0,b.bookCode(),7000)),true).statusCode()).isEqualTo(200);
  jdbc.update("update book_copy set availability='SOLD' where id=?",Long.parseLong(b.id()));
  var disabled=new LinkedHashMap<>(sale(1,b.bookCode(),7000));disabled.put("enabled",false);
  assertThat(api.send("PUT","/api/v1/admin/flash-sale",json(disabled),true).statusCode()).isEqualTo(200);
 }
 @Test void validatesPriceScheduleAndOwnerAndStaleVersion()throws Exception{
  var b=published();for(long price:new long[]{0,10000,11000})assertThat(api.send("PUT","/api/v1/admin/flash-sale",json(sale(0,b.bookCode(),price)),true).statusCode()).isEqualTo(400);
  var reversed=new LinkedHashMap<>(sale(0,b.bookCode(),7000));reversed.put("endsAt",Instant.now().minusSeconds(120).toString());assertThat(api.send("PUT","/api/v1/admin/flash-sale",json(reversed),true).statusCode()).isEqualTo(400);
  assertThat(api.send("PUT","/api/v1/admin/flash-sale",json(sale(0,b.bookCode(),7000)),true).statusCode()).isEqualTo(200);
  long audits=jdbc.queryForObject("select count(*) from audit_event where target_type='FLASH_SALE'",Long.class);assertThat(audits).isEqualTo(1);
  assertThat(api.send("PUT","/api/v1/admin/flash-sale",json(sale(0,b.bookCode(),6000)),true).statusCode()).isEqualTo(409);assertThat(jdbc.queryForObject("select count(*) from audit_event where target_type='FLASH_SALE'",Long.class)).isEqualTo(audits);
  api.login("staff@catalogue.test");assertThat(api.send("PUT","/api/v1/admin/flash-sale",json(sale(1,b.bookCode(),6000)),true).statusCode()).isEqualTo(403);
 }
}
