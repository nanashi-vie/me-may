package vn.memay.attendance;

import java.time.*;
import java.time.temporal.TemporalAdjusters;
import org.springframework.stereotype.Component;

@Component
class AttendanceTime {
    static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    static final LocalTime CLOSING = LocalTime.of(20, 30);

    private final Clock clock;

    AttendanceTime(Clock clock) {
        this.clock = clock;
    }

    OffsetDateTime now() {
        return clock.instant().atZone(ZONE).toOffsetDateTime();
    }

    static LocalDate day(OffsetDateTime time) {
        return time.atZoneSameInstant(ZONE).toLocalDate();
    }

    static LocalDate monday(LocalDate date) {
        return date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }

    static boolean needsReview(OffsetDateTime start, OffsetDateTime end, OffsetDateTime now) {
        return end == null && !now.isBefore(day(start).atTime(CLOSING).atZone(ZONE).toOffsetDateTime());
    }
}
