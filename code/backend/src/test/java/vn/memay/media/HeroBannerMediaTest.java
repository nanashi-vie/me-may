package vn.memay.media;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.*;
import org.springframework.test.context.*;
import vn.memay.support.*;
import java.nio.file.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static vn.memay.support.AdminHttpClient.*;
@TestPropertySource(properties={"memay.media.local.enabled=true","memay.media.local.nginx-origin=http://localhost:59999"})
class HeroBannerMediaTest extends CatalogueTestSupport {
 @TempDir static Path root;
 @DynamicPropertySource static void props(DynamicPropertyRegistry p){p.add("memay.media.local.root",()->{try{return root.toRealPath().toString();}catch(java.io.IOException e){throw new java.io.UncheckedIOException(e);}});}
 @Value("${local.server.port}") int port;
 @Autowired ImageJobService worker;
 @Autowired HeroBannerMedia media;
 private AdminHttpClient api()throws Exception{var a=new AdminHttpClient(port);a.login(owner.getEmail());return a;}
 private java.net.http.HttpResponse<String> upload(AdminHttpClient a,UUID key,byte[] bytes)throws Exception{return a.multipart("/api/v1/admin/hero-banners/uploads","banner.jpg",bytes,Map.of("requestKey",key.toString()),true);}
 private byte[] image()throws Exception{return ImageValidatorTest.image("jpeg");}
 @Test void realWorkerPrivateUntilSaveReplayAndRetirement()throws Exception{
  jdbc.update("insert into image_recipe values('hero-v1','fixture','{}') on conflict do nothing");
  var a=api();var key=UUID.randomUUID();byte[] bytes=image();var first=upload(a,key,bytes);assertThat(first.statusCode()).as(first.body()).isEqualTo(202);
  String id=tree(first).path("id").asString();assertThat(tree(upload(a,key,bytes)).path("id").asString()).isEqualTo(id);
  assertThat(upload(a,key,new byte[]{1,2,3}).statusCode()).isEqualTo(409);
  String priv="/api/v1/admin/hero-banners/uploads/"+id+"/content",pub="/api/v1/hero-banners/"+id+"/content?size=800&format=jpg";
  assertThat(a.download(priv).statusCode()).isEqualTo(404);finish();
  assertThat(tree(a.send("GET","/api/v1/admin/hero-banners/uploads/"+id,null,false)).path("status").asString()).isEqualTo("READY");
  assertThat(a.download(priv).statusCode()).isEqualTo(200);assertThat(a.download(priv).headers().firstValue("Cache-Control")).hasValue("no-store");
  var other=users.save(new vn.memay.auth.AdminUser("other@hero.test",owner.getPasswordHash(),vn.memay.auth.AdminUser.Role.OWNER));var oa=new AdminHttpClient(port);oa.login(other.getEmail());assertThat(oa.download(priv).statusCode()).isEqualTo(403);
  var anon=new AdminHttpClient(port);assertThat(anon.download(pub).statusCode()).isEqualTo(404);
  assertThat(a.send("PUT","/api/v1/admin/hero-banners",json(Map.of("version",0,"banners",List.of(Map.of("id",id,"alt","Hero")))),true).statusCode()).isEqualTo(200);
  var content=anon.download(pub);assertThat(content.statusCode()).isEqualTo(200);assertThat(content.headers().firstValue("Content-Type")).hasValue("image/jpeg");assertThat(content.headers().firstValue("ETag")).isPresent();assertThat(anon.download(pub.replace("800","12")).statusCode()).isEqualTo(400);
  assertThat(a.send("PUT","/api/v1/admin/hero-banners",json(Map.of("version",1,"banners",List.of())),true).statusCode()).isEqualTo(200);assertThat(anon.download(pub).statusCode()).isEqualTo(200);
  jdbc.update("update hero_banner_upload set expires_at=now()-interval '1 minute' where media_id=?",UUID.fromString(id));assertThat(anon.download(pub).statusCode()).isEqualTo(404);
 }
 @Test void failedInputDoesNotPublishAndOversizedUploadRejected()throws Exception{
  jdbc.update("insert into image_recipe values('hero-v1','fixture','{}') on conflict do nothing");var a=api();var result=upload(a,UUID.randomUUID(),new byte[]{1,2,3});assertThat(result.statusCode()).isEqualTo(202);var l=worker.claim().orElseThrow();worker.fail(l.jobId(),l.token(),"invalid_image",false);
  assertThat(tree(a.send("GET","/api/v1/admin/hero-banners/uploads/"+tree(result).path("id").asString(),null,false)).path("status").asString()).isEqualTo("FAILED");
  assertThat(upload(a,UUID.randomUUID(),new byte[10*1024*1024+1]).statusCode()).isIn(413,422);
 }
 @Test void cleanupPreservesCurrentValidDraftAndActiveLease()throws Exception{
  jdbc.update("insert into image_recipe values('hero-v1','fixture','{}') on conflict do nothing");var a=api();
  UUID current=UUID.fromString(tree(upload(a,UUID.randomUUID(),image())).path("id").asString());finish();
  a.send("PUT","/api/v1/admin/hero-banners",json(Map.of("version",0,"banners",List.of(Map.of("id",current,"alt","Current")))),true);
  UUID draft=UUID.fromString(tree(upload(a,UUID.randomUUID(),image())).path("id").asString());var lease=worker.claim().orElseThrow();
  jdbc.update("update hero_banner_upload set expires_at=now()-interval '1 minute' where media_id=?",draft);media.cleanup();
  assertThat(jdbc.queryForObject("select count(*) from hero_banner_upload",Integer.class)).isEqualTo(2);
  worker.fail(lease.jobId(),lease.token(),"invalid_image",false);media.cleanup();
  assertThat(jdbc.queryForList("select media_id from hero_banner_upload",UUID.class)).containsExactly(current);
  UUID valid=UUID.fromString(tree(upload(a,UUID.randomUUID(),image())).path("id").asString());media.cleanup();assertThat(jdbc.queryForList("select media_id from hero_banner_upload",UUID.class)).contains(current,valid);
  a.send("PUT","/api/v1/admin/hero-banners",json(Map.of("version",1,"banners",List.of())),true);media.cleanup();assertThat(jdbc.queryForList("select media_id from hero_banner_upload",UUID.class)).contains(current);
  jdbc.update("update hero_banner_upload set expires_at=now()-interval '1 minute' where media_id=?",current);media.cleanup();assertThat(jdbc.queryForList("select media_id from hero_banner_upload",UUID.class)).containsExactly(valid);
 }
 @Test void quotaAndExpiryDoNotChangePublicConfiguration()throws Exception{
  jdbc.update("insert into image_recipe values('hero-v1','fixture','{}') on conflict do nothing");var a=api();
  UUID id=UUID.fromString(tree(upload(a,UUID.randomUUID(),image())).path("id").asString());finish();
  jdbc.update("update hero_banner_upload set expires_at=now()-interval '1 minute' where media_id=?",id);
  assertThat(a.send("PUT","/api/v1/admin/hero-banners",json(Map.of("version",0,"banners",List.of(Map.of("id",id,"alt","Expired")))),true).statusCode()).isEqualTo(409);
  for(int i=0;i<30;i++)assertThat(upload(a,UUID.randomUUID(),image()).statusCode()).isEqualTo(202);
  assertThat(upload(a,UUID.randomUUID(),image()).statusCode()).isEqualTo(429);assertThat(jdbc.queryForObject("select count(*) from hero_banner_item",Integer.class)).isZero();
 }
 private void finish()throws Exception{
  var lease=worker.claim().orElseThrow();assertThat(lease.inputKey()).startsWith("banners/staging/");assertThat(lease.recipeVersion()).isEqualTo("hero-v1");
  String script="import {runJob} from './src/index.mjs'; const j=JSON.parse(process.argv[2]); await runJob({complete:async(_,m)=>process.stdout.write(JSON.stringify(m)),fail:async(_,c)=>{throw Error(c)}},process.argv[1],j);";
  var p=new ProcessBuilder("node","--input-type=module","-e",script,root.toRealPath().toString(),json(lease)).directory(Path.of("../image-worker").toFile()).redirectError(ProcessBuilder.Redirect.INHERIT).start();
  String output=new String(p.getInputStream().readAllBytes());assertThat(p.waitFor()).isZero();assertThat(output).isNotBlank();var manifest=JSON.readValue(output,ImageTypes.Manifest.class);worker.complete(lease.jobId(),lease.token(),manifest);
 }
}
