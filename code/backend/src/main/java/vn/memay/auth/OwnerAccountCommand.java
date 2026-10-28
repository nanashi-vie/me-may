package vn.memay.auth;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.util.Locale;
import java.util.Properties;

/**
 * Operator-only entry point. Deliberately not a Spring component or startup
 * hook.
 */
public final class OwnerAccountCommand {
    private OwnerAccountCommand() {
    }

    public static String provision(Connection connection, String rawEmail, String password) throws SQLException {
        String email = rawEmail == null ? "" : rawEmail.trim().toLowerCase(Locale.ROOT);
        if (!email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+") || email.length() > 254 ||
                password == null || password.isBlank() || password.codePointCount(0, password.length()) < 16 ||
                password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new IllegalArgumentException(
                    "Owner needs a valid email and a 16-character minimum, 72-byte maximum password");
        }
        if (!connection.getAutoCommit())
            throw new IllegalStateException("A dedicated connection is required");
        var encoder = new BCryptPasswordEncoder(12);
        connection.setAutoCommit(false);
        try {
            try (var lock = connection.prepareStatement("select pg_advisory_xact_lock(725392016327::bigint)")) {
                lock.setQueryTimeout(20);
                lock.execute();
            }
            try (var query = connection.prepareStatement(
                    "select password_hash,role,active from public.admin_user where email=? for update")) {
                query.setString(1, email);
                try (var row = query.executeQuery()) {
                    if (row.next()) {
                        if (!"OWNER".equals(row.getString("role")) || !row.getBoolean("active") ||
                                !encoder.matches(password, row.getString("password_hash"))) {
                            throw new IllegalStateException("Existing account differs; no account changed");
                        }
                        connection.commit();
                        return "already_exists";
                    }
                }
            }
            try (var query = connection.prepareStatement("select 1 from public.admin_user where role='OWNER' limit 1");
                    var rows = query.executeQuery()) {
                if (rows.next())
                    throw new IllegalStateException("An owner already exists; no second owner created");
            }
            try (var insert = connection.prepareStatement(
                    "insert into public.admin_user(email,password_hash,role,active) values (?,?,'OWNER',true)")) {
                insert.setString(1, email);
                insert.setString(2, encoder.encode(password));
                insert.executeUpdate();
            }
            connection.commit();
            return "created";
        } catch (SQLException | RuntimeException error) {
            connection.rollback();
            throw error;
        } finally {
            connection.setAutoCommit(true);
        }
    }

    private static String required(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank())
            throw new IllegalArgumentException("Missing setting: " + name);
        return value;
    }

    public static void main(String[] args) {
        try {
            if (args.length != 0)
                throw new IllegalArgumentException("This command takes credentials from environment only");
            var properties = new Properties();
            properties.setProperty("user", required("OWNER_DB_USER"));
            properties.setProperty("password", required("OWNER_DB_PASSWORD"));
            properties.setProperty("connectTimeout", "15");
            properties.setProperty("socketTimeout", "30");
            Class.forName("org.postgresql.Driver");
            try (var connection = DriverManager.getConnection(required("OWNER_JDBC_URL"), properties)) {
                String status = provision(connection, required("OWNER_EMAIL"), required("OWNER_PASSWORD"));
                System.out.println("OWNER_ACCOUNT=" + status);
            }
        } catch (IllegalArgumentException | IllegalStateException error) {
            System.err.println(error.getMessage());
            System.exit(1);
        } catch (Exception error) {
            System.err.println("Owner provisioning failed; database diagnostics suppressed");
            System.exit(1);
        }
    }
}
