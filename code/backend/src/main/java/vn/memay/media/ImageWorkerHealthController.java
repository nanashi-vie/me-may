package vn.memay.media;

import java.util.Map;
import org.springframework.boot.actuate.autoconfigure.web.server.ConditionalOnManagementPort;
import org.springframework.boot.actuate.autoconfigure.web.server.ManagementPortType;
import org.springframework.boot.health.actuate.endpoint.HealthEndpoint;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@ConditionalOnManagementPort(ManagementPortType.DIFFERENT)
public class ImageWorkerHealthController {
    private final HealthEndpoint health;

    public ImageWorkerHealthController(HealthEndpoint health) {
        this.health = health;
    }

    @GetMapping("/actuator/health")
    public ResponseEntity<Map<String, String>> health() {
        String status = health.health().getStatus().getCode();
        return ResponseEntity.status("DOWN".equals(status) || "OUT_OF_SERVICE".equals(status) ? 503 : 200)
                .body(Map.of("status", status));
    }
}
