package vn.memay.catalogue;
import org.junit.jupiter.api.Test;
import vn.memay.support.*;
import java.util.List;
import static vn.memay.support.BookFixtures.*;
import static org.assertj.core.api.Assertions.*;
class BookCommandIntegrationTest extends CatalogueTestSupport {
 @Test void validatesPictureBindingOnUpdateAndNormalizesTitle(){
  var a=seed(owner,draft("Legacy"));long id=Long.parseLong(a.id());
  for(String binding:new String[]{null,"ALL"})assertThatThrownBy(()->commands.update(id,a.version(),owner,write("Picture","PICTURE_BOOK",binding,100L,null,null,List.of(),List.of()))).hasMessageContaining("binding");
  var updated=commands.update(id,a.version(),owner,write("  Picture  ","PICTURE_BOOK","PAPERBACK",1L,"A1",null,List.of("AGE_7_9","AGE_4_6"),List.of()));
  assertThat(updated.title()).isEqualTo("Picture");assertThat(updated.ageGroups()).containsExactly("AGE_4_6","AGE_7_9");
 }
 @Test void nullableLevelIsOptional(){var a=seed(owner,write("A",null,null,100L,"A1",null,List.of(),List.of()));assertThat(commands.update(Long.parseLong(a.id()),a.version(),owner,draft("A")).readingLevel()).isNull();}
 @Test void staleWriteDoesNotChangeListingOrAudit(){var a=seed(owner,draft("A"));commands.update(Long.parseLong(a.id()),a.version(),owner,draft("B"));int audits=jdbc.queryForObject("select count(*) from audit_event",Integer.class);assertThatThrownBy(()->commands.update(Long.parseLong(a.id()),a.version(),owner,draft("C"))).hasMessageContaining("version_conflict");assertThat(jdbc.queryForObject("select title from book_copy",String.class)).isEqualTo("B");assertThat(jdbc.queryForObject("select count(*) from audit_event",Integer.class)).isEqualTo(audits);}
 @Test void auditFailureRollsBackUpdate(){var a=seed(owner,draft("Before"));jdbc.execute("alter table audit_event add constraint reject_update_for_test check(action<>'UPDATE')");try{assertThatThrownBy(()->commands.update(Long.parseLong(a.id()),a.version(),owner,draft("After"))).isInstanceOf(RuntimeException.class);assertThat(jdbc.queryForObject("select title from book_copy",String.class)).isEqualTo("Before");}finally{jdbc.execute("alter table audit_event drop constraint reject_update_for_test");}}
 @Test void noOpDoesNotBumpVersion(){var a=seed(owner,draft("A"));assertThat(commands.update(Long.parseLong(a.id()),a.version(),owner,draft("A")).version()).isEqualTo(a.version());assertThat(jdbc.queryForObject("select count(*) from audit_event",Integer.class)).isEqualTo(1);}
 @Test void invalidPricesAreRejectedOnUpdate(){var a=seed(owner,draft("A"));for(Long price:new Long[]{0L,-1L,1000000000000L})assertThatThrownBy(()->commands.update(Long.parseLong(a.id()),a.version(),owner,write("A",null,null,price,null,null,List.of(),List.of()))).hasMessageContaining("priceMinVnd");var updated=commands.update(Long.parseLong(a.id()),a.version(),owner,write("A",null,null,999999999999L,null,null,List.of(),List.of()));assertThat(updated.priceMaxVnd()).isEqualTo(999999999999L);}
}
