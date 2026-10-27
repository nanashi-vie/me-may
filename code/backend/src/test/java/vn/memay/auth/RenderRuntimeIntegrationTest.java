package vn.memay.auth;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
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
        vn.memay.support.PgTestData.clean(vn.memay.support.PgTestData.jdbc());
        props.add("spring.datasource.url", () -> vn.memay.support.PgTestData.requireTestJdbcUrl(System.getenv("TEST_DB_URL")));
        props.add("spring.flyway.url", () -> vn.memay.support.PgTestData.requireTestJdbcUrl(System.getenv("TEST_DB_URL")));
    }
    @Value("${local.server.port}") int port;
    @Autowired AdminUserRepository users;
    @Autowired org.springframework.jdbc.core.JdbcTemplate jdbc;
    @Test void ignoresLegacyBootstrapFlagsAndKeepsSecureCsrfSession() throws Exception {
        assertThat(users.count()).isZero();
        try(var connection=jdbc.getDataSource().getConnection()) {
            assertThat(OwnerAccountCommand.provision(connection,"fixed-render-owner@test.local","fixed-render-password-123")).isEqualTo("created");
        }
        var response = HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/v1/auth/csrf")).GET().build(),HttpResponse.BodyHandlers.ofString());
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.headers().firstValue("set-cookie").orElseThrow()).contains("Secure","HttpOnly","SameSite=Lax","Path=/api");
        assertThat(response.headers().firstValue("cache-control").orElseThrow()).contains("no-store");
        String token=com.jayway.jsonpath.JsonPath.read(response.body(),"$.token");
        var login=HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/v1/auth/login"))
                .header("Cookie",response.headers().firstValue("set-cookie").orElseThrow().split(";",2)[0])
                .header("X-CSRF-TOKEN",token).header("Content-Type","application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString("username=fixed-render-owner%40test.local&password=fixed-render-password-123")).build(),HttpResponse.BodyHandlers.ofString());
        assertThat(login.statusCode()).isEqualTo(200);
        assertThat((String)com.jayway.jsonpath.JsonPath.read(login.body(),"$.role")).isEqualTo("OWNER");
    }
}
