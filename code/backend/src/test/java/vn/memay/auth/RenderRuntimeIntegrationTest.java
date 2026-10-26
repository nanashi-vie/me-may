package vn.memay.auth;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.net.URI;
import java.net.http.*;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.profiles.active=render", "spring.datasource.url=${TEST_DB_URL}",
    "spring.datasource.username=${DB_USER}", "spring.datasource.password=${DB_PASSWORD}",
    "spring.flyway.url=${TEST_DB_URL}", "spring.flyway.user=${DB_USER}", "spring.flyway.password=${DB_PASSWORD}",
    "memay.bootstrap.enabled=true", "memay.bootstrap.email=render-owner@test.local",
    "memay.bootstrap.password=render-test-password-123"
})
class RenderRuntimeIntegrationTest {
    @org.springframework.test.context.DynamicPropertySource
    static void testDatabase(org.springframework.test.context.DynamicPropertyRegistry props) {
        props.add("spring.datasource.url", () -> vn.memay.support.PgTestData.requireTestJdbcUrl(System.getenv("TEST_DB_URL")));
        props.add("spring.flyway.url", () -> vn.memay.support.PgTestData.requireTestJdbcUrl(System.getenv("TEST_DB_URL")));
    }
    @Value("${local.server.port}") int port;
    @Autowired AdminUserRepository users;
    @Autowired PasswordEncoder encoder;
    @Test void bootstrapsOwnerOptInAndKeepsSecureCsrfSession() throws Exception {
        var owner = users.findByEmail("render-owner@test.local").orElseThrow();
        assertThat(owner.getRole()).isEqualTo(AdminUser.Role.OWNER);
        assertThat(encoder.matches("render-test-password-123",owner.getPasswordHash())).isTrue();
        var response = HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/v1/auth/csrf")).GET().build(),HttpResponse.BodyHandlers.ofString());
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.headers().firstValue("set-cookie").orElseThrow()).contains("Secure","HttpOnly","SameSite=Lax","Path=/api");
        assertThat(response.headers().firstValue("cache-control").orElseThrow()).contains("no-store");
    }
}
