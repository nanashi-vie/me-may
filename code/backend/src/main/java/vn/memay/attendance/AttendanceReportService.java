package vn.memay.attendance;

import jakarta.validation.constraints.*;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import vn.memay.common.AdminApiException;

@Service
class AttendanceReportService {
    enum Period { WEEK, MONTH }
    enum Filter { ALL, OPEN, REVIEW, OUTSIDE }
    record Shift(long id, long employeeId, String name, LocalDate day, OffsetDateTime startedAt,
                 OffsetDateTime endedAt, Long minutes, AttendanceSession.Status status, boolean outOfSchedule,
                 String lastReason, long version) {}
    record Summary(long employeeId, String code, String name, int registeredDays, int workedDays, long minutes,
                   long reviewCount) {}
    record Report(OffsetDateTime serverTime, LocalDate from, LocalDate to, List<Summary> summary, List<Shift> shifts) {}
    record Edit(@NotNull Long version, @NotNull OffsetDateTime startedAt,
                @NotNull OffsetDateTime endedAt, @NotBlank @Size(max = 500) String reason) {}
    record Audit(String actor, OffsetDateTime recordedAt, OffsetDateTime oldStartedAt, OffsetDateTime oldEndedAt,
                 OffsetDateTime newStartedAt, OffsetDateTime newEndedAt, String reason) {}

    private final JdbcTemplate jdbc;
    private final EmployeeService employees;
    private final AttendanceTime time;

