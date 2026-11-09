package vn.memay.attendance;

import java.io.ByteArrayInputStream;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AttendanceWorkbookTest {
    @Test
    void formatsDatesTimesAndNumericElapsedHoursInDetailSheet() throws Exception {
        var start = OffsetDateTime.parse("2026-11-09T08:30:00+07:00");
        var day = start.toLocalDate();
        var completed = new AttendanceReportService.Shift(1, 1, "An", day, start, start.plusMinutes(95),
                95L, AttendanceSession.Status.COMPLETED, false, null, 0);
        var longShift = new AttendanceReportService.Shift(2, 2, "Bình", day, start, start.plusHours(25),
                1500L, AttendanceSession.Status.COMPLETED, false, null, 0);
        var open = new AttendanceReportService.Shift(3, 3, "Châu", day, start, null,
                null, AttendanceSession.Status.WORKING, false, null, 0);
        var report = new AttendanceReportService.Report(start, day, day, List.of(), List.of(completed, longShift, open));
        try (var workbook = new XSSFWorkbook(new ByteArrayInputStream(AttendanceWorkbook.write(report)))) {
            var detail = workbook.getSheet("Chi tiết");
            var display = new DataFormatter(Locale.ROOT);
            var row = detail.getRow(1);
            assertThat(display.formatCellValue(row.getCell(0))).isEqualTo("09/11/2026");
            assertThat(display.formatCellValue(row.getCell(2))).isEqualTo("08:30:00");
            assertThat(display.formatCellValue(row.getCell(3))).isEqualTo("10:05:00");
            assertThat(display.formatCellValue(row.getCell(4))).isEqualTo("01:35");
            assertThat(row.getCell(4).getNumericCellValue()).isEqualTo(95.0 / 1440);
            assertThat(display.formatCellValue(detail.getRow(2).getCell(4))).isEqualTo("25:00");
            assertThat(display.formatCellValue(detail.getRow(3).getCell(3))).isEmpty();
            assertThat(display.formatCellValue(detail.getRow(3).getCell(4))).isEmpty();
        }
    }
}
