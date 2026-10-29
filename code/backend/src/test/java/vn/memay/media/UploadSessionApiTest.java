package vn.memay.media;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Value;
import vn.memay.support.*;
import java.util.*;
import static vn.memay.support.AdminHttpClient.*;
import static org.assertj.core.api.Assertions.*;
class UploadSessionApiTest extends MediaTestSupport {
 @Value("${local.server.port}") int port;
 @Test void ownerUploadsPrivatePhotosWithoutCreatingBooksOrAudit()throws Exception {
  var api=new AdminHttpClient(port);api.login("owner@catalogue.test");
  var start=api.send("POST","/api/v1/admin/upload-sessions","{}",true);assertThat(start.statusCode()).isEqualTo(201);
  String id=tree(start).path("id").asString(),base="/api/v1/admin/upload-sessions/"+id;
  var uploaded=api.upload(base+"/media",0,ImageValidatorTest.image("png"),true);assertThat(uploaded.statusCode()).isEqualTo(201);
  String media=tree(uploaded).path("id").asString();assertThat(tree(uploaded).path("state").asString()).isEqualTo("READY");
  assertThat(uploaded.body()).doesNotContain("publicId","storagePublicId","cloudinary","signature");
  var image=api.download(base+"/media/"+media);assertThat(image.statusCode()).isEqualTo(200);assertThat(image.headers().firstValue("cache-control").orElse("")).contains("no-store");
  assertThat(jdbc.queryForObject("select count(*) from book_copy",Integer.class)).isZero();assertThat(jdbc.queryForObject("select count(*) from audit_event",Integer.class)).isZero();
  var anon=new AdminHttpClient(port);assertThat(anon.send("GET",base,null,false).statusCode()).isEqualTo(401);
  assertThat(api.send("POST",base+"/media","{}",false).statusCode()).isEqualTo(403);
  var other=users.save(new vn.memay.auth.AdminUser("other@catalogue.test",new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().encode("test-password-123"),vn.memay.auth.AdminUser.Role.OWNER));
  api.login(other.getEmail());assertThat(api.send("GET",base,null,false).statusCode()).isEqualTo(404);
  api.login("staff@catalogue.test");assertThat(api.send("POST","/api/v1/admin/upload-sessions","{}",true).statusCode()).isEqualTo(403);assertThat(api.send("GET",base,null,false).statusCode()).isEqualTo(403);
 }
 @Test void sixPhotosMaximumAndExpiredSessionsCannotUpload()throws Exception {
  var api=new AdminHttpClient(port);api.login("owner@catalogue.test");String id=tree(api.send("POST","/api/v1/admin/upload-sessions","{}",true)).path("id").asString(),base="/api/v1/admin/upload-sessions/"+id;
  for(int i=0;i<6;i++)assertThat(api.upload(base+"/media",0,ImageValidatorTest.image("jpeg"),true).statusCode()).isEqualTo(201);
  int uploads=fake.uploads.get();assertThat(api.upload(base+"/media",0,ImageValidatorTest.image("jpeg"),true).statusCode()).isEqualTo(409);assertThat(fake.uploads.get()).isEqualTo(uploads);
  jdbc.update("update upload_session set created_at=current_timestamp-interval '2 days',expires_at=current_timestamp-interval '1 second' where id=?",UUID.fromString(id));
  assertThat(api.upload(base+"/media",0,ImageValidatorTest.image("jpeg"),true).statusCode()).isEqualTo(410);
 }
 @Test void retryingTheSameImageRequestReusesReadyMediaAndRejectsDifferentBytes()throws Exception {
  var api=new AdminHttpClient(port);api.login("owner@catalogue.test");String id=tree(api.send("POST","/api/v1/admin/upload-sessions","{}",true)).path("id").asString();
  String path="/api/v1/admin/upload-sessions/"+id+"/media?requestKey="+UUID.randomUUID();
  var a=api.upload(path,0,ImageValidatorTest.image("jpeg"),true);var b=api.upload(path,0,ImageValidatorTest.image("jpeg"),true);
  assertThat(a.statusCode()).isEqualTo(201);assertThat(b.statusCode()).isEqualTo(201);assertThat(tree(a).path("id").asString()).isEqualTo(tree(b).path("id").asString());assertThat(fake.uploads.get()).isEqualTo(1);
  assertThat(api.upload(path,0,ImageValidatorTest.image("png"),true).statusCode()).isEqualTo(409);
 }
}
