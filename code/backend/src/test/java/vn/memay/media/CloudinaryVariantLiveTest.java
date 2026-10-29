package vn.memay.media;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import java.nio.charset.StandardCharsets;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

@EnabledIfEnvironmentVariable(named="MEMAY_LIVE_VARIANTS_TEST",matches="true")
class CloudinaryVariantLiveTest {
 @Test void eagerFormatsAreReadableAndCleanedWithoutDatabaseWrites() throws Exception {
  try(var transport=new DeadlineCloudinaryTransport(tools.jackson.databind.json.JsonMapper.builder().build())) {
   var gateway=new CloudinaryMediaGateway(System.getenv("CLOUDINARY_CLOUD_NAME"),System.getenv("CLOUDINARY_API_KEY"),System.getenv("CLOUDINARY_API_SECRET"),"memay/test",transport);
   var id="memay/test/"+UUID.randomUUID();
   try {
    gateway.upload(id,ImageValidatorTest.image("jpeg"));
    for(int width:List.of(320,640))for(String format:List.of("jpg","webp")) {
     try(var input=gateway.openPublicPreview(id,width,format)) {
      byte[] bytes=input.readAllBytes();assertThat(bytes.length).isGreaterThan(12);
      if(format.equals("webp")) {
       assertThat(new String(bytes,0,4,StandardCharsets.US_ASCII)).isEqualTo("RIFF");
       assertThat(new String(bytes,8,4,StandardCharsets.US_ASCII)).isEqualTo("WEBP");
      } else assertThat(bytes).startsWith((byte)255,(byte)216);
     }
    }
   } finally { gateway.delete(id); assertThat(gateway.delete(id)).isEqualTo(MediaGateway.DeleteResult.NOT_FOUND); }
  }
 }
}
