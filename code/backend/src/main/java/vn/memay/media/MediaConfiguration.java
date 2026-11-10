package vn.memay.media;

import org.springframework.context.annotation.*;
import org.springframework.core.env.Environment;
import tools.jackson.databind.ObjectMapper;

@Configuration
public class MediaConfiguration {
    @Configuration
    @org.springframework.scheduling.annotation.EnableScheduling
    @org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(
            name = "memay.media.recovery.mode", havingValue = "active", matchIfMissing = true)
    static class ActiveScheduling {}

    @Bean
    @org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(
            prefix = "memay.media.local", name = "enabled", havingValue = "true")
    LocalImageStore localImageStore(Environment env) {
        return new LocalImageStore(java.nio.file.Path.of(env.getRequiredProperty("memay.media.local.root")));
    }

    @Bean
    @org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(
            prefix = "memay.media.local", name = "enabled", havingValue = "true")
    @org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(
            name = "memay.media.recovery.mode", havingValue = "active", matchIfMissing = true)
    LocalMediaGateway localMediaGateway(Environment env, LocalImageStore store, DeadlineCloudinaryTransport transport) {
        return new LocalMediaGateway(env.getRequiredProperty("memay.media.local.nginx-origin"), store, transport);
    }

    @Bean
    @org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(
            prefix = "memay.media.local", name = "enabled", havingValue = "true")
    vn.memay.media.source.DriveSourceClient driveSourceClient(
            Environment env, ObjectMapper json, LocalImageStore store, MediaRecoveryMode mode) {
        if (mode.isolated()) return (file, id) -> {
            throw new vn.memay.media.source.SourceAccessException("RESTORE_ISOLATED", false, 409);
        };
        return vn.memay.media.source.GoogleDriveSourceClient.create(
                env.getProperty("MEMAY_DRIVE_CREDENTIALS_FILE", ""), json, store);
    }

    @Bean(destroyMethod = "close")
    DeadlineCloudinaryTransport cloudinaryTransport(ObjectMapper json) {
        return new DeadlineCloudinaryTransport(json);
    }

    @Bean
    MediaGateway mediaGateway(Environment env, DeadlineCloudinaryTransport transport, MediaRecoveryMode mode) {
        if (mode.isolated()) return new UnconfiguredMediaGateway();
        String name = env.getProperty("CLOUDINARY_CLOUD_NAME", ""), key = env.getProperty("CLOUDINARY_API_KEY", ""),
                secret = env.getProperty("CLOUDINARY_API_SECRET", "");
        if (name.isBlank() || key.isBlank() || secret.isBlank())
            return new UnconfiguredMediaGateway();
        return new CloudinaryMediaGateway(name, key, secret, env.getProperty("memay.media.namespace", "memay/dev"),
                transport);
    }
}