    AttendanceReportService(JdbcTemplate jdbc, EmployeeService employees, AttendanceTime time) {
        this.jdbc = jdbc;
        this.employees = employees;
        this.time = time;
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Report report(Period period, LocalDate date, Long employeeId, Filter filter) {
        var now = time.now();
        if (date == null) date = AttendanceTime.day(now);
        if (date.getYear() < 1900 || date.getYear() > 9998) {
            throw AdminApiException.field("date", "Chọn kỳ báo cáo hợp lệ.");
        }
        LocalDate from = period == Period.WEEK ? AttendanceTime.monday(date) : date.withDayOfMonth(1);
        LocalDate until = period == Period.WEEK ? from.plusWeeks(1) : from.plusMonths(1);
        List<Shift> shifts = jdbc.query("""
                select s.*, p.display_name,
                    (select reason from attendance_audit_log a where a.session_id=s.id order by a.id desc limit 1) reason
                from attendance_session s join employee_profile p on p.id=s.employee_id
                where s.started_at>=? and s.started_at<? and (cast(? as bigint) is null or s.employee_id=?)
                order by s.started_at, s.id
                """, (rs, row) -> {
            var session = AttendanceSession.read(rs, row);
            var start = session.startedAt().atZoneSameInstant(AttendanceTime.ZONE).toOffsetDateTime();
            var end = session.endedAt() == null ? null : session.endedAt()
                    .atZoneSameInstant(AttendanceTime.ZONE).toOffsetDateTime();
            return new Shift(session.id(), session.employeeId(), rs.getString("display_name"), start.toLocalDate(),
                    start, end, end == null ? null : Duration.between(start, end).toMinutes(), session.status(now),
                    session.outOfSchedule(), rs.getString("reason"), session.version());
        }, from.atStartOfDay(AttendanceTime.ZONE).toOffsetDateTime(), until.atStartOfDay(AttendanceTime.ZONE).toOffsetDateTime(),
                employeeId, employeeId).stream().filter(shift -> matches(filter, shift)).toList();
        var byEmployee = shifts.stream().collect(Collectors.groupingBy(Shift::employeeId));
        Map<Long, Integer> planned = registeredDays(from, until);
        List<Summary> summary = new ArrayList<>();
        for (var employee : employees.list()) {
            if (employeeId != null && employee.id() != employeeId) continue;
            var sessions = byEmployee.getOrDefault(employee.id(), List.of());
            int registered = planned.getOrDefault(employee.id(), 0);
            if (sessions.isEmpty() && (filter != Filter.ALL || (!employee.active() && registered == 0 && employeeId == null))) {
                continue;
            }
            int worked = (int) sessions.stream().filter(shift -> shift.minutes() != null).map(Shift::day).distinct().count();
            long minutes = sessions.stream().map(Shift::minutes).filter(Objects::nonNull).mapToLong(Long::longValue).sum();
            long review = sessions.stream().filter(shift -> shift.status() == AttendanceSession.Status.NEEDS_REVIEW).count();
            summary.add(new Summary(employee.id(), employee.code(), employee.displayName(), registered, worked, minutes, review));
        }
        return new Report(now, from, until.minusDays(1), summary, shifts);
    }

    private Map<Long, Integer> registeredDays(LocalDate from, LocalDate until) {
        return jdbc.query("""
                select employee_id, week_start_date, day_mask from employee_weekly_schedule
                where week_start_date>=? and week_start_date<?
                """, rs -> {
            Map<Long, Integer> result = new HashMap<>();
            while (rs.next()) {
                LocalDate monday = rs.getObject("week_start_date", LocalDate.class);
                int mask = rs.getInt("day_mask");
                for (int i = 0; i < 7; i++) {
                    var day = monday.plusDays(i);
                    if ((mask & (1 << i)) != 0 && !day.isBefore(from) && day.isBefore(until)) {
                        result.merge(rs.getLong("employee_id"), 1, Integer::sum);
                    }
                }
            }
            return result;
        }, AttendanceTime.monday(from), until);
    }

    private static boolean matches(Filter filter, Shift shift) {
        return switch (filter) {
            case ALL -> true;
            case OPEN -> shift.endedAt() == null;
            case REVIEW -> shift.status() == AttendanceSession.Status.NEEDS_REVIEW;
            case OUTSIDE -> shift.outOfSchedule();
        };
    }

    @Transactional
    public void correct(long id, Edit input, String actor) {
        var initial = get(id);
        employees.get(initial.employeeId(), true);
        var current = get(id);
        if (current.version() != input.version()) throw AdminApiException.conflict(current.version());
        var now = time.now();
        if (input.startedAt().isBefore(Instant.EPOCH.atOffset(ZoneOffset.UTC)) ||
                !input.endedAt().isAfter(input.startedAt()) || input.endedAt().isAfter(now)) {
            throw AdminApiException.field("endedAt", "Giờ kết thúc phải sau giờ bắt đầu và không ở tương lai.");
        }
        boolean overlap = Boolean.TRUE.equals(jdbc.queryForObject("""
                select exists(select 1 from attendance_session
                where employee_id=? and id<>? and started_at<? and (ended_at is null or ended_at>?))
                """, Boolean.class, current.employeeId(), id, input.endedAt(), input.startedAt()));
        if (overlap) throw new AdminApiException(409, "shift_overlap");
        jdbc.update("""
                insert into attendance_audit_log(session_id, actor_email, old_started_at, old_ended_at,
                    new_started_at, new_ended_at, reason, recorded_at)
                values (?, ?, ?, ?, ?, ?, ?, ?)
                """, id, actor, current.startedAt(), current.endedAt(), input.startedAt(), input.endedAt(),
                input.reason().strip(), now);
        jdbc.update("""
                update attendance_session set started_at=?, ended_at=?, version=version+1, updated_at=? where id=?
                """, input.startedAt(), input.endedAt(), now, id);
    }

    List<Audit> audit(long id) {
        get(id);
        return jdbc.query("""
                select * from attendance_audit_log where session_id=? order by id desc
                """, (rs, row) -> new Audit(rs.getString("actor_email"), dateTime(rs, "recorded_at"),
                dateTime(rs, "old_started_at"), dateTime(rs, "old_ended_at"), dateTime(rs, "new_started_at"),
                dateTime(rs, "new_ended_at"), rs.getString("reason")), id);
    }

    private static OffsetDateTime dateTime(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        return rs.getObject(column, OffsetDateTime.class);
    }

    private AttendanceSession get(long id) {
        return jdbc.query("select * from attendance_session where id=?", AttendanceSession::read, id)
                .stream().findFirst().orElseThrow(() -> new AdminApiException(404, "not_found"));
    }
}
