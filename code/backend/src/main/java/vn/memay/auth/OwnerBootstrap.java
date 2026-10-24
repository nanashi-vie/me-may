package vn.memay.auth;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

@Component
@Profile("local")
@ConditionalOnProperty(name = "memay.bootstrap.enabled", havingValue = "true")
public class OwnerBootstrap {
    private final AdminUserRepository repository;
    private final PasswordEncoder encoder;
    private final String email;
    private final String password;

    public OwnerBootstrap(AdminUserRepository repository, PasswordEncoder encoder,
                          @Value("${memay.bootstrap.email}") String email,
                          @Value("${memay.bootstrap.password}") String password) {
        this.repository = repository;
        this.encoder = encoder;
        this.email = email.trim().toLowerCase(Locale.ROOT);
        this.password = password;
    }

    @PostConstruct
    public void initialize() {
        if (!email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+") || email.length() > 254
                || password.length() < 16 || password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new IllegalArgumentException("Bootstrap requires a valid email and a 16-72 byte password");
        }
        var existing = repository.findByEmail(email);
        if (existing.isPresent()) {
            if (existing.get().getRole() != AdminUser.Role.OWNER) {
                throw new IllegalStateException("Bootstrap cannot elevate an existing account");
            }
            return;
        }
        repository.save(new AdminUser(email, encoder.encode(password), AdminUser.Role.OWNER));
    }
}
