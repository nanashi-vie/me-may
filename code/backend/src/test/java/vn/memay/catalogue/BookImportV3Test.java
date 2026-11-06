package vn.memay.catalogue;

import org.junit.jupiter.api.Test;
import org.apache.poi.xssf.usermodel.*;
import java.io.*;
import java.util.*;
import java.util.function.Consumer;
import vn.memay.catalogue.BookImportDtos.*;
import static org.assertj.core.api.Assertions.*;

class BookImportV3Test {
    static final List<String> COLUMNS=List.of("ten_sach","nha_xuat_ban","tac_gia","the_loai","kieu_bia","trong_luong_g","mo_ta_sach");
    final BookImportParser parser=new BookImportParser();
    final BookImportValidator validator=new BookImportValidator(new BookValidation());
    static Map<String,String> values() {return Map.of("ten_sach","Sách mẫu","nha_xuat_ban","NXB mẫu","tac_gia","Tác giả mẫu",
            "the_loai","Board Book","kieu_bia","","trong_luong_g","450","mo_ta_sach","Mô tả, dòng đầu\nDòng sau");}
    static byte[] csv(List<Map<String,String>> rows) {return BookImportV2Test.csv(rows,COLUMNS);}
    static Map<String,String> change(String key,String value) {return BookImportV2Test.change(values(),key,value);}
    static byte[] xlsx(List<Map<String,String>> rows,List<String> headers,Consumer<XSSFSheet> mutate)throws Exception {
        try(var book=new XSSFWorkbook();var out=new ByteArrayOutputStream()) {
            var sheet=book.createSheet("Sach");var header=sheet.createRow(0);
            for(int c=0;c<headers.size();c++)header.createCell(c).setCellValue(headers.get(c));
            for(int n=0;n<rows.size();n++) {
                var row=sheet.createRow(n+1);
                for(int c=0;c<headers.size();c++)row.createCell(c).setCellValue(rows.get(n).getOrDefault(headers.get(c),""));
            }
            mutate.accept(sheet);book.write(out);return out.toByteArray();
        }
    }
    ImportDocument read(byte[] bytes,String ext) {return validator.normalize(parser.parse("books."+ext,bytes));}
    @Test void sevenColumnsCreateUnpricedMetadataAndPreserveDescription()throws Exception {
        var csv=read(csv(List.of(values())),"csv");
        var excel=read(xlsx(List.of(values()),COLUMNS,s->{}),"xlsx");
        assertThat(csv.issues()).isEmpty();assertThat(excel.issues()).isEmpty();
        assertThat(csv.schemaVersion()).isEqualTo(3);assertThat(csv.fingerprint()).isEqualTo(excel.fingerprint());
        var write=csv.groups().getFirst().write();
        assertThat(write.priceMinVnd()).isNull();assertThat(write.priceMaxVnd()).isNull();
        assertThat(write.publisher()).isEqualTo("NXB mẫu");assertThat(write.author()).isEqualTo("Tác giả mẫu");
        assertThat(write.description()).isEqualTo("Mô tả, dòng đầu\nDòng sau");
        assertThat(write.language()).isEqualTo("Tiếng Anh");assertThat(write.weightG()).isEqualTo(450);
        assertThat(write.variants()).containsExactly(new BookDtos.VariantWrite(null,null,1L));
    }
    @Test void optionalMetadataCanBeBlank() {
        var row=new LinkedHashMap<>(values());for(var c:List.of("nha_xuat_ban","tac_gia","mo_ta_sach"))row.put(c,"");
        var doc=read(csv(List.of(row)),"csv");assertThat(doc.issues()).isEmpty();
        var write=doc.groups().getFirst().write();assertThat(write.publisher()).isNull();assertThat(write.author()).isNull();assertThat(write.description()).isNull();
    }
    @Test void reorderedRowsColumnsAndLabelsHaveStableFingerprintWithoutMergingDuplicates()throws Exception {
        var second=change("ten_sach","Another book");
        var original=read(csv(List.of(values(),values(),second)),"csv");
        var headers=new ArrayList<>(COLUMNS);Collections.reverse(headers);
        var code=change("the_loai"," board_book ");
        var reordered=read(xlsx(List.of(second,code,code),headers,s->{}),"xlsx");
        assertThat(original.groups()).hasSize(3);assertThat(original.fingerprint()).isEqualTo(reordered.fingerprint());
        assertThat(original.fingerprint()).isNotEqualTo(BookImportFingerprint.digest(original.groups(),2));
    }
    @Test void requiresTitleCategoryWeightAndConditionalBinding() {
        for(var column:List.of("ten_sach","the_loai","trong_luong_g")) {
            var doc=read(csv(List.of(change(column,""))),"csv");
            assertThat(doc.fingerprint()).isNull();assertThat(doc.issues()).extracting(ImportIssue::column).contains(column);
        }
        for(var bad:List.of("0","-1","1.5","9007199254740992"))
            assertThat(read(csv(List.of(change("trong_luong_g",bad))),"csv").issues()).extracting(ImportIssue::column).contains("trong_luong_g");
        assertThat(read(csv(List.of(change("the_loai","Picture Book"))),"csv").issues()).extracting(ImportIssue::column).contains("kieu_bia");
        var picture=BookImportV2Test.change(change("the_loai","Picture Book"),"kieu_bia","Paperback");
        assertThat(read(csv(List.of(picture)),"csv").issues()).isEmpty();
        assertThat(read(csv(List.of(change("kieu_bia","Hardcover"))),"csv").issues()).extracting(ImportIssue::column).contains("kieu_bia");
        assertThat(read(csv(List.of(change("the_loai","unknown"))),"csv").issues()).extracting(ImportIssue::column).contains("the_loai");
        assertThat(read(csv(List.of(change("mo_ta_sach","a".repeat(10001)))),"csv").fingerprint()).isNull();
    }
    @Test void sparseExcelReportsActualRowAndRejectsFormulaOrExtraData()throws Exception {
        var sparse=read(xlsx(List.of(change("trong_luong_g","")),COLUMNS,s->s.shiftRows(1,1,5)),"xlsx");
        assertThat(sparse.issues()).anySatisfy(i->{assertThat(i.row()).isEqualTo(7);assertThat(i.column()).isEqualTo("trong_luong_g");});
        var formula=read(xlsx(List.of(values()),COLUMNS,s->s.getRow(1).getCell(5).setCellFormula("400+50")),"xlsx");
        assertThat(formula.issues()).extracting(ImportIssue::column).contains("trong_luong_g");
        assertThat(read(xlsx(List.of(values()),COLUMNS,s->s.getRow(1).createCell(7).setCellValue("extra")),"xlsx").fingerprint()).isNull();
    }
    @Test void allHeadersAreRequiredEvenWhenValuesAreOptionalAndLimitIs100()throws Exception {
        var missing=new ArrayList<>(COLUMNS);missing.remove("tac_gia");
        var duplicate=new ArrayList<>(COLUMNS);duplicate.set(2,"ten_sach");
        var unknown=new ArrayList<>(COLUMNS);unknown.set(2,"unknown");
        for(var headers:List.of(missing,duplicate,unknown))
            assertThatThrownBy(()->read(BookImportV2Test.csv(List.of(values()),headers),"csv")).isInstanceOf(BookImportException.class);
        assertThat(read(csv(Collections.nCopies(100,values())),"csv").groups()).hasSize(100);
        for(var ext:List.of("csv","xlsx")) {
            byte[] data=ext.equals("csv")?csv(Collections.nCopies(101,values())):xlsx(Collections.nCopies(101,values()),COLUMNS,s->{});
            assertThatThrownBy(()->read(data,ext)).isInstanceOfSatisfying(BookImportException.class,e->assertThat(e.status).isEqualTo(413));
        }
    }
}
