package vn.memay.media;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Value;
import vn.memay.support.*;
import java.util.*;
import static vn.memay.support.AdminHttpClient.*;
import static org.assertj.core.api.Assertions.*;
class UploadSessionIntegrationTest extends MediaTestSupport {
 @Value("${local.server.port}") int port;
 @Test void failedReplacementKeepsReadyImageAndCleanupRetries()throws Exception {
  var api=new AdminHttpClient(port);api.login("owner@catalogue.test");String id=tree(api.send("POST","/api/v1/admin/upload-sessions","{}",true)).path("id").asString(),base="/api/v1/admin/upload-sessions/"+id;
  var first=api.upload(base+"/media",0,ImageValidatorTest.image("png"),true);assertThat(first.statusCode()).isEqualTo(201);String media=tree(first).path("id").asString();
  fake.failUpload=true;assertThat(api.upload(base+"/media?replaceId="+media,0,ImageValidatorTest.image("png"),true).statusCode()).isEqualTo(502);fake.failUpload=false;
  assertThat(api.download(base+"/media/"+media).statusCode()).isEqualTo(200);
  api.send("DELETE",base,null,true);fake.failDelete=true;cleanup.runOnce();assertThat(fake.assets).isNotEmpty();fake.failDelete=false;cleanup.runOnce();assertThat(fake.assets).isEmpty();
 }
 @Test void expiryAfterProviderReturnsCannotLeaveReadyMedia()throws Exception {
  var api=new AdminHttpClient(port);api.login("owner@catalogue.test");String id=tree(api.send("POST","/api/v1/admin/upload-sessions","{}",true)).path("id").asString(),base="/api/v1/admin/upload-sessions/"+id;
  fake.entered=new java.util.concurrent.CountDownLatch(1);fake.release=new java.util.concurrent.CountDownLatch(1);
  var pending=java.util.concurrent.CompletableFuture.supplyAsync(()->{try{return api.upload(base+"/media",0,ImageValidatorTest.image("png"),true);}catch(Exception e){throw new RuntimeException(e);}});
  assertThat(fake.entered.await(3,java.util.concurrent.TimeUnit.SECONDS)).isTrue();
  jdbc.update("update upload_session set created_at=current_timestamp-interval '2 days',expires_at=current_timestamp-interval '1 second' where id=?",UUID.fromString(id));fake.release.countDown();assertThat(pending.get().statusCode()).isEqualTo(410);
  assertThat(jdbc.queryForObject("select count(*) from temporary_media where state='READY'",Integer.class)).isZero();
  jdbc.update("update temporary_media set delete_after=current_timestamp-interval '1 second'");cleanup.runOnce();assertThat(fake.assets).isEmpty();
 }
}
