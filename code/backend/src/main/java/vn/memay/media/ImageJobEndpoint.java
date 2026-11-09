package vn.memay.media;

import java.util.Map;
import java.util.UUID;
import org.jspecify.annotations.Nullable;
import org.springframework.boot.actuate.endpoint.annotation.WriteOperation;
import org.springframework.boot.actuate.endpoint.web.WebEndpointResponse;
import org.springframework.boot.actuate.endpoint.web.annotation.WebEndpoint;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;
import vn.memay.common.AdminApiException;
import vn.memay.media.ImageTypes.Manifest;

@Component
@WebEndpoint(id = "imagejobs")
@ConditionalOnProperty(prefix = "memay.media.local", name = "enabled", havingValue = "true")
public class ImageJobEndpoint {
    private final ImageJobService jobs;
    private final ObjectMapper json;

    public ImageJobEndpoint(ImageJobService jobs, ObjectMapper json) {
        this.jobs = jobs;
        this.json = json;
    }

    @WriteOperation
    public WebEndpointResponse<Object> execute(String command, @Nullable UUID jobId, @Nullable UUID token,
            @Nullable String manifest, @Nullable String code, @Nullable Boolean retryable) {
        try {
            if ("CLAIM".equals(command)) {
                return jobs.claim().<WebEndpointResponse<Object>>map(job -> new WebEndpointResponse<>(job, 200))
                        .orElseGet(() -> new WebEndpointResponse<>(204));
            }
            if (jobId == null || token == null) return error(400, "missing_image_lease");
            return switch (command) {
                case "HEARTBEAT" -> new WebEndpointResponse<>(Map.of("expiresAt", jobs.heartbeat(jobId, token)), 200);
                case "COMPLETE" -> {
                    if (manifest == null || manifest.length() > 32_768) yield error(400, "invalid_image_manifest");
                    Manifest result = json.readValue(manifest, Manifest.class);
                    if (result == null) yield error(400, "invalid_image_manifest");
                    jobs.complete(jobId, token, result);
                    yield new WebEndpointResponse<>(204);
                }
                case "FAIL" -> {
                    jobs.fail(jobId, token, code, Boolean.TRUE.equals(retryable));
                    yield new WebEndpointResponse<>(204);
                }
                default -> error(400, "unknown_image_command");
            };
        } catch (AdminApiException e) {
            return error(e.status, e.error);
        } catch (tools.jackson.core.JacksonException e) {
            return error(400, "invalid_image_manifest");
        }
    }

    private static WebEndpointResponse<Object> error(int status, String code) {
        return new WebEndpointResponse<>(Map.of("error", code), status);
    }
}
