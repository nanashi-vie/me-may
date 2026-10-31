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
                try(var printer=CSVFormat.RFC4180.print(writer)){printer.printRecord(BookImportSchema.HEADERS);}
                return writer.toString().getBytes(StandardCharsets.UTF_8);
            }
            if(!"xlsx".equals(format))throw BookImportException.file(400,"template_format","Chọn csv hoặc xlsx.");
            try(var book=new XSSFWorkbook();var out=new ByteArrayOutputStream()) {
                var sheet=book.createSheet("Sach");var row=sheet.createRow(0);
                var text=book.createCellStyle();text.setDataFormat(book.createDataFormat().getFormat("@"));
                for(int i=0;i<20;i++){row.createCell(i).setCellValue(BookImportSchema.HEADERS.get(i));sheet.setDefaultColumnStyle(i,text);sheet.setColumnWidth(i,24*256);}
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
        return List.of("Mẹ Mây — mẫu import schema 1. Chỉ điền dữ liệu vào sheet Sach, giữ nguyên 20 header.",
                "Tối đa 2 MiB, 500 dòng, 100 nhóm sách, 100 biến thể mỗi nhóm. Mỗi dòng là một biến thể.",
                "Cùng nhom_sach là một sách; khóa phân biệt hoa thường. Dòng cùng nhóm phải lặp lại toàn bộ thông tin chung giống nhau.",
                "Ví dụ nhóm A01: hai dòng bien_the=Độ mới cao/ton_kho=2 và bien_the=Cấn góc/ton_kho=1 → một sách tồn 3.",
                "nhom_sach: 1–50 ký tự chữ/số ASCII, _ hoặc -. Đây không phải mã MM; website tự sinh mã.",
                "Bắt buộc: nhom_sach, ten_sach, ngon_ngu, the_loai, gia_tu, gia_den, trong_luong_g, tinh_trang, mo_ta_tinh_trang, ton_kho.",
                "Picture book cần kieu_bia=PAPERBACK hoặc HARDCOVER. Thể loại khác để trống kieu_bia.",
                "tinh_trang: HIGH_FRESHNESS (Độ mới cao) hoặc MINOR_FLAWS (Có lỗi nhẹ).",
                "Optional: isbn, nha_xuat_ban, tac_gia, do_tuoi, mo_ta_sach, trinh_do_doc, link_video, bo_suu_tap. Một biến thể được để trống bien_the; nhiều biến thể cần tên khác nhau.",
                "Giá: nguyên VND 1..999999999999, gia_tu≤gia_den. Trọng lượng gram nguyên 1..9007199254740991. Tồn nguyên 0..999999.",
                "Dùng text cho ISBN/khóa nhóm và các cột số để giữ số 0 đầu. Không dấu phân nhóm nghìn, phân số, dấu âm hoặc exponent.",
                "ngon_ngu gợi ý Tiếng Anh, vẫn phải nhập trong từng dòng; ô trống không tự điền.",
                "do_tuoi/bo_suu_tap dùng mã/slug, phân cách ; không trùng. Không nhập tên hiển thị thay mã.",
                "trinh_do_doc: PRE_A1/A1/A2/B1/B2/C1/C2; trống là chưa xác định. link_video là HTTPS plain text, không hyperlink.",
                "Không công thức, macro, ngày, ô gộp hoặc external link. Sửa lỗi trong file rồi tải lại; cả file hợp lệ mới được import.",
                "CSV UTF-8 (BOM được), dấu phẩy; dùng quote kép cho ô có dấu phẩy/xuống dòng, escape quote bằng hai quote.",
                "Dòng CSV tính theo bản ghi logic (header=1); ô nhiều dòng vẫn chỉ một bản ghi. XLSX dùng số hàng Excel thật.",
                "Import chỉ tạo sách Ẩn; thêm ảnh bìa/lưng và chủ tự xuất bản sau. Không tự upload ảnh.",
                "Cùng nội dung đã import sẽ trả biên nhận cũ khi thử lại. Đổi nội dung/khóa là lô mới; không dùng để cập nhật sách cũ.");
    }
}
