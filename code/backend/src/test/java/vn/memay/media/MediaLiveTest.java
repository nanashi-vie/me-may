package vn.memay.media;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.beans.factory.annotation.*;
import org.springframework.test.context.*;
import org.springframework.jdbc.core.JdbcTemplate;
import vn.memay.auth.*;
import vn.memay.catalogue.*;
import vn.memay.support.*;
import java.util.*;
import java.io.*;
import javax.imageio.ImageIO;
import static org.assertj.core.api.Assertions.*;
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={"memay.bootstrap.enabled=false","server.servlet.session.cookie.secure=false","memay.media.namespace=memay/test"})
@EnabledIfEnvironmentVariable(named="MEMAY_LIVE_MEDIA_TEST",matches="true")
class MediaLiveTest {
 @DynamicPropertySource static void db(DynamicPropertyRegistry p){p.add("spring.datasource.url",()->PgTestData.requireTestJdbcUrl(System.getenv("TEST_DB_URL")));}
 @Autowired JdbcTemplate jdbc;@Autowired AdminUserRepository users;@Autowired BookCommandService books;@Autowired MediaService media;@Autowired MediaGateway gateway;@Autowired MediaCleanupJob cleanup;
 @Value("${local.server.port}")int port;@Value("${memay.media.namespace}")String namespace;
 @Test void liveAdminStreamReplacementAndCleanup()throws Exception{
  assertThat(namespace).isEqualTo("memay/test");assertThat(System.getenv("CLOUDINARY_NAMESPACE")).isEqualTo("memay/test");assertThat(jdbc.queryForObject("select current_database()",String.class)).isEqualTo("me_may_test");assertThat(gateway).isInstanceOf(CloudinaryMediaGateway.class);
  String email="live-"+UUID.randomUUID()+"@catalogue.test";var owner=users.save(new AdminUser(email,new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().encode("test-password-123"),AdminUser.Role.OWNER));Long id=null;Set<String> keys=new LinkedHashSet<>();
  try{
   var b=books.create(owner,BookFixtures.draft("Synthetic technical gate — not owner pilot"));id=Long.parseLong(b.id());
   for(var role:MediaDtos.MediaRole.values()){b=media.upload(id,role,b.version(),owner,ImageValidatorTest.image(role==MediaDtos.MediaRole.FRONT?"jpeg":"png"),null,"internal-test");keys.addAll(keys(id));}
   var anonymous=new AdminHttpClient(port);String path="/api/v1/admin/books/"+id+"/media/FRONT/content";assertThat(anonymous.download(path).statusCode()).isEqualTo(401);anonymous.login(email);var response=anonymous.download(path);assertThat(response.statusCode()).isEqualTo(200);assertThat(response.headers().firstValue("location")).isEmpty();assertThat(response.headers().firstValue("cache-control").orElse("")).contains("no-store");assertThat(ImageIO.read(new ByteArrayInputStream(response.body()))).isNotNull();assertThat(AdminHttpClient.json(b)).doesNotContain("storagePublicId","res.cloudinary.com","signature");
   UUID oldId=jdbc.queryForObject("select id from book_media where book_copy_id=? and role='FRONT' and state='ACTIVE'",UUID.class,id);String old=jdbc.queryForObject("select storage_public_id from book_media where book_copy_id=? and role='FRONT' and state='ACTIVE'",String.class,id);
   b=media.upload(id,MediaDtos.MediaRole.FRONT,b.version(),owner,ImageValidatorTest.image("png"),null,null);keys.addAll(keys(id));assertThat(b.media()).hasSize(3);
   cleanup.cleanupPending(oldId);assertThat(gateway.delete(old)).isEqualTo(MediaGateway.DeleteResult.NOT_FOUND);
  }finally{
   boolean cloudClean=true;if(id!=null)keys.addAll(keys(id));
   for(String key:keys){try{CloudinaryMediaGateway.validatePublicId(key,"memay/test");gateway.delete(key);}catch(RuntimeException e){cloudClean=false;}}
   if(id!=null){if(cloudClean){jdbc.update("delete from book_media where book_copy_id=?",id);jdbc.update("delete from listing_age_group where listing_id in(select id from listing where book_copy_id=?)",id);jdbc.update("delete from listing_collection where listing_id in(select id from listing where book_copy_id=?)",id);jdbc.update("delete from audit_event where target_type='BOOK' and target_id=?",id);jdbc.update("delete from listing where book_copy_id=?",id);jdbc.update("delete from book_copy where id=?",id);}else jdbc.update("update book_media set state='DELETE_PENDING' where book_copy_id=?",id);}
   if(cloudClean)users.deleteById(owner.getId());assertThat(cloudClean).as("Cloud cleanup confirmed before removing test rows").isTrue();
  }
 }
 private List<String> keys(long id){return jdbc.queryForList("select storage_public_id from book_media where book_copy_id=?",String.class,id);}
}
