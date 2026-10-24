package vn.memay.auth;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import jakarta.servlet.Filter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.profiles.active=test", "spring.datasource.url=${TEST_DB_URL}",
        "memay.bootstrap.enabled=false", "server.servlet.session.cookie.secure=false"
})
@Import(AuthIntegrationTest.ShortSessionConfig.class)
class AuthIntegrationTest {
    @org.springframework.test.context.DynamicPropertySource
    static void testDatabase(org.springframework.test.context.DynamicPropertyRegistry props) {
        props.add("spring.datasource.url", () -> vn.memay.support.PgTestData.requireTestJdbcUrl(System.getenv("TEST_DB_URL")));
    }

    @Value("${local.server.port}") int port;
    @Autowired JdbcTemplate jdbc;
    private HttpClient client;

    @BeforeEach
    void setup() {
        assertThat(jdbc.queryForObject("SELECT current_database()", String.class)).isEqualTo("me_may_test");
        vn.memay.support.PgTestData.clean(jdbc);
        var hash = new BCryptPasswordEncoder().encode("test-password-123");
        jdbc.update("INSERT INTO admin_user(email,password_hash,role,active) VALUES (?,?,?,?)", "owner@test.local", hash, "OWNER", true);
        jdbc.update("INSERT INTO admin_user(email,password_hash,role,active) VALUES (?,?,?,?)", "staff@test.local", hash, "STAFF", true);
        jdbc.update("INSERT INTO admin_user(email,password_hash,role,active) VALUES (?,?,?,?)", "inactive@test.local", hash, "STAFF", false);
        client = HttpClient.newBuilder().cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL)).build();
    }

    private HttpResponse<String> request(String method, String path, String body, String token) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path));
        if (token != null) builder.header("X-CSRF-TOKEN", token);
        if (body != null) builder.header("Content-Type", "application/x-www-form-urlencoded");
        builder.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));
        return client.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }

    private String csrf() throws Exception {
        var response = request("GET", "/api/v1/auth/csrf", null, null);
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.headers().firstValue("cache-control").orElse("")).contains("no-store");
        return JsonPath.read(response.body(), "$.token");
    }

    private HttpResponse<String> login(String email) throws Exception {
        return request("POST", "/api/v1/auth/login", "username=" + email + "&password=test-password-123", csrf());
    }

    @Test void anonymousMeReturnsJson401WithoutRedirect() throws Exception {
        var response = request("GET", "/api/v1/auth/me", null, null);
        assertThat(response.statusCode()).isEqualTo(401);
        assertThat(response.headers().firstValue("content-type").orElse("")).contains("application/json");
        assertThat(response.headers().firstValue("location")).isEmpty();
    }

    @Test void loginRequiresCsrf() throws Exception {
        assertThat(request("POST", "/api/v1/auth/login", "username=owner@test.local&password=test-password-123", null).statusCode()).isEqualTo(403);
    }

    @Test void ownerSessionSurvivesAcrossRequestsAndCookieIsHttpOnly() throws Exception {
        var response = login("owner@test.local");
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(JsonPath.<String>read(response.body(), "$.role")).isEqualTo("OWNER");
        assertThat(response.body()).doesNotContain("password", "hash");
        assertThat(response.headers().allValues("set-cookie").toString()).contains("HttpOnly");
        assertThat(request("GET", "/api/v1/auth/me", null, null).body()).contains("owner@test.local");
        assertThat(request("GET", "/api/v1/admin/owner-access", null, null).statusCode()).isEqualTo(200);
    }

    @Test void staffCanEnterAdminButCannotUseOwnerEndpoint() throws Exception {
        assertThat(login("staff@test.local").statusCode()).isEqualTo(200);
        assertThat(request("GET", "/api/v1/admin/access", null, null).statusCode()).isEqualTo(200);
        assertThat(request("GET", "/api/v1/admin/owner-access", null, null).statusCode()).isEqualTo(403);
    }

    @Test void wrongPasswordAndInactiveAccountDoNotCreateAuthenticatedSession() throws Exception {
        var wrong = request("POST", "/api/v1/auth/login", "username=owner@test.local&password=wrong", csrf());
        assertThat(wrong.statusCode()).isEqualTo(401);
        assertThat(login("inactive@test.local").statusCode()).isEqualTo(401);
        assertThat(request("GET", "/api/v1/auth/me", null, null).statusCode()).isEqualTo(401);
    }

    @Test void logoutNeedsFreshCsrfAndInvalidatesSession() throws Exception {
        var oldToken = csrf();
        assertThat(request("POST", "/api/v1/auth/login", "username=owner@test.local&password=test-password-123", oldToken).statusCode()).isEqualTo(200);
        assertThat(request("POST", "/api/v1/auth/logout", null, oldToken).statusCode()).isEqualTo(403);
        assertThat(request("POST", "/api/v1/auth/logout", null, csrf()).statusCode()).isEqualTo(204);
        assertThat(request("GET", "/api/v1/auth/me", null, null).statusCode()).isEqualTo(401);
    }

    @Test void healthIsPublicButActuatorEnvironmentIsNot() throws Exception {
        assertThat(request("GET", "/actuator/health", null, null).statusCode()).isEqualTo(200);
        assertThat(request("GET", "/actuator/env", null, null).statusCode()).isEqualTo(401);
    }

    @Test void unknownApiDoesNotRedirectToLoginPage() throws Exception {
        assertThat(login("owner@test.local").statusCode()).isEqualTo(200);
        assertThat(request("GET", "/api/v1/missing", null, null).statusCode()).isEqualTo(404);
    }

    @Test void expiredSessionIsRejected() throws Exception {
        assertThat(login("owner@test.local").statusCode()).isEqualTo(200);
        var touch = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/v1/auth/me"))
                .header("X-Test-Short-Session", "true").GET().build();
        assertThat(client.send(touch, HttpResponse.BodyHandlers.ofString()).statusCode()).isEqualTo(200);
        Thread.sleep(2100);
        assertThat(request("GET", "/api/v1/auth/me", null, null).statusCode()).isEqualTo(401);
    }

    @Test void loginRotatesTheSessionAndOldCookieCannotEnterAdmin() throws Exception {
        var token = csrf();
        var cookies = (CookieManager) client.cookieHandler().orElseThrow();
        var oldSession = cookies.getCookieStore().getCookies().stream().filter(c -> c.getName().equals("MEMAYSESSION")).findFirst().orElseThrow().getValue();
        assertThat(request("POST", "/api/v1/auth/login", "username=owner@test.local&password=test-password-123", token).statusCode()).isEqualTo(200);
        var newSession = cookies.getCookieStore().getCookies().stream().filter(c -> c.getName().equals("MEMAYSESSION")).findFirst().orElseThrow().getValue();
        assertThat(newSession).isNotEqualTo(oldSession);
        var oldRequest = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/v1/admin/access"))
                .header("Cookie", "MEMAYSESSION=" + oldSession).GET().build();
        assertThat(HttpClient.newHttpClient().send(oldRequest, HttpResponse.BodyHandlers.ofString()).statusCode()).isEqualTo(401);
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class ShortSessionConfig {
        @Bean Filter shortenSessionForExpiryTest() {
            return (request, response, chain) -> {
                var httpRequest = (HttpServletRequest) request;
                if ("true".equals(httpRequest.getHeader("X-Test-Short-Session")) && httpRequest.getSession(false) != null) {
                    httpRequest.getSession(false).setMaxInactiveInterval(1);
                }
                chain.doFilter(request, response);
            };
        }
    }
}
