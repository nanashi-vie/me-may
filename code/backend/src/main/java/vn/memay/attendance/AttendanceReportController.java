package vn.memay.attendance;

import jakarta.validation.Valid;
import java.io.IOException;
import java.security.Principal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/attendance")
class AttendanceReportController {
    private final AttendanceReportService reports;

    AttendanceReportController(AttendanceReportService reports) {
        this.reports = reports;
    }

    @GetMapping("/report")
    AttendanceReportService.Report report(@RequestParam(defaultValue = "WEEK") AttendanceReportService.Period period,
            @RequestParam(required = false) LocalDate date, @RequestParam(required = false) Long employeeId,
            @RequestParam(defaultValue = "ALL") AttendanceReportService.Filter filter) {
        return reports.report(period, date, employeeId, filter);
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

    @PatchMapping("/sessions/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void correct(@PathVariable long id, @Valid @RequestBody AttendanceReportService.Edit input, Principal principal) {
        reports.correct(id, input, principal.getName());
    }

    @GetMapping("/sessions/{id}/audit")
    List<AttendanceReportService.Audit> audit(@PathVariable long id) {
        return reports.audit(id);
    }
}
