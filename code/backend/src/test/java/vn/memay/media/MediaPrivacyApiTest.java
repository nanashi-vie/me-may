package vn.memay.media;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import vn.memay.support.*;
import java.util.Map;
import static vn.memay.support.AdminHttpClient.*;
import static org.assertj.core.api.Assertions.*;
class MediaPrivacyApiTest extends MediaTestSupport {
 @Value("${local.server.port}")int port;
 @Test void streamIsAuthenticatedAndDoesNotRedirectOrLeakCloudKey()throws Exception{
  var b=commands.create(owner,BookFixtures.draft("A"));var uploaded=media.upload(Long.parseLong(b.id()),MediaDtos.MediaRole.FRONT,b.version(),owner,ImageValidatorTest.image("jpeg"),null,"internal-source");String path="/api/v1/admin/books/"+b.id()+"/media/FRONT/content";
  var api=new AdminHttpClient(port);assertThat(api.send("GET",path,null,false).statusCode()).isEqualTo(401);api.login("owner@catalogue.test");var response=api.send("GET",path,null,false);assertThat(response.statusCode()).isEqualTo(200);assertThat(response.headers().firstValue("content-type").orElse("")).isEqualTo("image/jpeg");assertThat(response.headers().firstValue("cache-control").orElse("")).contains("no-store");assertThat(response.headers().firstValue("x-content-type-options").orElse("")).isEqualTo("nosniff");assertThat(response.headers().firstValue("location")).isEmpty();assertThat(json(uploaded)).doesNotContain("storagePublicId","cloudinary","memay/test");
 }
 @Test void metadataRequiresVersionAndStaffCannotMutatePublishedMedia()throws Exception{
  var b=ready();var api=new AdminHttpClient(port);api.login("owner@catalogue.test");String path="/api/v1/admin/books/"+b.id()+"/media/FRONT";
  assertThat(api.send("PATCH",path,json(Map.of("alt","A")),true).statusCode()).isEqualTo(400);
  assertThat(api.send("PATCH",path,json(Map.of("version",b.version(),"alt","A","storagePublicId","forged")),true).statusCode()).isEqualTo(400);
  var changed=tree(api.send("PATCH",path,json(Map.of("version",b.version(),"alt","A")),true));long v=changed.path("version").asLong();assertThat(v).isEqualTo(b.version()+1);
  var status=api.send("PATCH","/api/v1/admin/books/"+b.id()+"/publication",json(Map.of("version",v,"status","PUBLISHED","confirmedActualCopy",true)),true);long published=tree(status).path("version").asLong();assertThat(status.statusCode()).isEqualTo(200);
  assertThat(api.send("DELETE",path+"?version="+published,null,true).statusCode()).isEqualTo(409);api.login("staff@catalogue.test");assertThat(api.send("PATCH",path,json(Map.of("version",published,"alt","B")),true).statusCode()).isEqualTo(403);assertThat(fake.uploads.get()).isZero();
 }
 @Test void uploadErrorsAndCsrfCannotReachProvider()throws Exception{
  var b=commands.create(owner,BookFixtures.draft("A"));var api=new AdminHttpClient(port);api.login("owner@catalogue.test");String path="/api/v1/admin/books/"+b.id()+"/media/FRONT";
  assertThat(api.upload(path,b.version(),ImageValidatorTest.image("png"),false).statusCode()).isEqualTo(403);
  assertThat(api.upload(path,b.version(),"<svg/>".getBytes(),true).statusCode()).isEqualTo(415);
  var tooLarge=api.upload(path,b.version(),new byte[10*1024*1024+1],true);assertThat(tooLarge.statusCode()).isEqualTo(413);assertThat(tree(tooLarge).path("error").asString()).isEqualTo("image_too_large");
  assertThat(api.upload(path.replace("FRONT","OTHER"),b.version(),ImageValidatorTest.image("png"),true).statusCode()).isEqualTo(400);assertThat(fake.uploads.get()).isZero();
  fake.failUpload=true;assertThat(api.upload(path,b.version(),ImageValidatorTest.image("png"),true).statusCode()).isEqualTo(502);fake.failUpload=false;
  var good=api.upload(path,b.version(),ImageValidatorTest.image("png"),true);assertThat(good.statusCode()).isEqualTo(201);long v=tree(good).path("version").asLong();
  assertThat(api.upload(path,b.version(),ImageValidatorTest.image("png"),true).statusCode()).isEqualTo(409);assertThat(api.send("DELETE",path+"?version="+v,null,true).statusCode()).isEqualTo(200);
 }
}
