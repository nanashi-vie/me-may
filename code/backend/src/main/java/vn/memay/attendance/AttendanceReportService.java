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
                   long reviewCount, String note) {}
    record Report(OffsetDateTime serverTime, LocalDate from, LocalDate to, List<Summary> summary, List<Shift> shifts) {}
    record Note(String text) {}
    record SaveNote(@NotNull Period period, @NotNull LocalDate date, @NotNull @Size(max = 500) String text) {}

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
        LocalDate from = periodStart(period, date);
        LocalDate until = period == Period.WEEK ? from.plusWeeks(1) : from.plusMonths(1);
        List<Shift> shifts = jdbc.query("""
                select s.*, p.full_name,
                    (select reason from attendance_audit_log a where a.session_id=s.id order by a.id desc limit 1) reason
                from attendance_session s join employee_profile p on p.id=s.employee_id
                where s.started_at>=? and s.started_at<? and (cast(? as bigint) is null or s.employee_id=?)
                order by s.started_at, s.id
                """, (rs, row) -> {
            var session = AttendanceSession.read(rs, row);
            var start = session.startedAt().atZoneSameInstant(AttendanceTime.ZONE).toOffsetDateTime();
            var end = session.endedAt() == null ? null : session.endedAt()
                    .atZoneSameInstant(AttendanceTime.ZONE).toOffsetDateTime();
            return new Shift(session.id(), session.employeeId(), rs.getString("full_name"), start.toLocalDate(),
                    start, end, end == null ? null : Duration.between(start, end).toMinutes(), session.status(now),
                    session.outOfSchedule(), rs.getString("reason"), session.version());
        }, from.atStartOfDay(AttendanceTime.ZONE).toOffsetDateTime(), until.atStartOfDay(AttendanceTime.ZONE).toOffsetDateTime(),
                employeeId, employeeId).stream().filter(shift -> matches(filter, shift)).toList();
        var byEmployee = shifts.stream().collect(Collectors.groupingBy(Shift::employeeId));
        Map<Long, Integer> planned = registeredDays(from, until);
        Map<Long, String> notes = jdbc.query("""
                select employee_id, note_text from attendance_period_note where period=? and period_start=?
                """, rs -> {
            Map<Long, String> result = new HashMap<>();
            while (rs.next()) result.put(rs.getLong("employee_id"), rs.getString("note_text"));
            return result;
        }, period.name(), from);
        List<Summary> summary = new ArrayList<>();
        for (var employee : employees.list()) {
            if (employeeId != null && employee.id() != employeeId) continue;
            var sessions = byEmployee.getOrDefault(employee.id(), List.of());
            int registered = planned.getOrDefault(employee.id(), 0);
            String note = notes.get(employee.id());
            if (sessions.isEmpty() && (filter != Filter.ALL ||
                    (!employee.active() && registered == 0 && employeeId == null && note == null))) {
                continue;
            }
            int worked = (int) sessions.stream().filter(shift -> shift.minutes() != null).map(Shift::day).distinct().count();
            long minutes = sessions.stream().map(Shift::minutes).filter(Objects::nonNull).mapToLong(Long::longValue).sum();
            long review = sessions.stream().filter(shift -> shift.status() == AttendanceSession.Status.NEEDS_REVIEW).count();
            summary.add(new Summary(employee.id(), employee.code(), employee.fullName(), registered, worked, minutes, review, note));
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

    Note note(long employeeId, Period period, LocalDate date) {
        employees.get(employeeId, false);
        var start = periodStart(period, date);
        String text = jdbc.query("""
                select note_text from attendance_period_note where period=? and period_start=? and employee_id=?
                """, (rs, row) -> rs.getString(1), period.name(), start, employeeId)
                .stream().findFirst().orElse("");
        return new Note(text);
    }

    void saveNote(long employeeId, SaveNote input) {
        employees.get(employeeId, false);
        var start = periodStart(input.period(), input.date());
        String text = input.text().strip();
        if (text.isEmpty()) {
            jdbc.update("delete from attendance_period_note where period=? and period_start=? and employee_id=?",
                    input.period().name(), start, employeeId);
            return;
        }
        jdbc.update("""
                insert into attendance_period_note(period, period_start, employee_id, note_text)
                values (?, ?, ?, ?)
                on conflict (period, period_start, employee_id) do update set note_text=excluded.note_text
                """, input.period().name(), start, employeeId, text);
    }

    private static LocalDate periodStart(Period period, LocalDate date) {
        if (date.getYear() < 1900 || date.getYear() > 9998) {
            throw AdminApiException.field("date", "Chọn kỳ báo cáo hợp lệ.");
        }
        return period == Period.WEEK ? AttendanceTime.monday(date) : date.withDayOfMonth(1);
    }
}
