package vn.memay.catalogue;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.*;
import vn.memay.auth.*;
import vn.memay.support.*;
import java.util.List;
import static vn.memay.support.BookFixtures.*;
import static org.assertj.core.api.Assertions.*;
@SpringBootTest(properties={"spring.profiles.active=test","memay.bootstrap.enabled=false"})
class BookCommandIntegrationTest {
 @DynamicPropertySource static void db(DynamicPropertyRegistry p){p.add("spring.datasource.url",()->PgTestData.requireTestJdbcUrl(System.getenv("TEST_DB_URL")));}
 @Autowired JdbcTemplate jdbc; @Autowired AdminUserRepository users; @Autowired BookCommandService commands;
 AdminUser owner,staff;
 @BeforeEach void setup(){PgTestData.clean(jdbc);owner=users.save(new AdminUser("owner@command.test","test-hash",AdminUser.Role.OWNER)); staff=users.save(new AdminUser("staff@command.test","test-hash",AdminUser.Role.STAFF));}
 @Test void createsDraftAndListingAtomically(){
  var b=commands.create(staff,draft(null)); assertThat(b.bookCode()).matches("MM-[0-9]{6,}"); assertThat(b.publication().name()).isEqualTo("DRAFT"); assertThat(b.availability().name()).isEqualTo("AVAILABLE");
  assertThat(jdbc.queryForObject("select count(*) from listing",Integer.class)).isEqualTo(1); assertThat(b.slug()).isEqualTo(b.bookCode().toLowerCase(java.util.Locale.ROOT));
 }
 @Test void duplicateTitleIsTwoPhysicalCopies(){ var a=commands.create(owner,draft("Same"));var b=commands.create(owner,draft("Same"));assertThat(a.bookCode()).isNotEqualTo(b.bookCode());assertThat(a.id()).isNotEqualTo(b.id()); }
 @Test void rejectsMissingPictureBinding(){
  assertThatThrownBy(()->commands.create(owner,write("Picture","PICTURE_BOOK",null,100L,null,null,List.of(),List.of()))).hasMessageContaining("binding");
  assertThatThrownBy(()->commands.create(owner,write("Picture","PICTURE_BOOK","ALL",100L,null,null,List.of(),List.of()))).hasMessageContaining("binding");
  var a=commands.create(owner,write("  Picture  ","PICTURE_BOOK","PAPERBACK",1L,"A1","Tiệm xem nội dung",List.of("AGE_4_6","AGE_7_9"),List.of()));
  assertThat(a.title()).isEqualTo("Picture"); assertThat(a.ageGroups()).containsExactly("AGE_4_6","AGE_7_9");
 }
 @Test void nullableLevelIsOptional(){
  var a=commands.create(owner,write("A",null,null,100L,"A1","Đánh giá",List.of(),List.of()));
  var b=commands.update(Long.parseLong(a.id()),a.version(),owner,draft("A"));assertThat(b.readingLevel()).isNull();
 }
 @Test void staleWriteDoesNotChangeListingOrAudit(){
  var a=commands.create(owner,draft("A"));commands.update(Long.parseLong(a.id()),a.version(),owner,draft("B"));
  int count=jdbc.queryForObject("select count(*) from audit_event",Integer.class);
  assertThatThrownBy(()->commands.update(Long.parseLong(a.id()),a.version(),staff,draft("C"))).hasMessageContaining("version_conflict");
  assertThat(jdbc.queryForObject("select title from book_copy",String.class)).isEqualTo("B");assertThat(jdbc.queryForObject("select count(*) from audit_event",Integer.class)).isEqualTo(count);
 }
 @Test void auditFailureRollsBackBothTables(){
  jdbc.update("delete from admin_user where id=?",owner.getId());
  assertThatThrownBy(()->commands.create(owner,draft("Failure"))).isInstanceOf(RuntimeException.class);
  assertThat(jdbc.queryForObject("select count(*) from book_copy",Integer.class)).isZero();assertThat(jdbc.queryForObject("select count(*) from listing",Integer.class)).isZero();
 }
 @Test void noOpDoesNotBumpVersion(){var a=commands.create(owner,draft("A"));var b=commands.update(Long.parseLong(a.id()),a.version(),owner,draft("A"));assertThat(b.version()).isEqualTo(a.version());assertThat(jdbc.queryForObject("select count(*) from audit_event",Integer.class)).isEqualTo(1);}
 @Test void rejectsInvalidPriceLevelAndLink(){
  for(Long price:new Long[]{0L,-1L,1000000000000L}) assertThatThrownBy(()->commands.create(owner,write("A",null,null,price,null,null,List.of(),List.of()))).hasMessageContaining("priceVnd");
  assertThat(commands.create(owner,write("A",null,null,999999999999L,null,null,List.of(),List.of())).priceVnd()).isEqualTo(999999999999L);
  assertThat(commands.create(owner,write("A",null,null,1L,"A1",null,List.of(),List.of())).readingLevel()).isEqualTo("A1");
 }
}
