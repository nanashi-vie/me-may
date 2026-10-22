package vn.memay.auth;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(properties = {"spring.profiles.active=test", "spring.datasource.url=${TEST_DB_URL}", "memay.bootstrap.enabled=false"})
class OwnerBootstrapTest {
    @Autowired AdminUserRepository repository;
    @Autowired PasswordEncoder encoder;
    @Autowired JdbcTemplate jdbc;
    @BeforeEach void clean() {
        assertThat(jdbc.queryForObject("SELECT current_database()", String.class)).isEqualTo("me_may_test");
        repository.deleteAll();
    }
    @Test void createsHashedOwnerOnceAndNeverResetsExistingPassword() {
        var bootstrap = new OwnerBootstrap(repository, encoder, " OWNER@test.local ", "strong-test-password-123");
        bootstrap.initialize();
        var owner = repository.findByEmail("owner@test.local").orElseThrow();
        assertThat(owner.getRole()).isEqualTo(AdminUser.Role.OWNER);
        assertThat(encoder.matches("strong-test-password-123", owner.getPasswordHash())).isTrue();
        new OwnerBootstrap(repository, encoder, "owner@test.local", "another-strong-password-456").initialize();
        assertThat(repository.count()).isEqualTo(1);
        assertThat(repository.findByEmail("owner@test.local").orElseThrow().getPasswordHash()).isEqualTo(owner.getPasswordHash());
    }
    @Test void rejectsWeakCredentialsWithoutCreatingAccount() {
        assertThatThrownBy(() -> new OwnerBootstrap(repository, encoder, "owner@test.local", "short").initialize()).isInstanceOf(IllegalArgumentException.class);
        assertThat(repository.count()).isZero();
    }
    @Test void refusesToElevateAnExistingStaffAccount() {
        repository.save(new AdminUser("staff@test.local", encoder.encode("staff-password-123"), AdminUser.Role.STAFF));
        assertThatThrownBy(() -> new OwnerBootstrap(repository, encoder, "staff@test.local", "strong-test-password-123").initialize()).isInstanceOf(IllegalStateException.class);
        assertThat(repository.findByEmail("staff@test.local").orElseThrow().getRole()).isEqualTo(AdminUser.Role.STAFF);
    }
}
