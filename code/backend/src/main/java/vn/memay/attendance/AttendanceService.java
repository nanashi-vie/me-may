package vn.memay.attendance;

import jakarta.validation.constraints.*;
import java.io.Serializable;
import java.time.*;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.memay.common.AdminApiException;

@Service
class AttendanceService {
    enum Action { START, END }
    record Verify(@Positive long employeeId, @NotNull @Pattern(regexp = "[0-9]{6}") String pin) {}
    record Punch(@NotNull UUID token, @NotNull Action action, boolean acknowledgedOutsideSchedule) {}
    record Grant(UUID token, long employeeId, long pinRevision, Long lastId, Long lastVersion,
                 Action action, OffsetDateTime expiresAt) implements Serializable {}
    record Verified(UUID token, String fullName, LocalDate monday, LocalDate today, List<Boolean> days,
                    boolean outsideSchedule, AttendanceSession.Status status, OffsetDateTime serverTime,
                    OffsetDateTime startedAt, OffsetDateTime expiresAt) {}
    record Verification(Grant grant, Verified view) {}
    record Result(Action action, OffsetDateTime recordedAt, AttendanceSession.Status status) {}
    private record Credential(String hash, long revision, int failures, OffsetDateTime blockedUntil) {}
    private static final int PIN_LIMIT = 5;

    private final JdbcTemplate jdbc;
    private final EmployeeService employees;
    private final ScheduleService schedules;
    private final AttendanceTime time;
    private final PasswordEncoder passwords;

    AttendanceService(JdbcTemplate jdbc, EmployeeService employees, ScheduleService schedules,
                      AttendanceTime time, PasswordEncoder passwords) {
        this.jdbc = jdbc;
        this.employees = employees;
        this.schedules = schedules;
        this.time = time;
        this.passwords = passwords;
    }

    @Transactional(noRollbackFor = AdminApiException.class)
    public Verification verify(Verify input) {
        var employee = activeEmployee(input.employeeId());
        var credential = credential(employee.id());
        var now = time.now();
        boolean wasBlocked = credential.blockedUntil() != null;
        if (wasBlocked && now.isBefore(credential.blockedUntil())) {
            throw new AdminApiException(429, "pin_locked");
        }
        if (!passwords.matches(input.pin(), credential.hash())) {
            int failures = (wasBlocked ? 0 : credential.failures()) + 1;
            boolean blocked = failures >= PIN_LIMIT;
            jdbc.update("update employee_pin_credential set failures=?, blocked_until=? where employee_id=?",
                    failures, blocked ? now.plusMinutes(5) : null, employee.id());
            throw new AdminApiException(blocked ? 429 : 422, blocked ? "pin_locked" : "incorrect_pin");
        }
        if (credential.failures() > 0) {
            jdbc.update("update employee_pin_credential set failures=0, blocked_until=null where employee_id=?", employee.id());
        }

        now = time.now();
        LocalDate day = AttendanceTime.day(now);
        int mask = schedules.mask(employee.id(), day);
        var last = latest(employee.id());
        var status = last == null ? AttendanceSession.Status.READY : last.status(now);
        boolean working = last != null && last.endedAt() == null;
        var grant = new Grant(UUID.randomUUID(), employee.id(), credential.revision(),
                last == null ? null : last.id(), last == null ? null : last.version(),
                working ? Action.END : Action.START, now.plusSeconds(30));
        var view = new Verified(grant.token(), employee.fullName(), AttendanceTime.monday(day), day,
                ScheduleService.days(mask), !ScheduleService.scheduled(mask, day), status, now,
                working ? last.startedAt() : null, grant.expiresAt());
        return new Verification(grant, view);
    }

    @Transactional
    public Result punch(Grant grant, Punch input) {
        if (grant == null || !grant.token().equals(input.token())) {
            throw new AdminApiException(403, "punch_expired");
        }
        activeEmployee(grant.employeeId());
        var now = time.now();
        if (!now.isBefore(grant.expiresAt()) || credential(grant.employeeId()).revision() != grant.pinRevision()) {
            throw new AdminApiException(403, "punch_expired");
        }
        if (grant.action() != input.action()) throw new AdminApiException(409, "shift_changed");

        var receipt = jdbc.query("""
                select * from attendance_session where employee_id=? and (start_request=? or end_request=?)
                """, AttendanceSession::read, grant.employeeId(), grant.token(), grant.token());
        if (!receipt.isEmpty()) {
            var saved = receipt.getFirst();
            return new Result(input.action(), input.action() == Action.START ? saved.originalStartedAt() : saved.originalEndedAt(),
                    saved.status(now));
        }

        var last = latest(grant.employeeId());
        if (!java.util.Objects.equals(grant.lastId(), last == null ? null : last.id()) ||
                !java.util.Objects.equals(grant.lastVersion(), last == null ? null : last.version())) {
            throw new AdminApiException(409, "shift_changed");
        }
        LocalDate day = AttendanceTime.day(now);
        boolean outside = !ScheduleService.scheduled(schedules.mask(grant.employeeId(), day), day);
        if (outside && !input.acknowledgedOutsideSchedule()) {
            throw new AdminApiException(409, "outside_schedule");
        }
        if (input.action() == Action.START) {
            jdbc.update("""
                    insert into attendance_session(employee_id, started_at, original_started_at, is_out_of_schedule, start_request)
                    values (?, ?, ?, ?, ?)
                    """, grant.employeeId(), now, now, outside, grant.token());
            var status = AttendanceTime.needsReview(now, null, now)
                    ? AttendanceSession.Status.NEEDS_REVIEW : AttendanceSession.Status.WORKING;
            return new Result(input.action(), now, status);
        }
        if (last == null || last.endedAt() != null || now.isBefore(last.startedAt())) {
            throw new AdminApiException(409, "shift_changed");
        }
        jdbc.update("""
                update attendance_session set ended_at=?, original_ended_at=?, end_request=?,
                    version=version+1, updated_at=current_timestamp where id=?
                """, now, now, grant.token(), last.id());
        return new Result(input.action(), now, AttendanceSession.Status.COMPLETED);
    }

    private EmployeeService.Employee activeEmployee(long employeeId) {
        var employee = employees.get(employeeId, true);
        if (!employee.active()) throw new AdminApiException(409, "inactive_employee");
        return employee;
    }

    private Credential credential(long employeeId) {
        return jdbc.queryForObject("""
                select pin_hash, revision, failures, blocked_until from employee_pin_credential where employee_id=?
                """, (rs, row) -> new Credential(rs.getString(1), rs.getLong(2), rs.getInt(3),
                rs.getObject(4, OffsetDateTime.class)), employeeId);
    }

    private AttendanceSession latest(long employeeId) {
        return jdbc.query("""
                select * from attendance_session where employee_id=? order by id desc limit 1
                """, AttendanceSession::read, employeeId).stream().findFirst().orElse(null);
    }
}
