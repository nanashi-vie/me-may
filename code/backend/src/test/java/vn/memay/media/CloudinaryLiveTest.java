package vn.memay.media;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import tools.jackson.databind.json.JsonMapper;
import vn.memay.support.PgTestData;
import java.net.*;
import java.net.http.*;
import java.time.Duration;
import java.util.UUID;
import javax.imageio.ImageIO;
import java.io.ByteArrayInputStream;
import static org.assertj.core.api.Assertions.*;
@EnabledIfEnvironmentVariable(named="MEMAY_LIVE_MEDIA_TEST",matches="true")
class CloudinaryLiveTest {
 @Test void authenticatedUploadPreviewPrivacyAndDelete()throws Exception{
  PgTestData.requireTestJdbcUrl(System.getenv("TEST_DB_URL"));assertThat(System.getenv("CLOUDINARY_NAMESPACE")).isEqualTo("memay/test");
  String cloud=System.getenv("CLOUDINARY_CLOUD_NAME"),key=System.getenv("CLOUDINARY_API_KEY"),secret=System.getenv("CLOUDINARY_API_SECRET");assertThat(cloud!=null&&key!=null&&secret!=null).isTrue();
  String id="memay/test/"+UUID.randomUUID();
  try(var transport=new DeadlineCloudinaryTransport(JsonMapper.builder().build())){
   var gateway=new CloudinaryMediaGateway(cloud,key,secret,"memay/test",transport);
   try{
    var uploaded=gateway.upload(id,ImageValidatorTest.image("png"));assertThat(uploaded.publicId()).isEqualTo(id);
    try(var input=gateway.openPreview(id)){byte[] bytes=input.readAllBytes();assertThat(bytes.length).isPositive();var image=ImageIO.read(new ByteArrayInputStream(bytes));assertThat(image).isNotNull();assertThat(image.getWidth()).isLessThanOrEqualTo(1280);}
    try(var http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).followRedirects(HttpClient.Redirect.NEVER).build()){
     for(String path:new String[]{id+".png",CloudinaryMediaGateway.PREVIEW+"/"+id+".jpg"}){
      int status=http.send(HttpRequest.newBuilder(URI.create("https://res.cloudinary.com/"+cloud+"/image/authenticated/"+path)).timeout(Duration.ofSeconds(20)).GET().build(),HttpResponse.BodyHandlers.discarding()).statusCode();assertThat(status).isIn(401,403,404);
     }
    }
   }finally{gateway.delete(id);}
   assertThat(gateway.delete(id)).isEqualTo(MediaGateway.DeleteResult.NOT_FOUND);
  }
 }
}
