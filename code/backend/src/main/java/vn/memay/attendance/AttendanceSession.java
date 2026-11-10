package vn.memay.attendance;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.UUID;

record AttendanceSession(long id, long employeeId, OffsetDateTime startedAt, OffsetDateTime endedAt,
                         OffsetDateTime originalStartedAt, OffsetDateTime originalEndedAt, boolean outOfSchedule,
                         UUID startRequest, UUID endRequest, long version) {
    enum Status { READY, WORKING, NEEDS_REVIEW, COMPLETED }

    Status status(OffsetDateTime now) {
        if (endedAt != null) return Status.COMPLETED;
        return AttendanceTime.needsReview(startedAt, endedAt, now) ? Status.NEEDS_REVIEW : Status.WORKING;
    }

    static AttendanceSession read(ResultSet rs, int row) throws SQLException {
        return new AttendanceSession(rs.getLong("id"), rs.getLong("employee_id"),
                rs.getObject("started_at", OffsetDateTime.class), rs.getObject("ended_at", OffsetDateTime.class),
                rs.getObject("original_started_at", OffsetDateTime.class), rs.getObject("original_ended_at", OffsetDateTime.class),
                rs.getBoolean("is_out_of_schedule"), rs.getObject("start_request", UUID.class),
                rs.getObject("end_request", UUID.class), rs.getLong("version"));
    }
}
