package vn.memay.catalogue;

import org.springframework.stereotype.Component;
import org.apache.commons.csv.CSVFormat;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.ss.util.CellRangeAddressList;
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
                try(var printer=CSVFormat.RFC4180.print(writer)){printer.printRecord(BookImportSchema.V3_HEADERS);}
                return writer.toString().getBytes(StandardCharsets.UTF_8);
            }
            if(!"xlsx".equals(format))throw BookImportException.file(400,"template_format","Chọn csv hoặc xlsx.");
            try(var book=new XSSFWorkbook();var out=new ByteArrayOutputStream()) {
                var sheet=book.createSheet("Sach");var row=sheet.createRow(0);
                var text=book.createCellStyle();text.setDataFormat(book.createDataFormat().getFormat("@"));
                for(int i=0;i<BookImportSchema.V3_HEADERS.size();i++){row.createCell(i).setCellValue(BookImportSchema.V3_HEADERS.get(i));sheet.setDefaultColumnStyle(i,text);sheet.setColumnWidth(i,24*256);}
                var description=book.createCellStyle();description.cloneStyleFrom(text);description.setWrapText(true);
                sheet.setDefaultColumnStyle(6,description);sheet.setColumnWidth(6,50*256);
                var helper=sheet.getDataValidationHelper();
                for(int column:List.of(3,4)) {
                    var choices=(column==3?options.taxonomy().categories():options.taxonomy().bindings()).stream().map(v->v.label()).toArray(String[]::new);
                    if(choices.length==0)continue;
                    var validation=helper.createValidation(helper.createExplicitListConstraint(choices),new CellRangeAddressList(1,100,column,column));
                    validation.setEmptyCellAllowed(true);sheet.addValidationData(validation);
                }
                sheet.createFreezePane(0,1);
                var guide=book.createSheet("HuongDan");guide.setColumnWidth(0,90*256);int i=0;
                for(String line:instructions())guide.createRow(i++).createCell(0).setCellValue(line);
                for(var option:options.taxonomy().categories())guide.createRow(i++).createCell(0).setCellValue("Thể loại: "+option.code()+" — "+option.label());
                for(var option:options.taxonomy().bindings())guide.createRow(i++).createCell(0).setCellValue("Kiểu bìa: "+option.code()+" — "+option.label());
                book.write(out);return out.toByteArray();
            }
        } catch(BookImportException e){throw e;}catch(IOException e){throw new IllegalStateException("import_template_failed",e);}
    }
    public static List<String> instructions() {
        return List.of("Mẹ Mây — import schema 3. Chỉ điền dữ liệu vào sheet Sach, giữ đủ 7 header.",
                "Mỗi dòng là một sách riêng, tối đa 100 sách/2 MiB. Không ghép theo tên hoặc ISBN.",
                "Tự điền Tiếng Anh và tồn 1. Thêm ảnh, chỉnh tồn gộp rồi tự xuất bản.",
                "Bắt buộc: ten_sach, the_loai, trong_luong_g. nha_xuat_ban, tac_gia, mo_ta_sach để trống được.",
                "Picture Book cần Paperback hoặc Hardcover; thể loại khác để trống kieu_bia.",
                "Có thể dùng nhãn dễ đọc hoặc code chuẩn. Trọng lượng gram nguyên dương, không dấu phân nhóm.",
                "Chưa cần giá khi import. Khi thêm ảnh từng sách, nhập đơn giá/kg để tính hai giá; vẫn sửa tay được. Đủ giá và ảnh mới xuất bản.",
                "File cũ 16 hoặc 20 cột vẫn được hỗ trợ, giữ nguyên giá đã nhập trong file.",
                "Không công thức, macro, ngày, ô gộp hoặc external link. CSV UTF-8, dấu phẩy; quote kép khi ô có dấu phẩy/xuống dòng.",
                "Dòng CSV tính theo bản ghi logic, header=1; XLSX dùng số hàng thật. Sửa lỗi ngoài website rồi kiểm lại, cả file hợp lệ mới nhập.",
                "Import tạo sách Ẩn; cùng nội dung thử lại trả biên nhận cũ. Đổi nội dung là lô mới, không dùng để cập nhật sách cũ.");
    }
}
