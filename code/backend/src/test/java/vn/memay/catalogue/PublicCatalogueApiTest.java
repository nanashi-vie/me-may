package vn.memay.catalogue;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Value;
import vn.memay.support.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static vn.memay.support.AdminHttpClient.*;
class PublicCatalogueApiTest extends CatalogueTestSupport {
 @Value("${local.server.port}") int port; AdminHttpClient anon;
 @BeforeEach void client(){anon=new AdminHttpClient(port);}
 private BookDtos.BookDetail published(){var b=ready();jdbc.update("update listing set publication_status='PUBLISHED',published_at='2026-01-01T00:00:00Z' where book_copy_id=?",Long.parseLong(b.id()));return b;}
 @Test void lookupPreservesOrderDeduplicatesAndNeverExposesHiddenBooks()throws Exception{
  var first=published();var sold=published();var draft=ready();var hidden=published();
  jdbc.update("update book_copy set availability='SOLD' where id=?",Long.parseLong(sold.id()));
  jdbc.update("update listing set publication_status='ARCHIVED' where book_copy_id=?",Long.parseLong(hidden.id()));
  var r=anon.send("GET","/api/v1/books/lookup?code="+sold.bookCode()+"&code="+draft.bookCode()+"&code="+first.bookCode()+"&code="+sold.bookCode()+"&code="+hidden.bookCode()+"&code=MM-999999999",null,false);
  assertThat(r.statusCode()).isEqualTo(200);var body=tree(r);assertThat(body.size()).isEqualTo(2);
  assertThat(body.get(0).path("bookCode").asString()).isEqualTo(sold.bookCode());assertThat(body.get(0).path("availability").asString()).isEqualTo("SOLD");
  assertThat(body.get(1).path("bookCode").asString()).isEqualTo(first.bookCode());
  assertThat(r.body()).doesNotContain(draft.bookCode(),hidden.bookCode(),"storagePublicId","sourceRef","version");
  assertThat(r.headers().firstValue("cache-control").orElse("")).contains("no-store");assertThat(r.headers().firstValue("x-memay-server-time").map(java.time.Instant::parse)).isPresent();
 }
 @Test void lookupValidatesBoundedCanonicalCodesAndSupportsMoreThanSixDigits()throws Exception{
  var b=published();jdbc.update("update book_copy set book_code='MM-1000000' where id=?",Long.parseLong(b.id()));
  var large=anon.send("GET","/api/v1/books/lookup?code=MM-1000000",null,false);assertThat(large.statusCode()).isEqualTo(200);assertThat(tree(large).get(0).path("bookCode").asString()).isEqualTo("MM-1000000");
  assertThat(anon.send("GET","/api/v1/books/lookup?code=MM-9223372036854775807",null,false).statusCode()).isEqualTo(200);
  for(String query:List.of("","?code=","?code=MM-000000","?code=MM-1","?code=MM-0000001","?code=mm-000001","?code=MM-9223372036854775808","?code=MM-000001&code=invalid","?"+String.join("&",Collections.nCopies(101,"code=MM-000001")))){
   var r=anon.send("GET","/api/v1/books/lookup"+query,null,false);assertThat(r.statusCode()).as(query).isEqualTo(400);assertThat(r.headers().firstValue("cache-control").orElse("")).contains("no-store");
  }
  assertThat(anon.send("GET","/api/v1/books/lookup?"+String.join("&",Collections.nCopies(100,"code=MM-1000000")),null,false).statusCode()).isEqualTo(200);
 }
 @Test void anonymousOnlySeesPublishedIncludingSold()throws Exception{
  var draft=ready();var pub=published();jdbc.update("update book_copy set availability='SOLD' where id=?",Long.parseLong(pub.id()));
  var r=anon.send("GET","/api/v1/books",null,false);assertThat(r.statusCode()).isEqualTo(200);assertThat(tree(r).path("totalElements").asInt()).isEqualTo(1);assertThat(r.body()).contains(pub.bookCode(),"SOLD").doesNotContain(draft.bookCode(),"sourceRef","storagePublicId","version","readingLevelBasis");assertThat(r.headers().firstValue("cache-control").orElse("")).contains("no-store");assertThat(r.headers().firstValue("x-memay-server-time").map(java.time.Instant::parse)).isPresent();
  assertThat(anon.send("GET","/api/v1/books/"+draft.slug(),null,false).statusCode()).isEqualTo(404);
  var detail=anon.send("GET","/api/v1/books/"+pub.slug(),null,false);assertThat(tree(detail).path("media").size()).isEqualTo(3);
  jdbc.update("update listing set publication_status='ARCHIVED' where book_copy_id=?",Long.parseLong(pub.id()));
  assertThat(anon.send("GET","/api/v1/books/"+pub.slug(),null,false).statusCode()).isEqualTo(404);
  assertThat(anon.send("GET","/api/v1/books/"+pub.slug()+"/media/FRONT",null,false).statusCode()).isEqualTo(404);
 }
 @Test void combinesAgeOrWithCategoryAndBindingAndLiteralQuery()throws Exception{
  var a=published();var b=published();jdbc.update("update book_copy set binding='PAPERBACK',title='100% O_Reilly' where id=?",Long.parseLong(a.id()));
  jdbc.update("update listing_age_group set age_group='AGE_7_9' where listing_id=(select id from listing where book_copy_id=?)",Long.parseLong(a.id()));
  for(String query:List.of("age=AGE_4_6&age=AGE_7_9&category=PICTURE_BOOK&binding=ALL","category=PICTURE_BOOK"))assertThat(tree(anon.send("GET","/api/v1/books?"+query,null,false)).path("totalElements").asInt()).isEqualTo(2);
  for(String query:List.of("q=%25","q=_","q="+a.bookCode().toLowerCase(Locale.ROOT),"binding=PAPERBACK&category=PICTURE_BOOK"))assertThat(tree(anon.send("GET","/api/v1/books?"+query,null,false)).path("totalElements").asInt()).isEqualTo(1);
  assertThat(tree(anon.send("GET","/api/v1/books?category=BOARD_BOOK&binding=HARDCOVER",null,false)).path("totalElements").asInt()).isZero();
 }
 @Test void stablePagingPriceAndBadFilters()throws Exception{
  for(int i=0;i<22;i++)published();
  var first=tree(anon.send("GET","/api/v1/books?sort=price_asc",null,false));var next=tree(anon.send("GET","/api/v1/books?sort=price_asc&page=1",null,false));assertThat(first.path("items").size()).isEqualTo(20);assertThat(next.path("items").size()).isEqualTo(2);assertThat(first.path("items").get(19).path("bookCode").asString()).isNotEqualTo(next.path("items").get(0).path("bookCode").asString());
  for(String q:List.of("page=-1","sort=arbitrary","age=INVALID","category=INVALID","q="+"x".repeat(201)))assertThat(anon.send("GET","/api/v1/books?"+q,null,false).statusCode()).as(q).isEqualTo(400);
 }
 @Test void activeCollectionsAndContactNoFakeLinks()throws Exception{
  jdbc.update("insert into collection(name,slug,active) values ('Visible','visible',true),('Hidden','hidden',false)");
  assertThat(anon.send("GET","/api/v1/collections",null,false).body()).contains("Visible").doesNotContain("Hidden");
  assertThat(anon.send("GET","/api/v1/collections/hidden",null,false).statusCode()).isEqualTo(404);
  assertThat(anon.send("GET","/api/v1/taxonomy",null,false).statusCode()).isEqualTo(200);
  var contact=anon.send("GET","/api/v1/contact",null,false);assertThat(contact.statusCode()).isEqualTo(200);assertThat(tree(contact).path("hotlineUrl").isNull()).isTrue();
  assertThat(anon.send("GET","/api/v1/admin/books",null,false).statusCode()).isEqualTo(401);
 }

