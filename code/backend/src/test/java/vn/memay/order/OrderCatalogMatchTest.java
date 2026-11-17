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
}
