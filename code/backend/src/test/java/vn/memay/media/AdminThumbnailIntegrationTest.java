package vn.memay.media;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import vn.memay.support.AdminHttpClient;
import java.util.*;
import static vn.memay.support.AdminHttpClient.*;
import static org.assertj.core.api.Assertions.*;
class AdminThumbnailIntegrationTest extends MediaTestSupport {
 @Value("${local.server.port}") int port;
 @Test void persistedAndTemporaryThumbnailsKeepAuthorizationAndHeaders() throws Exception {
  var b=ready();
  for(String key:jdbc.queryForList("select storage_public_id from book_media where book_copy_id=?",String.class,Long.parseLong(b.id())))fake.assets.put(key,ImageValidatorTest.image("jpeg"));
  var api=new AdminHttpClient(port);api.login(owner.getEmail());
  String path="/api/v1/admin/books/"+b.id()+"/media/FRONT/content";
  for(String suffix:List.of("","?size=320","?size=1280")){
   var image=api.download(path+suffix);assertThat(image.statusCode()).isEqualTo(200);
   assertThat(image.headers().firstValue("content-type")).contains("image/jpeg");
   assertThat(image.headers().firstValue("cache-control")).contains("no-store");
   assertThat(image.headers().firstValue("x-content-type-options")).contains("nosniff");
   assertThat(image.headers().firstValue("location")).isEmpty();
  }
  assertThat(api.download(path+"?size=640").statusCode()).isEqualTo(400);
  assertThat(new AdminHttpClient(port).download(path+"?size=320").statusCode()).isEqualTo(401);
  api.login(staff.getEmail());assertThat(api.download(path+"?size=320").statusCode()).isEqualTo(200);
  api.login(owner.getEmail());String session=tree(api.send("POST","/api/v1/admin/upload-sessions","{}",true)).path("id").asString();
  String base="/api/v1/admin/upload-sessions/"+session+"/media";
  String id=tree(api.upload(base,0,ImageValidatorTest.image("jpeg"),true)).path("id").asString();
  assertThat(api.download(base+"/"+id+"?size=320").statusCode()).isEqualTo(200);
  assertThat(api.download(base+"/"+id+"?size=900").statusCode()).isEqualTo(400);
  api.login(staff.getEmail());assertThat(api.download(base+"/"+id+"?size=320").statusCode()).isEqualTo(403);
  var other=users.save(new vn.memay.auth.AdminUser("other-thumb@test.test",new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().encode("test-password-123"),vn.memay.auth.AdminUser.Role.OWNER));
  api.login(other.getEmail());assertThat(api.download(base+"/"+id+"?size=320").statusCode()).isEqualTo(404);
  assertThat(new AdminHttpClient(port).download("/api/v1/books/"+b.slug()+"/media/FRONT?size=320").statusCode()).isEqualTo(404);
 }
}
