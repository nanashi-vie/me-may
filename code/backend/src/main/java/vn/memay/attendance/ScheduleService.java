package vn.memay.attendance;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.*;
import java.util.*;
import java.util.stream.IntStream;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.memay.common.AdminApiException;

@Service
class ScheduleService {
    record Row(@Positive long employeeId, @NotNull @Size(min = 7, max = 7) List<@NotNull Boolean> days) {}
    record Save(@NotNull Long version, @NotNull List<@NotNull @Valid Row> rows) {}
    record Week(LocalDate monday, LocalDate today, boolean editable, long version, List<Row> rows) {}

    private final JdbcTemplate jdbc;
    private final AttendanceTime time;

    ScheduleService(JdbcTemplate jdbc, AttendanceTime time) {
        this.jdbc = jdbc;
        this.time = time;
    }

    public Week get(LocalDate monday) {
        validateMonday(monday);
        LocalDate today = AttendanceTime.day(time.now());
        boolean editable = !monday.isBefore(AttendanceTime.monday(today));
        return jdbc.query("""
                select w.version, p.id, coalesce(s.day_mask, 0) mask
                from (select cast(? as date) as monday) d
                left join attendance_week w on w.week_start_date=d.monday
                left join employee_profile p on p.active or
                  (not ? and exists(select 1 from employee_weekly_schedule history
                        where history.employee_id=p.id and history.week_start_date=d.monday))
                left join employee_weekly_schedule s on s.week_start_date=d.monday and s.employee_id=p.id
                order by p.id
                """, rs -> {
            long version = 0;
            List<Row> rows = new ArrayList<>();
            while (rs.next()) {
                version = rs.getLong("version");
                Long id = rs.getObject("id", Long.class);
                if (id != null) rows.add(new Row(id, days(rs.getInt("mask"))));
            }
            return new Week(monday, today, editable, version, rows);
        }, monday, editable);
    }

    @Transactional
    public Week save(LocalDate monday, Save input) {
        validateMonday(monday);
        if (monday.isBefore(AttendanceTime.monday(AttendanceTime.day(time.now())))) {
            throw new AdminApiException(409, "past_week");
        }
        jdbc.update("insert into attendance_week(week_start_date) values (?) on conflict do nothing", monday);
        long version = jdbc.queryForObject("select version from attendance_week where week_start_date=? for update", Long.class, monday);
        if (version != input.version()) throw AdminApiException.conflict(version);

        Set<Long> active = new HashSet<>(jdbc.queryForList(
                "select id from employee_profile where active order by id for update", Long.class));
        Set<Long> submitted = new HashSet<>();
        for (Row row : input.rows()) {
            if (!active.contains(row.employeeId()) || !submitted.add(row.employeeId())) {
                throw AdminApiException.field("rows", "Danh sách nhân viên đã thay đổi hoặc có mục trùng.");
            }
        }
        if (!submitted.equals(active)) throw new AdminApiException(409, "employee_list_changed");

        jdbc.update("""
                delete from employee_weekly_schedule s using employee_profile p
                where s.week_start_date=? and s.employee_id=p.id and p.active
                """, monday);
        for (Row row : input.rows()) {
            int mask = 0;
            for (int day = 0; day < 7; day++) if (row.days().get(day)) mask |= 1 << day;
            if (mask != 0) {
                jdbc.update("insert into employee_weekly_schedule values (?, ?, ?)", row.employeeId(), monday, mask);
            }
        }
        jdbc.update("update attendance_week set version=version+1, updated_at=current_timestamp where week_start_date=?", monday);
        return get(monday);
    }

    int mask(long id, LocalDate day) {
        return jdbc.query("select day_mask from employee_weekly_schedule where employee_id=? and week_start_date=?",
                (rs, row) -> rs.getInt(1), id, AttendanceTime.monday(day)).stream().findFirst().orElse(0);
    }

    static List<Boolean> days(int mask) {
        return IntStream.range(0, 7).mapToObj(day -> (mask & (1 << day)) != 0).toList();
    }

    static boolean scheduled(int mask, LocalDate day) {
        return (mask & (1 << (day.getDayOfWeek().getValue() - 1))) != 0;
    }

    private static void validateMonday(LocalDate monday) {
        if (monday.getDayOfWeek() != DayOfWeek.MONDAY || monday.getYear() < 1900 || monday.getYear() > 9998) {
            throw AdminApiException.field("monday", "Chọn ngày Thứ Hai hợp lệ.");
        }
    }
}
