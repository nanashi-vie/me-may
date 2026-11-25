package vn.memay.order;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import vn.memay.support.*;
import static org.assertj.core.api.Assertions.*;
import java.util.*;
class OrderCatalogMatchTest extends OrderTestSupport {
 @Autowired CatalogMatchService match;
 @Test void findsAccentAndNearTitleEvenWhenHiddenOrSold(){
  var a=ready();var b=ready();
  jdbc.update("update book_copy set title='Đốm và Bé',availability='SOLD' where id=?",Long.parseLong(a.id()));
  jdbc.update("update book_copy set title='Harry Potter' where id=?",Long.parseLong(b.id()));
  assertThat(match.find(" dom   VA be ")).extracting(OrderDtos.CatalogCandidate::id).contains(a.id());
  assertThat(match.find("Hary Poter")).extracting(OrderDtos.CatalogCandidate::id).contains(b.id());
  jdbc.update("update book_copy set deleted_at=current_timestamp where id=?",Long.parseLong(a.id()));
  assertThat(match.find("dom va be")).isEmpty();
 }
 @Test void exactMatchesComeFirstAndAtMostFiveResults(){
  for(int i=0;i<8;i++){var b=ready();jdbc.update("update book_copy set title=? where id=?","Harry Potter"+(i==0?"":" "+i),Long.parseLong(b.id()));}
  var result=match.find("Harry Potter");assertThat(result).hasSize(5);assertThat(result.getFirst().title()).isEqualTo("Harry Potter");
 }
 private String titled(String title){var b=ready();jdbc.update("update book_copy set title=? where id=?",title,Long.parseLong(b.id()));return b.id();}
 private OrderDtos.CatalogCandidate only(String query){var result=match.find(query);assertThat(result).hasSize(1);return result.getFirst();}
 @Test void suggestsPartialTitleWithoutExactFlag(){
  String id=titled("Harry Potter và hòn đá phù thủy");
  var found=only("Harry Potter");assertThat(found.id()).isEqualTo(id);assertThat(found.exact()).isFalse();
 }
 @Test void flagsExactFirstIgnoringAccentsCaseAndPunctuation(){
  titled("Đốm và Bé đi chơi");String exact=titled("ĐỐM và-Bé!");
  var result=match.find("dom va be");
  assertThat(result.getFirst().id()).isEqualTo(exact);assertThat(result).extracting(OrderDtos.CatalogCandidate::exact).containsExactly(true,false);
 }
 @Test void oneCharacterOnlyMatchesExactly(){String six=titled("6");titled("6 chú vịt");assertThat(only("6").id()).isEqualTo(six);}
 @Test void punctuationOnlyOrLongTitleIsSafe(){
  titled("Harry Potter");
  assertThat(match.match("?!…").items()).isEmpty();assertThat(match.find("a ".repeat(150).strip())).isEmpty();assertThat(match.find("harry".repeat(60))).isEmpty();
 }
 @Test void nonLatinExactStillFlagged(){titled("日本の本 が");assertThat(only("日本の本 が").exact()).isTrue();}
 @Test void exactIsNotLostBehindPrefilter(){
  long source=Long.parseLong(titled("placeholder"));
  jdbc.update("insert into book_copy(book_code,title,binding,condition_grade,weight_g) select 'MM-9'||lpad(g::text,5,'0'),'sách cuốn '||g,binding,condition_grade,weight_g from book_copy,generate_series(1,250) g where id=?",source);
  jdbc.update("insert into listing(book_copy_id,slug,price_min_vnd,price_max_vnd,category_id,publication_status) select b.id,lower(b.book_code),l.price_min_vnd,l.price_max_vnd,l.category_id,'ARCHIVED' from book_copy b,listing l where l.book_copy_id=? and b.title like 'sách cuốn %'",source);
  String exact=titled("Sách cuối");var result=match.find("sách cuối");
  assertThat(result).hasSizeLessThanOrEqualTo(5);assertThat(result.getFirst().id()).isEqualTo(exact);
 }
 @Test void onlyExactResultsChangeTheFingerprint(){
  String near=titled("Harry Potter 2");String exact=titled("Harry Potter");String before=match.match("Harry Potter").fingerprint();
  jdbc.update("update book_copy set version=version+1 where id=?",Long.parseLong(near));assertThat(match.match("harry potter").fingerprint()).isEqualTo(before);
  jdbc.update("update book_copy set version=version+1 where id=?",Long.parseLong(exact));assertThat(match.match("Harry Potter").fingerprint()).isNotEqualTo(before);
 }
 @Test void catalogueListIsNeverFlaggedExact(){titled("Harry Potter");assertThat(match.catalogList("harry potter",0,20).items()).extracting(OrderDtos.CatalogCandidate::exact).containsOnly(false);}
 @Test void everyTitleIsExactAgainstItself(){
  for(String title:List.of("日本の本　が","Hello World","A B C","Tab\tmới","ΟΔΥΣΣΕΥΣ","ВОЙНА И МИР","ガラスの仮面","Đốm “và” Bé’s","İstanbul","ＦＵＬＬ Ｗｉｄｔｈ")){
   String id=titled(title);
   assertThat(match.find(title)).as(title).filteredOn(OrderDtos.CatalogCandidate::exact).extracting(OrderDtos.CatalogCandidate::id).contains(id);
  }
 }
}
