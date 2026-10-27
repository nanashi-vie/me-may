package vn.memay.auth;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import java.sql.Connection;
import static org.assertj.core.api.Assertions.*;

class OwnerAccountCommandTest {
    private final JdbcTemplate jdbc = vn.memay.support.PgTestData.jdbc();
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);
    private static final String PASSWORD = "fixed-owner-password-123";
    @BeforeEach void clean() { vn.memay.support.PgTestData.clean(jdbc); }
    private String provision(String email,String password) throws Exception {
        try(Connection connection = jdbc.getDataSource().getConnection()) {
            return OwnerAccountCommand.provision(connection,email,password);
        }
    }
    @Test void createsChosenOwnerWithHashedPasswordAndIsIdempotent() throws Exception {
        assertThat(provision(" OWNER@test.local ",PASSWORD)).isEqualTo("created");
        assertThat(jdbc.queryForObject("select email from admin_user",String.class)).isEqualTo("owner@test.local");
        var hash=jdbc.queryForObject("select password_hash from admin_user",String.class);
        assertThat(encoder.matches(PASSWORD,hash)).isTrue();
        assertThat(jdbc.queryForObject("select role from admin_user",String.class)).isEqualTo("OWNER");
        assertThat(provision("owner@test.local",PASSWORD)).isEqualTo("already_exists");
        assertThat(jdbc.queryForObject("select count(*) from admin_user",Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select password_hash from admin_user",String.class)).isEqualTo(hash);
    }
    @Test void doesNotResetAnExistingOwnerPassword() throws Exception {
        provision("owner@test.local",PASSWORD);
        assertThatThrownBy(() -> provision("owner@test.local","another-fixed-password-456")).isInstanceOf(IllegalStateException.class);
        assertThat(encoder.matches(PASSWORD,jdbc.queryForObject("select password_hash from admin_user",String.class))).isTrue();
    }
    @Test void doesNotElevateStaffOrReactivateDisabledOwner() throws Exception {
        jdbc.update("insert into admin_user(email,password_hash,role,active) values (?,?,?,?)","owner@test.local",encoder.encode(PASSWORD),"STAFF",true);
        assertThatThrownBy(() -> provision("owner@test.local",PASSWORD)).isInstanceOf(IllegalStateException.class);
        assertThat(jdbc.queryForObject("select role from admin_user",String.class)).isEqualTo("STAFF");
        jdbc.update("update admin_user set role='OWNER',active=false");
        assertThatThrownBy(() -> provision("owner@test.local",PASSWORD)).isInstanceOf(IllegalStateException.class);
        assertThat(jdbc.queryForObject("select active from admin_user",Boolean.class)).isFalse();
    }
    @Test void refusesToCreateASecondOwner() throws Exception {
        provision("owner@test.local",PASSWORD);
        assertThatThrownBy(() -> provision("second@test.local",PASSWORD)).isInstanceOf(IllegalStateException.class);
        assertThat(jdbc.queryForObject("select count(*) from admin_user",Integer.class)).isEqualTo(1);
    }
    @Test void rejectsInvalidCredentialsBeforeInserting() {
        for(String email:new String[]{"bad","bad email@test.local"})
            assertThatThrownBy(() -> provision(email,PASSWORD)).isInstanceOf(IllegalArgumentException.class);
        for(String password:new String[]{"short","x".repeat(73),"😀".repeat(8)})
            assertThatThrownBy(() -> provision("owner@test.local",password)).isInstanceOf(IllegalArgumentException.class);
        assertThat(jdbc.queryForObject("select count(*) from admin_user",Integer.class)).isZero();
    }
    @Test void serializesConcurrentProvisioningOfDifferentOwners() throws Exception {
        var start = new java.util.concurrent.CountDownLatch(1);
        try (var pool = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var first=pool.submit(() -> attemptAfter(start,"first@test.local"));
            var second=pool.submit(() -> attemptAfter(start,"second@test.local"));
            start.countDown();
            assertThat(java.util.List.of(first.get(),second.get())).containsExactlyInAnyOrder("created","refused");
            assertThat(jdbc.queryForObject("select count(*) from admin_user where role='OWNER'",Integer.class)).isEqualTo(1);
        }
    }
    private String attemptAfter(java.util.concurrent.CountDownLatch start,String email) throws Exception {
        try(Connection connection=jdbc.getDataSource().getConnection()) {
            start.await();
            try { return OwnerAccountCommand.provision(connection,email,PASSWORD); }
            catch(IllegalStateException expected) { return "refused"; }
        }
    }

}
