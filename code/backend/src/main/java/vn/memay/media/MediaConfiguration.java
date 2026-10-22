package vn.memay.media;
import org.springframework.context.annotation.*;
import org.springframework.core.env.Environment;
import tools.jackson.databind.ObjectMapper;
@Configuration
public class MediaConfiguration {
 @Bean(destroyMethod="close") DeadlineCloudinaryTransport cloudinaryTransport(ObjectMapper json){return new DeadlineCloudinaryTransport(json);}
 @Bean MediaGateway mediaGateway(Environment env,DeadlineCloudinaryTransport transport){
  String name=env.getProperty("CLOUDINARY_CLOUD_NAME",""),key=env.getProperty("CLOUDINARY_API_KEY",""),secret=env.getProperty("CLOUDINARY_API_SECRET","");
  if(name.isBlank()||key.isBlank()||secret.isBlank())return new UnconfiguredMediaGateway();return new CloudinaryMediaGateway(name,key,secret,env.getProperty("memay.media.namespace","memay/dev"),transport);
 }
}
