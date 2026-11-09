package vn.memay.attendance;

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

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.profiles.active=test", "spring.datasource.url=${TEST_DB_URL}",
        "server.servlet.session.cookie.secure=false"
})
class AttendanceIntegrationTest {
    @org.springframework.test.context.DynamicPropertySource
    static void testDatabase(org.springframework.test.context.DynamicPropertyRegistry props) {
        props.add("spring.datasource.url", () -> vn.memay.support.PgTestData.requireTestJdbcUrl(System.getenv("TEST_DB_URL")));
    }

    @Value("${local.server.port}") int port;
    @Autowired JdbcTemplate jdbc;
    private HttpClient client;

    private static final java.time.Instant OPENING = java.time.Instant.parse("2026-11-09T01:30:00Z");
    private static final java.util.concurrent.atomic.AtomicReference<java.time.Instant> NOW = new java.util.concurrent.atomic.AtomicReference<>(OPENING);

    @org.springframework.boot.test.context.TestConfiguration
    static class FixedTime {
        @org.springframework.context.annotation.Bean @org.springframework.context.annotation.Primary
        java.time.Clock attendanceTestClock() {
            return new java.time.Clock() {
                @Override public java.time.ZoneId getZone() { return java.time.ZoneOffset.UTC; }
                @Override public java.time.Clock withZone(java.time.ZoneId zone) { return java.time.Clock.fixed(instant(), zone); }
                @Override public java.time.Instant instant() { return NOW.get(); }
            };
        }
    }

