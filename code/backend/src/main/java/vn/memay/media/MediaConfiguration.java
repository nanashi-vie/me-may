package vn.memay.media;

import org.springframework.context.annotation.*;
import org.springframework.core.env.Environment;
import tools.jackson.databind.ObjectMapper;

@Configuration
@org.springframework.scheduling.annotation.EnableScheduling
public class MediaConfiguration {
    @Bean
    @org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(
            prefix = "memay.media.local", name = "enabled", havingValue = "true")
    LocalImageStore localImageStore(Environment env) {
        return new LocalImageStore(java.nio.file.Path.of(env.getRequiredProperty("memay.media.local.root")));
    }

    @Bean(destroyMethod = "close")
    DeadlineCloudinaryTransport cloudinaryTransport(ObjectMapper json) {
        return new DeadlineCloudinaryTransport(json);
    }

    @Bean
    MediaGateway mediaGateway(Environment env, DeadlineCloudinaryTransport transport) {
        String name = env.getProperty("CLOUDINARY_CLOUD_NAME", ""), key = env.getProperty("CLOUDINARY_API_KEY", ""),
                secret = env.getProperty("CLOUDINARY_API_SECRET", "");
        if (name.isBlank() || key.isBlank() || secret.isBlank())
            return new UnconfiguredMediaGateway();
        return new CloudinaryMediaGateway(name, key, secret, env.getProperty("memay.media.namespace", "memay/dev"),
                transport);
    }
}
