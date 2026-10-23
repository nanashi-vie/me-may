package vn.memay.auth;

import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import tools.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.Locale;
import java.util.Map;

@Configuration
public class SecurityConfiguration {
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(12); }

    @Bean UserDetailsService userDetailsService(AdminUserRepository repository) {
        return email -> repository.findByEmail(email.trim().toLowerCase(Locale.ROOT))
                .map(user -> User.withUsername(user.getEmail()).password(user.getPasswordHash())
                        .roles(user.getRole().name()).disabled(!user.isActive()).build())
                .orElseThrow(() -> new UsernameNotFoundException("Invalid credentials"));
    }

    @Bean SecurityFilterChain securityFilterChain(HttpSecurity http, ObjectMapper mapper,
                                                AdminUserRepository repository) throws Exception {
        return http
                .authorizeHttpRequests(auth -> auth
                        .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                        .requestMatchers(HttpMethod.GET, "/actuator/health", "/api/v1/auth/csrf").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/login").permitAll()
                        .requestMatchers("/api/v1/admin/owner-access").hasRole("OWNER")
                        .requestMatchers("/api/v1/admin/**").hasAnyRole("OWNER", "STAFF")
                        .anyRequest().authenticated())
                .headers(headers -> headers.addHeaderWriter((req,res) -> {
                    if(req.getRequestURI().startsWith("/api/v1/admin/"))res.setHeader("Cache-Control","no-store");
                }))
                .requestCache(cache -> cache.disable())
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint((req, res, ex) -> json(res, mapper, 401, Map.of("error", "unauthorized")))
                        .accessDeniedHandler((req, res, ex) -> json(res, mapper, 403, Map.of("error", "forbidden"))))
                .formLogin(login -> login.loginProcessingUrl("/api/v1/auth/login")
                        .successHandler((req, res, auth) -> json(res, mapper, 200,
                                CurrentAdmin.from(repository.findByEmail(auth.getName()).orElseThrow())))
                        .failureHandler((req, res, ex) -> json(res, mapper, 401, Map.of("error", "invalid_credentials"))))
                .logout(logout -> logout.logoutUrl("/api/v1/auth/logout")
                        .addLogoutHandler((req, res, auth) -> {
                            Cookie cookie = new Cookie("MEMAYSESSION", "");
                            cookie.setPath("/api");
                            cookie.setMaxAge(0);
                            cookie.setHttpOnly(true);
                            cookie.setSecure(req.isSecure());
                            cookie.setAttribute("SameSite", "Lax");
                            res.addCookie(cookie);
                        })
                        .logoutSuccessHandler((req, res, auth) -> res.setStatus(204)))
                .build();
    }

    private static void json(HttpServletResponse response, ObjectMapper mapper, int status, Object body) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.setHeader("Cache-Control", "no-store");
        mapper.writeValue(response.getWriter(), body);
    }
}
