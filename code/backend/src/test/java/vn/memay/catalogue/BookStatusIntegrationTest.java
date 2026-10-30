package vn.memay.catalogue;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import vn.memay.support.*;
import vn.memay.catalogue.BookDtos.*;
import static org.assertj.core.api.Assertions.*;
class BookStatusIntegrationTest extends CatalogueTestSupport {
 @Autowired BookStatusService statuses;
 @Test void ownerRequiresFrontAndBackForPublication(){
  var b=ready();long id=Long.parseLong(b.id());
  jdbc.update("delete from book_media where book_copy_id=? and role='BACK'",id);
  assertThatThrownBy(()->statuses.publication(id,b.version(),owner,Publication.PUBLISHED,true)).hasMessageContaining("media");
  assertThatThrownBy(()->statuses.publication(id,b.version(),owner,Publication.PUBLISHED,false)).hasMessageContaining("confirmedActualCopy");
 }
 @Test void staffCannotPublishOrChangeAvailability(){var b=ready();long id=Long.parseLong(b.id());assertThatThrownBy(()->statuses.publication(id,b.version(),staff,Publication.PUBLISHED,true)).hasMessageContaining("forbidden");assertThatThrownBy(()->statuses.availability(id,b.version(),staff,Availability.SOLD)).hasMessageContaining("forbidden");}
 @Test void archiveRestorePreservesCodeAndFirstPublishedAt(){
  var b=ready();long id=Long.parseLong(b.id());var pub=statuses.publication(id,b.version(),owner,Publication.PUBLISHED,true);
  var stockWrite=BookFixtures.variants(BookFixtures.write(pub.title(),pub.categoryCode(),pub.binding(),pub.priceMinVnd(),pub.readingLevel(),null,pub.ageGroups(),pub.collectionIds()),pub.variants().stream().map(v->new VariantView(v.id(),v.name(),0)).toList());var sold=commands.update(id,pub.version(),owner,stockWrite);assertThat(sold.publication()).isEqualTo(Publication.PUBLISHED);
  var hidden=statuses.publication(id,sold.version(),owner,Publication.ARCHIVED,false);assertThat(hidden.availability()).isEqualTo(Availability.SOLD);
  var draft=statuses.publication(id,hidden.version(),owner,Publication.ARCHIVED,false);var again=statuses.publication(id,draft.version(),owner,Publication.PUBLISHED,true);
  assertThat(again.bookCode()).isEqualTo(b.bookCode());assertThat(again.publishedAt()).isEqualTo(pub.publishedAt());
  var same=statuses.publication(id,again.version(),owner,Publication.PUBLISHED,false);assertThat(same.version()).isEqualTo(again.version());
 }
 @Test void publishedEditsCannotEraseRequiredFields(){var b=ready();long id=Long.parseLong(b.id());var pub=statuses.publication(id,b.version(),owner,Publication.PUBLISHED,true);assertThatThrownBy(()->update(id,pub.version(),owner,BookFixtures.draft(null))).hasMessageContaining("title");assertThat(jdbc.queryForObject("select title from book_copy where id=?",String.class,id)).isEqualTo("Real book");}
 @Test void staffCannotEditArchivedOrPublished(){var b=ready();long id=Long.parseLong(b.id());var pub=statuses.publication(id,b.version(),owner,Publication.PUBLISHED,true);assertThatThrownBy(()->update(id,pub.version(),staff,BookFixtures.draft("Forged"))).hasMessageContaining("forbidden");var hidden=statuses.publication(id,pub.version(),owner,Publication.ARCHIVED,false);assertThatThrownBy(()->update(id,hidden.version(),staff,BookFixtures.draft("Forged"))).hasMessageContaining("forbidden");}
 @Test void missingRequiredPublicationFieldsAreReported(){
  for(String key:java.util.List.of("title","categoryCode","priceMinVnd","conditionNote")){
   var b=ready();long id=Long.parseLong(b.id());
   switch(key){case "title"->jdbc.update("update book_copy set title=null where id=?",id);case "conditionNote"->jdbc.update("update book_copy set condition_note=null where id=?",id);case "categoryCode"->jdbc.update("update listing set category_id=null where book_copy_id=?",id);case "priceMinVnd"->jdbc.update("update listing set price_min_vnd=null,price_max_vnd=null where book_copy_id=?",id);}
   assertThatThrownBy(()->statuses.publication(id,b.version(),owner,Publication.PUBLISHED,true)).hasMessageContaining(key);
  }
 }
}
