package vn.memay.auth;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
public class AuthController {
    private final AdminUserRepository repository;

    public AuthController(AdminUserRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/api/v1/auth/csrf")
    public ResponseEntity<Map<String, String>> csrf(CsrfToken token) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(Map.of("headerName", token.getHeaderName(), "token", token.getToken()));
    }

    @GetMapping("/api/v1/auth/me")
    public ResponseEntity<CurrentAdmin> me(Authentication authentication) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(CurrentAdmin.from(repository.findByEmail(authentication.getName()).orElseThrow()));
    }

    @GetMapping({ "/api/v1/admin/access", "/api/v1/admin/owner-access" })
    public ResponseEntity<Map<String, String>> access(Authentication authentication) {
        var user = repository.findByEmail(authentication.getName()).orElseThrow();
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(Map.of("role", user.getRole().name()));
    }
}
