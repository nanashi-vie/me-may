package vn.memay.media;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalManagementPort;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import vn.memay.support.PgTestData;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.profiles.active=test", "management.server.port=0",
        "management.endpoints.web.exposure.include=health,imagejobs",
        "memay.media.local.enabled=true", "memay.media.local.worker-token=fixture-worker-token"
})
class ImageWorkerSecurityTest {
    @DynamicPropertySource static void db(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> PgTestData.requireTestJdbcUrl(System.getenv("TEST_DB_URL")));
    }

    @LocalServerPort int appPort;
    @LocalManagementPort int managementPort;

    @Test void workerCredentialOnlyWorksOnManagementListener() throws Exception {
        assertThat(send(appPort, "/actuator/imagejobs", "fixture-worker-token")).isEqualTo(404);
        assertThat(send(managementPort, "/actuator/imagejobs", null)).isEqualTo(401);
        assertThat(send(managementPort, "/actuator/imagejobs", "wrong")).isEqualTo(401);
        assertThat(send(managementPort, "/actuator/imagejobs", "fixture-worker-token")).isEqualTo(204);
        assertThat(send(appPort, "/api/v1/admin/books", "fixture-worker-token")).isEqualTo(403);
        var health = HttpClient.newHttpClient().send(HttpRequest.newBuilder(
                URI.create("http://127.0.0.1:" + appPort + "/actuator/health")).GET().build(),
                HttpResponse.BodyHandlers.discarding());
        assertThat(health.statusCode()).isEqualTo(200);
    }

    private int send(int port, String path, String token) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString("{\"command\":\"CLAIM\"}"));
        if (token != null) request.header("Authorization", "Bearer " + token);
        return HttpClient.newHttpClient().send(request.build(), HttpResponse.BodyHandlers.discarding()).statusCode();
    }
}
