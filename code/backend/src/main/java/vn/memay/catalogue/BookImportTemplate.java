package vn.memay.catalogue;

import org.springframework.stereotype.Component;
import org.apache.commons.csv.CSVFormat;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import vn.memay.catalogue.BookImportDtos.*;

@Component
public class BookImportTemplate {
    public byte[] render(String format,ImportOptions options) {
        try {
            if("csv".equals(format)) {
                var writer=new StringWriter();writer.write('\ufeff');
                try(var printer=CSVFormat.RFC4180.print(writer)){printer.printRecord(BookImportSchema.V2_HEADERS);}
                return writer.toString().getBytes(StandardCharsets.UTF_8);
            }
            if(!"xlsx".equals(format))throw BookImportException.file(400,"template_format","Chọn csv hoặc xlsx.");
            try(var book=new XSSFWorkbook();var out=new ByteArrayOutputStream()) {
                var sheet=book.createSheet("Sach");var row=sheet.createRow(0);
                var text=book.createCellStyle();text.setDataFormat(book.createDataFormat().getFormat("@"));
                for(int i=0;i<BookImportSchema.V2_HEADERS.size();i++){row.createCell(i).setCellValue(BookImportSchema.V2_HEADERS.get(i));sheet.setDefaultColumnStyle(i,text);sheet.setColumnWidth(i,24*256);}
                sheet.createFreezePane(0,1);
                var guide=book.createSheet("HuongDan");guide.setColumnWidth(0,90*256);int i=0;
                for(String line:instructions())guide.createRow(i++).createCell(0).setCellValue(line);
                for(var option:options.taxonomy().categories())guide.createRow(i++).createCell(0).setCellValue("Thể loại: "+option.code()+" — "+option.label());
                for(var option:options.taxonomy().ageGroups())guide.createRow(i++).createCell(0).setCellValue("Độ tuổi: "+option.code()+" — "+option.label());
                for(var option:options.taxonomy().bindings())guide.createRow(i++).createCell(0).setCellValue("Kiểu bìa: "+option.code()+" — "+option.label());
                for(var option:options.taxonomy().readingLevels())guide.createRow(i++).createCell(0).setCellValue("Mức đọc: "+option.code()+" — "+option.label());
                for(var collection:options.collections())guide.createRow(i++).createCell(0).setCellValue("Bộ sưu tập: "+collection.slug()+" — "+collection.name());
                book.write(out);return out.toByteArray();
            }
        } catch(BookImportException e){throw e;}catch(IOException e){throw new IllegalStateException("import_template_failed",e);}
    }
    public static List<String> instructions() {
        return List.of("Mẹ Mây — import schema 2. Chỉ điền dữ liệu vào sheet Sach, giữ đủ 16 header.",
                "Mỗi dòng là một sách riêng, tối đa 100 sách/2 MiB. Không ghép theo tên hoặc ISBN.",
                "Tự điền Tiếng Anh, một biến thể không tên và tồn 1. Thêm ảnh, chỉnh tồn/thêm biến thể rồi tự xuất bản.",
                "Bắt buộc: ten_sach, the_loai, gia_tu, gia_den, trong_luong_g, tinh_trang, mo_ta_tinh_trang.",
                "Picture Book cần Paperback hoặc Hardcover; thể loại khác để trống kieu_bia.",
                "Tình trạng: Độ mới cao hoặc Có lỗi nhẹ. Có thể dùng nhãn dễ đọc hoặc code chuẩn.",
                "Các cột khác có thể trống; ISBN dạng text giữ số 0 đầu. Giá VND/trọng lượng gram nguyên dương, không dấu phân nhóm; giá từ≤giá đến.",
                "Độ tuổi dùng nhãn 0-3/4-6/7-9/10+ hoặc code. Nhiều độ tuổi/bộ sưu tập ngăn bằng ;. Bộ sưu tập dùng slug đang active.",
                "Mức đọc dùng nhãn hoặc PRE_A1/A1/A2/B1/B2/C1/C2; trống là chưa xác định. Video dùng HTTPS plain text, không hyperlink.",
                "Không công thức, macro, ngày, ô gộp hoặc external link. CSV UTF-8, dấu phẩy; quote kép khi ô có dấu phẩy/xuống dòng.",
                "Dòng CSV tính theo bản ghi logic, header=1; XLSX dùng số hàng thật. Sửa lỗi ngoài website rồi kiểm lại, cả file hợp lệ mới nhập.",
                "Import tạo sách Ẩn; cùng nội dung thử lại trả biên nhận cũ. Đổi nội dung là lô mới, không dùng để cập nhật sách cũ.");
    }
}
