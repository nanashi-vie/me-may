package vn.memay.attendance;

import jakarta.validation.Valid;
import java.io.IOException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/attendance")
class AttendanceReportController {
    record WebSummary(long employeeId, String code, String name, int registeredDays, int workedDays, long reviewCount) {}
    record WebReport(OffsetDateTime serverTime, LocalDate from, LocalDate to, List<WebSummary> summary, String periodNote) {}

    private final AttendanceReportService reports;

    AttendanceReportController(AttendanceReportService reports) {
        this.reports = reports;
    }

    @GetMapping("/report")
    WebReport report(@RequestParam(defaultValue = "WEEK") AttendanceReportService.Period period,
            @RequestParam(required = false) LocalDate date, @RequestParam(required = false) Long employeeId,
            @RequestParam(defaultValue = "ALL") AttendanceReportService.Filter filter) {
        var report = reports.report(period, date, employeeId, filter);
        var rows = report.summary().stream()
                .map(row -> new WebSummary(row.employeeId(), row.code(), row.name(), row.registeredDays(),
                        row.workedDays(), row.reviewCount()))
                .toList();
        return new WebReport(report.serverTime(), report.from(), report.to(), rows, report.periodNote());
    }

    @GetMapping("/report.xlsx")
    ResponseEntity<byte[]> excel(@RequestParam(defaultValue = "WEEK") AttendanceReportService.Period period,
            @RequestParam(required = false) LocalDate date, @RequestParam(required = false) Long employeeId,
            @RequestParam(defaultValue = "ALL") AttendanceReportService.Filter filter) throws IOException {
        var report = reports.report(period, date, employeeId, filter);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"bang-cong-" + report.from() + ".xlsx\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(AttendanceWorkbook.write(report));
    }

    @PutMapping("/report/note")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void saveNote(@Valid @RequestBody AttendanceReportService.SaveNote input) {
        reports.saveNote(input);
    }
}