 @Test void anonymousCachePolicyStopsBeforeTheNextSaleTransition() throws Exception {
  jdbc.update("update flash_sale set enabled=true, starts_at=current_timestamp+interval '10 seconds', ends_at=current_timestamp+interval '1 hour' where id=1");
  var response = anon.send("GET", "/api/v1/cache-policy", null, false);
  assertThat(response.statusCode()).isEqualTo(200);
  assertThat(response.headers().firstValue("cache-control").orElse("")).contains("no-store");
  var policy = tree(response);
  var now = java.time.Instant.parse(policy.path("serverNow").asString());
  var expiry = java.time.Instant.parse(policy.path("expiresAt").asString());
  assertThat(java.time.Duration.between(now, expiry).toMillis()).isBetween(1L, 10000L);
  assertThat(policy.path("enabled").asBoolean()).isFalse();
 }

 @Test void relatedReturnsBooksWithSamePublisherAndCategoryExcludingCurrent() throws Exception {
  var b1 = published();
  var b2 = published();
  var b3 = published();
  var b4 = ready();
  jdbc.update("update book_copy set publisher='Kim Đồng' where id in (?, ?, ?)", Long.parseLong(b1.id()), Long.parseLong(b2.id()), Long.parseLong(b4.id()));
  jdbc.update("update listing set category_id=(select id from category where code='BOARD_BOOK') where book_copy_id=?", Long.parseLong(b2.id()));
  jdbc.update("update book_copy set publisher='Nhã Nam' where id=?", Long.parseLong(b3.id()));

  var res = anon.send("GET", "/api/v1/books/" + b1.slug() + "/related", null, false);
  assertThat(res.statusCode()).isEqualTo(200);
  var body = tree(res);
  var pubBooks = body.path("samePublisherBooks");
  assertThat(pubBooks.size()).isEqualTo(1);
  assertThat(pubBooks.get(0).path("bookCode").asString()).isEqualTo(b2.bookCode());

  var catBooks = body.path("sameCategoryBooks");
  assertThat(catBooks.size()).isEqualTo(1);
  assertThat(catBooks.get(0).path("bookCode").asString()).isEqualTo(b3.bookCode());

  assertThat(anon.send("GET", "/api/v1/books/non-existent-slug/related", null, false).statusCode()).isEqualTo(404);

  var noPub = published();
  jdbc.update("update book_copy set publisher=null where id=?", Long.parseLong(noPub.id()));
  var resNoPub = anon.send("GET", "/api/v1/books/" + noPub.slug() + "/related", null, false);
  assertThat(resNoPub.statusCode()).isEqualTo(200);
  assertThat(tree(resNoPub).path("samePublisherBooks").size()).isEqualTo(0);
 }

 @Test void searchQueryMatchesPublisher() throws Exception {
  var b = published();
  jdbc.update("update book_copy set publisher='Usborne Publishing' where id=?", Long.parseLong(b.id()));
  var res = anon.send("GET", "/api/v1/books?q=Usborne", null, false);
  assertThat(res.statusCode()).isEqualTo(200);
  assertThat(tree(res).path("totalElements").asInt()).isEqualTo(1);
  assertThat(tree(res).path("items").get(0).path("bookCode").asString()).isEqualTo(b.bookCode());
 }
}
