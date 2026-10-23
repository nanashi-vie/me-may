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
 @Test void anonymousOnlySeesPublishedIncludingSold()throws Exception{
  var draft=ready();var pub=published();jdbc.update("update book_copy set availability='SOLD' where id=?",Long.parseLong(pub.id()));
  var r=anon.send("GET","/api/v1/books",null,false);assertThat(r.statusCode()).isEqualTo(200);assertThat(tree(r).path("totalElements").asInt()).isEqualTo(1);assertThat(r.body()).contains(pub.bookCode(),"SOLD").doesNotContain(draft.bookCode(),"sourceRef","storagePublicId","version","readingLevelBasis");assertThat(r.headers().firstValue("cache-control").orElse("")).contains("no-store");
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
}
