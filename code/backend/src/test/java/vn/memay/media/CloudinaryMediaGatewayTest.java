package vn.memay.media;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
class CloudinaryMediaGatewayTest {
 @Test void privateOptionsAndPreviewAreConsistent(){var options=CloudinaryMediaGateway.uploadOptions("memay/test/"+UUID.randomUUID());assertThat(options).containsEntry("resource_type","image").containsEntry("type","authenticated").containsEntry("overwrite",false);assertThat(options.get("eager").toString()).contains("c_limit","w_1280","w_320","w_640","f_webp","q_auto:good","a_auto","fl_strip_profile","f_jpg");}
 @Test void remoteAndOutOfNamespaceKeysAreRejected(){for(var id:List.of("https://example.com/x","memay/test/../foo","memay/production/x"))assertThatThrownBy(()->CloudinaryMediaGateway.validatePublicId(id,"memay/test")).isInstanceOf(IllegalArgumentException.class);}
 @Test void unavailableGatewayReturns503(){assertThatThrownBy(()->new UnconfiguredMediaGateway().upload("x",new byte[0])).isInstanceOfSatisfying(vn.memay.common.AdminApiException.class,e->assertThat(e.status).isEqualTo(503));}
 @Test void adapterSignsPrivateUploadsAndNeverReturnsCloudUrls()throws Exception{
  class Transport implements CloudinaryTransport {
   java.net.URI uri;Map<String,Object> params;String id;boolean opened;
   public Map<String,Object> post(java.net.URI uri,Map<String,Object> params,byte[] bytes){this.uri=uri;this.params=Map.copyOf(params);id=params.get("public_id").toString();if(uri.getPath().endsWith("destroy"))return Map.of("result","ok");return Map.of("public_id",id,"type","authenticated","asset_id","asset","format","png","bytes",42,"width",3,"height",2);}
   public java.io.InputStream open(java.net.URI uri){this.uri=uri;opened=true;return new java.io.ByteArrayInputStream(new byte[0]);}
  }
  var t=new Transport();String id="memay/test/"+UUID.randomUUID();var gateway=new CloudinaryMediaGateway("demo","key","secret","memay/test",t);
  var result=gateway.upload(id,new byte[]{1});assertThat(t.params).containsEntry("type","authenticated").containsEntry("overwrite",false).containsKeys("signature","timestamp","api_key");assertThat(t.params.get("eager").toString()).contains("w_640","q_auto:good","w_1280");assertThat(t.uri.getHost()).isEqualTo("api.cloudinary.com");assertThat(result.toString()).doesNotContain("https:","secret","signature");
  gateway.openPreview(id).close();assertThat(t.opened).isTrue();assertThat(t.uri.getHost()).isEqualTo("res.cloudinary.com");assertThat(t.uri.getPath()).contains("/image/authenticated/","/s--","a_auto","w_1280","strip_profile");
  gateway.openPublicPreview(id).close();assertThat(t.uri.getPath()).contains("/image/authenticated/","/s--","w_640","q_auto:good");
  gateway.delete(id);assertThat(t.params).containsEntry("invalidate","true").containsEntry("type","authenticated");
 }
 @Test void publicPreviewFallsBackToExistingVariantWhenNewOneIsMissing()throws Exception{
  class Transport implements CloudinaryTransport {
   final List<java.net.URI> opened=new ArrayList<>();
   public Map<String,Object> post(java.net.URI uri,Map<String,Object> params,byte[] bytes){throw new UnsupportedOperationException();}
   public java.io.InputStream open(java.net.URI uri)throws java.io.IOException {opened.add(uri);if(opened.size()==1)throw new CloudinaryTransport.MissingVariantException();return new java.io.ByteArrayInputStream(new byte[]{1});}
  }
  var t=new Transport();var gateway=new CloudinaryMediaGateway("demo","key","secret","memay/test",t);
  gateway.openPublicPreview("memay/test/"+UUID.randomUUID()).close();
  assertThat(t.opened).hasSize(2);assertThat(t.opened.get(0).getPath()).contains("w_640");assertThat(t.opened.get(1).getPath()).contains("w_1280");
 }
 @Test void providerFailureDoesNotTriggerSecondRequest(){
  class Transport implements CloudinaryTransport {
   int opens;
   public Map<String,Object> post(java.net.URI uri,Map<String,Object> params,byte[] bytes){throw new UnsupportedOperationException();}
   public java.io.InputStream open(java.net.URI uri)throws java.io.IOException {opens++;throw new java.io.IOException("network error");}
  }
  var t=new Transport();var gateway=new CloudinaryMediaGateway("demo","key","secret","memay/test",t);
  assertThatThrownBy(()->gateway.openPublicPreview("memay/test/"+UUID.randomUUID())).isInstanceOf(vn.memay.common.AdminApiException.class);
  assertThat(t.opens).isEqualTo(1);
 }
 @Test void deadlineCancelsActualRequestAndRedirectHostsAreRejected()throws Exception{
  try(var transport=new DeadlineCloudinaryTransport(tools.jackson.databind.json.JsonMapper.builder().build(),java.time.Duration.ofMillis(20))){
   var request=new org.apache.hc.client5.http.classic.methods.HttpPost("https://api.cloudinary.com/test");
   long start=System.nanoTime();boolean cancelled=transport.bounded(request,()->{while(!request.isCancelled()&&System.nanoTime()-start<java.time.Duration.ofSeconds(1).toNanos())Thread.sleep(2);return request.isCancelled();});assertThat(cancelled).isTrue();
   assertThatThrownBy(()->transport.open(java.net.URI.create("https://evil.example/x"))).isInstanceOf(IllegalArgumentException.class);
   assertThatThrownBy(()->transport.post(java.net.URI.create("http://api.cloudinary.com/x"),Map.of(),null)).isInstanceOf(IllegalArgumentException.class);
  }
 }
}
