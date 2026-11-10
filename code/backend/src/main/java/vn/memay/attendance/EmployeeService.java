package vn.memay.attendance;

import jakarta.validation.constraints.*;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.memay.common.AdminApiException;

@Service
class EmployeeService {
    record Employee(long id, String code, String fullName, String displayName, String phone,
                    LocalDate startedOn, boolean active, long version) {}
    record Create(@NotBlank @Size(max = 160) String fullName, @Size(max = 100) String displayName,
                  @Size(max = 32) String phone, LocalDate startedOn, @NotNull @Pattern(regexp = "[0-9]{6}") String pin) {}
    record Edit(@NotBlank @Size(max = 160) String fullName, @Size(max = 100) String displayName,
                @Size(max = 32) String phone, LocalDate startedOn, @NotNull Boolean active, @NotNull Long version) {}
    record Pin(@NotNull @Pattern(regexp = "[0-9]{6}") String pin) {}

    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwords;

    EmployeeService(JdbcTemplate jdbc, PasswordEncoder passwords) {
        this.jdbc = jdbc;
        this.passwords = passwords;
    }

    List<Employee> list() {
        return jdbc.query("select * from employee_profile order by id", EmployeeService::map);
    }

    Employee get(long id, boolean lock) {
        return jdbc.query("select * from employee_profile where id = ?" + (lock ? " for update" : ""),
                EmployeeService::map, id).stream().findFirst()
                .orElseThrow(() -> new AdminApiException(404, "not_found"));
    }

    @Transactional
    public Employee create(Create input) {
        long id = jdbc.queryForObject("""
                insert into employee_profile(full_name, display_name, phone, started_on)
                values (?, coalesce(?, left(?, 100)), ?, ?) returning id
                """, Long.class, input.fullName().strip(), optionalText(input.displayName()), input.fullName().strip(),
                optionalText(input.phone()), input.startedOn());
        jdbc.update("insert into employee_pin_credential(employee_id, pin_hash) values (?, ?)",
                id, passwords.encode(input.pin()));
        return get(id, false);
    }

    @Transactional
    public Employee edit(long id, Edit input) {
        var current = get(id, true);
        if (current.version() != input.version()) throw AdminApiException.conflict(current.version());
        jdbc.update("""
                update employee_profile set full_name=?, display_name=coalesce(?, display_name), phone=?, started_on=?, active=?, version=version+1
                where id=?
                """, input.fullName().strip(), optionalText(input.displayName()), optionalText(input.phone()), input.startedOn(),
                input.active(), id);
        return get(id, false);
    }

    @Transactional
    public void reset(long id, Pin input) {
        get(id, true);
        jdbc.update("""
                update employee_pin_credential set pin_hash=?, revision=revision+1, changed_at=current_timestamp,
                failures=0, blocked_until=null where employee_id=?
                """, passwords.encode(input.pin()), id);
    }

    static String code(long id) {
        return String.format(java.util.Locale.ROOT, "EMP-%03d", id);
    }

    private static String optionalText(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }

    private static Employee map(ResultSet rs, int row) throws SQLException {
        long id = rs.getLong("id");
        return new Employee(id, code(id), rs.getString("full_name"), rs.getString("display_name"),
                rs.getString("phone"), rs.getObject("started_on", LocalDate.class),
                rs.getBoolean("active"), rs.getLong("version"));
    }
}