    @BeforeEach
    void setup() {
        assertThat(jdbc.queryForObject("SELECT current_database()", String.class)).isEqualTo("me_may_test");
        NOW.set(OPENING);
        for (String table : new String[]{"attendance_audit_log", "attendance_session", "employee_weekly_schedule",
                "attendance_week", "employee_pin_credential", "employee_profile"}) {
            if (Boolean.TRUE.equals(jdbc.queryForObject("select to_regclass(?) is not null", Boolean.class, table))) {
                jdbc.execute("delete from " + table);
            }
        }
        vn.memay.support.PgTestData.clean(jdbc);
        var hash = new BCryptPasswordEncoder().encode("test-password-123");
        jdbc.update("INSERT INTO admin_user(email,password_hash,role,active) VALUES (?,?,?,?)", "owner@test.local", hash, "OWNER", true);
        jdbc.update("INSERT INTO admin_user(email,password_hash,role,active) VALUES (?,?,?,?)", "staff@test.local", hash, "STAFF", true);
        jdbc.update("INSERT INTO admin_user(email,password_hash,role,active) VALUES (?,?,?,?)", "inactive@test.local", hash, "STAFF", false);
        client = HttpClient.newBuilder().cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL)).build();
    }

    private HttpResponse<String> request(String method, String path, String body, String token) throws Exception {
        return request(client, method, path, body, token);
    }

    private HttpResponse<String> request(HttpClient client, String method, String path, String body, String token) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path));
        if (token != null) builder.header("X-CSRF-TOKEN", token);
        if (body != null) builder.header("Content-Type", path.endsWith("/login") ? "application/x-www-form-urlencoded" : "application/json");
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

    private HttpResponse<String> api(String method, String path, String body) throws Exception {
        return request(method, "/api/v1/admin/attendance" + path, body, method.equals("GET") ? null : csrf());
    }

    @Test void staffCannotReadEmployeeData() throws Exception {
        assertThat(login("staff@test.local").statusCode()).isEqualTo(200);
        assertThat(api("GET", "/employees", null).statusCode()).isEqualTo(403);
    }

    @Test void ownerCreatesEmployeeWithoutExposingPinAndCannotEditPastWeek() throws Exception {
        assertThat(login("owner@test.local").statusCode()).isEqualTo(200);
        var result = api("POST", "/employees", """
                {"fullName":"Nguyễn An","pin":"012345"}
                """);
        assertThat(result.statusCode()).isEqualTo(201);
        assertThat(result.body()).contains("EMP-").doesNotContain("012345", "pinHash");
        String hash = jdbc.queryForObject("select pin_hash from employee_pin_credential", String.class);
        assertThat(new BCryptPasswordEncoder().matches("012345", hash)).isTrue();
        assertThat(api("PUT", "/weeks/2020-01-06", """
                {"version":0,"rows":[]}
                """).statusCode()).isEqualTo(409);
    }

    private int employee() throws Exception {
        assertThat(login("owner@test.local").statusCode()).isEqualTo(200);
        var response = api("POST", "/employees", """
                {"fullName":"Nguyễn An","displayName":"An","pin":"012345"}
                """);
        assertThat(response.statusCode()).isEqualTo(201);
        return JsonPath.read(response.body(), "$.id");
    }

    private HttpResponse<String> verify(int id, String pin) throws Exception {
        return api("POST", "/punch/verify", """
                {"employeeId":%d,"pin":"%s"}
                """.formatted(id, pin));
    }

    private HttpResponse<String> punch(String token, String action, boolean acknowledged) throws Exception {
        return api("POST", "/punch", punchBody(token, action, acknowledged));
    }

    private String punchBody(String token, String action, boolean acknowledged) {
        return """
                {"token":"%s","action":"%s","acknowledgedOutsideSchedule":%s}
                """.formatted(token, action, acknowledged);
    }

    @Test void shiftUsesActualTimeAndNeedsReviewFrom2030UntilClosed() throws Exception {
        int id = employee();
        String start = JsonPath.read(verify(id, "012345").body(), "$.token");
        assertThat(punch(start, "START", false).statusCode()).isEqualTo(409);
        assertThat(punch(start, "START", true).statusCode()).isEqualTo(200);
        assertThat(punch(start, "START", true).statusCode()).isEqualTo(200);
        assertThat(jdbc.queryForObject("select count(*) from attendance_session where employee_id=?", Integer.class, id))
                .isEqualTo(1);

        NOW.set(java.time.Instant.parse("2026-11-09T13:29:59Z"));
        assertThat(JsonPath.<String>read(verify(id, "012345").body(), "$.status")).isEqualTo("WORKING");
        NOW.set(java.time.Instant.parse("2026-11-09T13:30:00Z"));
        var late = verify(id, "012345");
        assertThat(JsonPath.<String>read(late.body(), "$.status")).isEqualTo("NEEDS_REVIEW");
        NOW.set(NOW.get().plusSeconds(15));
        assertThat(punch(JsonPath.read(late.body(), "$.token"), "END", true).body())
                .contains("COMPLETED");
        assertThat(jdbc.queryForObject("select original_ended_at from attendance_session where employee_id=?",
                java.sql.Timestamp.class, id).toInstant()).isEqualTo(NOW.get());
        assertThat(request("GET", "/api/v1/auth/me", null, null).statusCode()).isEqualTo(200);
    }

    @Test void pinVerificationExpiresAndWrongAttemptsAreLimited() throws Exception {
        int id = employee();
        var valid = verify(id, "012345");
        NOW.set(NOW.get().plusSeconds(30));
        assertThat(punch(JsonPath.read(valid.body(), "$.token"), "START", true).statusCode()).isEqualTo(403);
        for (int i = 0; i < 4; i++) assertThat(verify(id, "999999").statusCode()).isEqualTo(422);
        assertThat(verify(id, "999999").statusCode()).isEqualTo(429);
        assertThat(verify(id, "012345").statusCode()).isEqualTo(429);
    }

    @Test void reportAndExcelUseActualShiftsAndAuditPreservesOriginalTimes() throws Exception {
        int id = employee();
        String monday = "/weeks/2026-11-09";
        String schedule = """
                {"version":0,"rows":[{"employeeId":%d,"days":[true,false,false,false,false,false,false]}]}
                """.formatted(id);
        assertThat(api("PUT", monday, schedule).statusCode()).isEqualTo(200);
        assertThat(api("PUT", monday, schedule).statusCode()).isEqualTo(409);
        assertThat(api("PUT", monday, schedule.replace("\"version\":0", "\"version\":1")
                .replace("\"employeeId\":" + id, "\"employeeId\":999999")).statusCode()).isEqualTo(400);
        assertThat(api("PUT", monday, """
                {"version":1,"rows":[
                  {"employeeId":%d,"days":[false,true,false,false,false,false,false]},
                  {"employeeId":999999,"days":[true,false,false,false,false,false,false]}
                ]}
                """.formatted(id)).statusCode()).isEqualTo(400);
        var weekAfterFailure = api("GET", monday, null).body();
        assertThat(JsonPath.<Integer>read(weekAfterFailure, "$.version")).isEqualTo(1);
        assertThat(JsonPath.<java.util.List<Boolean>>read(weekAfterFailure, "$.rows[0].days"))
                .containsExactly(true, false, false, false, false, false, false);

        assertThat(punch(JsonPath.read(verify(id, "012345").body(), "$.token"), "END", false).statusCode()).isEqualTo(409);
        assertThat(punch(JsonPath.read(verify(id, "012345").body(), "$.token"), "START", false).statusCode()).isEqualTo(200);
        NOW.set(OPENING.plusSeconds(3600));
        assertThat(punch(JsonPath.read(verify(id, "012345").body(), "$.token"), "END", false).statusCode()).isEqualTo(200);
        NOW.set(OPENING.plusSeconds(7200));
        assertThat(punch(JsonPath.read(verify(id, "012345").body(), "$.token"), "START", false).statusCode()).isEqualTo(200);
        NOW.set(java.time.Instant.parse("2026-11-09T13:30:00Z"));

        String period = "?period=WEEK&date=2026-11-09";
        var response = api("GET", "/report" + period, null);
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(JsonPath.<String>read(response.body(), "$.summary[0].name")).isEqualTo("Nguyễn An");
        assertThat(JsonPath.<Integer>read(response.body(), "$.summary[0].registeredDays")).isEqualTo(1);
        assertThat(JsonPath.<Integer>read(response.body(), "$.summary[0].workedDays")).isEqualTo(1);
        assertThat(JsonPath.<Integer>read(response.body(), "$.summary[0].minutes")).isEqualTo(60);
        assertThat(JsonPath.<Integer>read(response.body(), "$.summary[0].reviewCount")).isEqualTo(1);

        int session = JsonPath.read(response.body(), "$.shifts[0].id");
        int version = JsonPath.read(response.body(), "$.shifts[0].version");
        String edit = """
                {"version":%d,"startedAt":"2026-11-09T08:30:00+07:00","endedAt":"2026-11-09T09:00:00+07:00","reason":"%s"}
                """;
        assertThat(api("PATCH", "/sessions/" + session, edit.formatted(version, " ")).statusCode()).isEqualTo(400);
        assertThat(api("PATCH", "/sessions/" + session, edit.formatted(version, "Sửa theo sổ tiệm")).statusCode()).isEqualTo(204);
        assertThat(api("PATCH", "/sessions/" + session, edit.formatted(version, "Ghi từ tab cũ")).statusCode()).isEqualTo(409);
        var history = api("GET", "/sessions/" + session + "/audit", null).body();
        assertThat(history).contains("Sửa theo sổ tiệm", "owner@test.local").doesNotContain("Ghi từ tab cũ");
        assertThat(jdbc.queryForObject("select original_ended_at from attendance_session where id=?",
                java.sql.Timestamp.class, session).toInstant()).isEqualTo(OPENING.plusSeconds(3600));

        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port
                + "/api/v1/admin/attendance/report.xlsx" + period)).GET().build();
        var xlsx = client.send(request, HttpResponse.BodyHandlers.ofByteArray());
        assertThat(xlsx.statusCode()).isEqualTo(200);
        try (var workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook(new java.io.ByteArrayInputStream(xlsx.body()))) {
            assertThat(workbook.getNumberOfSheets()).isEqualTo(2);
            assertThat(workbook.getSheet("Tổng hợp").getRow(1).getCell(3).getNumericCellValue()).isEqualTo(1);
            assertThat(workbook.getSheet("Tổng hợp").getRow(1).getCell(4).getNumericCellValue()).isEqualTo(0.5);
            assertThat(workbook.getSheet("Chi tiết").getRow(2).getCell(5).getStringCellValue()).isEqualTo("Cần kiểm tra");
        }
    }

    @Test void twoOwnerSessionsCannotOpenTwoShiftsConcurrently() throws Exception {
        int id = employee();
        var first = client;
        String grantOne = JsonPath.read(verify(id, "012345").body(), "$.token");
        String csrfOne = csrf();

        client = HttpClient.newBuilder().cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL)).build();
        assertThat(login("owner@test.local").statusCode()).isEqualTo(200);
        var second = client;
        String grantTwo = JsonPath.read(verify(id, "012345").body(), "$.token");
        String csrfTwo = csrf();

        var ready = new java.util.concurrent.CountDownLatch(2);
        try (var pool = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var one = pool.submit(() -> submitConcurrently(ready, first, grantOne, csrfOne));
            var two = pool.submit(() -> submitConcurrently(ready, second, grantTwo, csrfTwo));
            assertThat(java.util.List.of(one.get(), two.get())).containsExactlyInAnyOrder(200, 409);
        }
        assertThat(jdbc.queryForObject("select count(*) from attendance_session where employee_id=?", Integer.class, id))
                .isEqualTo(1);
    }

    private int submitConcurrently(java.util.concurrent.CountDownLatch ready, HttpClient client,
                                   String token, String csrfToken) throws Exception {
        ready.countDown();
        if (!ready.await(5, java.util.concurrent.TimeUnit.SECONDS)) throw new IllegalStateException("Punch barrier timed out");
        return request(client, "POST", "/api/v1/admin/attendance/punch", punchBody(token, "START", true), csrfToken)
                .statusCode();
    }

    @Test void pinResetAndDeactivationInvalidatePreviouslyVerifiedGrants() throws Exception {
        int id = employee();
        String previous = JsonPath.read(verify(id, "012345").body(), "$.token");
        assertThat(api("PUT", "/employees/" + id + "/pin", """
                {"pin":"654321"}
                """).statusCode()).isEqualTo(204);
        assertThat(punch(previous, "START", true).statusCode()).isEqualTo(403);
        String current = JsonPath.read(verify(id, "654321").body(), "$.token");
        assertThat(api("PUT", "/employees/" + id, """
                {"fullName":"Nguyễn An","active":false,"version":0}
                """).statusCode()).isEqualTo(200);
        assertThat(punch(current, "START", true).statusCode()).isEqualTo(409);
        assertThat(jdbc.queryForObject("select count(*) from attendance_session where employee_id=?", Integer.class, id))
                .isZero();
    }

    @Test void crossMidnightShiftBelongsToStartDayEvenAcrossWeekAndMonth() throws Exception {
        int id = employee();
        NOW.set(java.time.Instant.parse("2026-05-31T15:00:00Z"));
        assertThat(punch(JsonPath.read(verify(id, "012345").body(), "$.token"), "START", true).statusCode())
                .isEqualTo(200);
        NOW.set(NOW.get().plusSeconds(4 * 3600));
        assertThat(punch(JsonPath.read(verify(id, "012345").body(), "$.token"), "END", true).statusCode())
                .isEqualTo(200);
        for (String period : java.util.List.of("MONTH", "WEEK")) {
            String report = "/report?period=" + period + "&filter=OUTSIDE&employeeId=" + id;
            var prior = api("GET", report + "&date=2026-05-31", null).body();
            assertThat(JsonPath.<Integer>read(prior, "$.summary[0].minutes")).isEqualTo(240);
            assertThat(JsonPath.<String>read(prior, "$.shifts[0].day")).isEqualTo("2026-05-31");
            var next = api("GET", report + "&date=2026-06-01", null).body();
            assertThat(JsonPath.<java.util.List<?>>read(next, "$.shifts")).isEmpty();
        }
    }
}
