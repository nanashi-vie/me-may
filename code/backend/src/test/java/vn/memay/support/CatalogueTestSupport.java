package vn.memay.support;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.*;
import org.springframework.jdbc.core.JdbcTemplate;
import vn.memay.auth.*;
import vn.memay.catalogue.*;
import java.util.*;
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={"spring.profiles.active=test","memay.bootstrap.enabled=false","server.servlet.session.cookie.secure=false"})
public abstract class CatalogueTestSupport {
 @DynamicPropertySource static void db(DynamicPropertyRegistry p){p.add("spring.datasource.url",()->PgTestData.requireTestJdbcUrl(System.getenv("TEST_DB_URL")));}
 @Autowired protected JdbcTemplate jdbc; @Autowired protected AdminUserRepository users; @Autowired protected BookCommandService commands;
 protected AdminUser owner,staff;
 @BeforeEach void catalogueSetup(){PgTestData.clean(jdbc);var hash=new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().encode("test-password-123");owner=users.save(new AdminUser("owner@catalogue.test",hash,AdminUser.Role.OWNER));staff=users.save(new AdminUser("staff@catalogue.test",hash,AdminUser.Role.STAFF));}
 protected BookDtos.BookDetail ready(){
  var b=commands.create(owner,BookFixtures.write("Real book","PICTURE_BOOK","HARDCOVER",10000L,null,null,List.of("AGE_4_6"),List.of()));
  for(String role:List.of("FRONT","BACK","INSIDE"))jdbc.update("insert into book_media(id,book_copy_id,role,state,storage_public_id,alt) values (?, ?,?,'ACTIVE',?,?)",UUID.randomUUID(),Long.parseLong(b.id()),role,"test/"+UUID.randomUUID(),role);
  return b;
 }
}
