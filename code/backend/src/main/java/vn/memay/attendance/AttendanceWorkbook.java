package vn.memay.attendance;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

final class AttendanceWorkbook {
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");

    private AttendanceWorkbook() {}

    static byte[] write(AttendanceReportService.Report report) throws IOException {
        try (var book = new XSSFWorkbook(); var bytes = new ByteArrayOutputStream()) {
            var summary = book.createSheet("Tổng hợp");
            row(summary, "Mã nhân viên", "Tên", "Số ngày đăng ký", "Số ngày làm thực tế",
                    "Tổng giờ hợp lệ", "Số ca cần kiểm tra");
            for (var line : report.summary()) {
                row(summary, line.code(), line.name(), line.registeredDays(), line.workedDays(),
                        line.minutes() / 60.0, line.reviewCount());
            }
            var detail = book.createSheet("Chi tiết");
            row(detail, "Ngày", "Nhân viên", "Giờ bắt đầu", "Giờ kết thúc", "Tổng số phút",
                    "Trạng thái", "Ngoài lịch", "Ghi chú chỉnh sửa");
            for (var shift : report.shifts()) {
                row(detail, shift.day().toString(), shift.name(), format(shift.startedAt()), format(shift.endedAt()),
                        shift.minutes(), label(shift.status()), shift.outOfSchedule() ? "Có" : "Không", shift.lastReason());
            }
            format(summary, 20, 28, 20, 22, 20, 23);
            format(detail, 14, 28, 25, 25, 16, 22, 14, 40);
            book.write(bytes);
            return bytes.toByteArray();
        }
    }

    private static String label(AttendanceSession.Status status) {
        return switch (status) {
            case READY -> "Chưa vào ca";
            case WORKING -> "Đang làm";
            case NEEDS_REVIEW -> "Cần kiểm tra";
            case COMPLETED -> "Hoàn tất";
        };
    }

    private static String format(OffsetDateTime time) {
        return time == null ? "" : TIME.format(time);
    }

    private static void row(Sheet sheet, Object... values) {
        var row = sheet.createRow(sheet.getPhysicalNumberOfRows());
        for (int column = 0; column < values.length; column++) {
            var cell = row.createCell(column);
            if (values[column] instanceof Number number) cell.setCellValue(number.doubleValue());
            else if (values[column] instanceof String text) cell.setCellValue(text);
        }
    }

    private static void format(Sheet sheet, int... widths) {
        sheet.createFreezePane(0, 1);
        for (int column = 0; column < widths.length; column++) sheet.setColumnWidth(column, 256 * widths[column]);
        var header = sheet.getWorkbook().createCellStyle();
        var font = sheet.getWorkbook().createFont();
        font.setBold(true);
        header.setFont(font);
        for (var cell : sheet.getRow(0)) cell.setCellStyle(header);
    }
}
