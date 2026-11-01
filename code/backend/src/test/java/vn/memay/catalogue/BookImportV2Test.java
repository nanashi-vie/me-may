package vn.memay.catalogue;

import org.junit.jupiter.api.Test;
import org.apache.poi.xssf.usermodel.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.function.Consumer;
import org.apache.commons.csv.CSVFormat;
import tools.jackson.databind.json.JsonMapper;
import vn.memay.catalogue.BookImportDtos.*;
import static org.assertj.core.api.Assertions.*;

class BookImportV2Test {
    static final List<String> COLUMNS=List.of("ten_sach","isbn","nha_xuat_ban","tac_gia","the_loai","kieu_bia",
            "gia_tu","gia_den","trong_luong_g","tinh_trang","mo_ta_tinh_trang","do_tuoi","mo_ta_sach","trinh_do_doc","link_video","bo_suu_tap");
    final BookImportParser parser=new BookImportParser();
    final BookImportValidator validator=new BookImportValidator(new BookValidation());
    static Map<String,String> values() {
        var row=new LinkedHashMap<String,String>();COLUMNS.forEach(k->row.put(k,""));
        row.putAll(Map.of("ten_sach","Sách mẫu", "isbn","000123", "the_loai"," Board Book ",
                "gia_tu","21000","gia_den","25000","trong_luong_g","300","tinh_trang","Độ mới cao","mo_ta_tinh_trang","Bìa đẹp"));return row;
    }
    static Map<String,String> change(Map<String,String> original,String key,String value) {var row=new LinkedHashMap<>(original);row.put(key,value);return row;}
    static byte[] csv(List<Map<String,String>> rows,List<String> headers) {
        try(var writer=new StringWriter();var printer=CSVFormat.RFC4180.print(writer)) {
            printer.printRecord(headers);for(var row:rows)printer.printRecord(headers.stream().map(k->row.getOrDefault(k,"")).toList());
            return writer.toString().getBytes(StandardCharsets.UTF_8);
        } catch(IOException e){throw new UncheckedIOException(e);}
    }
    static byte[] workbook(List<Map<String,String>> rows,Consumer<XSSFSheet> change)throws Exception {
        try(var input=BookImportV2Test.class.getResourceAsStream("/fixtures/book-import-v2.xlsx");var book=new XSSFWorkbook(input);var out=new ByteArrayOutputStream()) {
            var sheet=book.getSheet("Sach");int n=1;
            for(var values:rows){var row=sheet.createRow(n++);for(int c=0;c<16;c++)row.createCell(c).setCellValue(values.getOrDefault(COLUMNS.get(c),""));}
            change.accept(sheet);book.write(out);return out.toByteArray();
        }
    }
    ImportDocument read(byte[] data,String extension){return validator.normalize(parser.parse("owner."+extension,data));}
    static int version(ImportDocument doc){return new JsonMapper().valueToTree(doc).path("schemaVersion").asInt();}

    @Test void ownerWorkbookDefaultsToEnglishAndOneUnnamedCopy()throws Exception {
        var row=change(change(values(),"do_tuoi","0-3; 4-6"),"trinh_do_doc"," Starters · Pre A1 ");
        var doc=read(workbook(List.of(row),s->{}),"xlsx");
        assertThat(doc.issues()).isEmpty();assertThat(version(doc)).isEqualTo(2);assertThat(doc.groups()).hasSize(1);
        var write=doc.groups().getFirst().write();assertThat(write.language()).isEqualTo("Tiếng Anh");
        assertThat(write.variants()).containsExactly(new BookDtos.VariantWrite(null,null,1L));
        assertThat(write.isbn()).isEqualTo("000123");assertThat(write.categoryCode()).isEqualTo("BOARD_BOOK");
        assertThat(write.conditionGrade()).isEqualTo("HIGH_FRESHNESS");assertThat(write.ageGroups()).containsExactly("AGE_0_3","AGE_4_6");
        assertThat(write.readingLevel()).isEqualTo("PRE_A1");assertThat(doc.groups().getFirst().rows()).containsExactly(2);
    }
    @Test void fingerprintsIgnoreFileHeaderRowOrderAndLabelSpellingButKeepDuplicateRows()throws Exception {
        var a=values();var b=change(a,"ten_sach","Another title");
        var doc=read(workbook(List.of(a,b,a),s->{}),"xlsx");
        assertThat(doc.issues()).isEmpty();assertThat(doc.groups()).hasSize(3);
        var headers=new ArrayList<>(COLUMNS);Collections.reverse(headers);
        var codes=change(change(a,"the_loai","board_book"),"tinh_trang"," high_freshness ");
        var reordered=read(csv(List.of(change(codes,"ten_sach","Another title"),codes,codes),headers),"csv");
        assertThat(reordered.issues()).isEmpty();assertThat(reordered.fingerprint()).isEqualTo(doc.fingerprint());
        assertThat(read(csv(List.of(a,b),COLUMNS),"csv").fingerprint()).isNotEqualTo(doc.fingerprint());
    }
    @Test void acceptsEveryOwnerDropdownLabel() {
        var categories=Map.of("Picture Book","PICTURE_BOOK","Board Book","BOARD_BOOK","Chapter","CHAPTER",
                "Bách khoa toàn thư & khoa học","ENCYCLOPEDIA_SCIENCE","Lịch sử","HISTORY","Tuyển tập truyện","STORY_COLLECTION");
        categories.forEach((label,code)->{
            var row=change(values(),"the_loai",label.toLowerCase(Locale.ROOT));if(code.equals("PICTURE_BOOK"))row.put("kieu_bia","Paperback");
            var doc=read(csv(List.of(row),COLUMNS),"csv");assertThat(doc.issues()).as(label).isEmpty();assertThat(doc.groups().getFirst().write().categoryCode()).isEqualTo(code);
        });
        for(var entry:Map.of("Paperback","PAPERBACK","Hardcover","HARDCOVER").entrySet()) {
            var doc=read(csv(List.of(change(change(values(),"the_loai","Picture Book"),"kieu_bia",entry.getKey())),COLUMNS),"csv");
            assertThat(doc.issues()).isEmpty();assertThat(doc.groups().getFirst().write().binding()).isEqualTo(entry.getValue());
        }
        var grades=Map.of("Độ mới cao","HIGH_FRESHNESS","Có lỗi nhẹ","MINOR_FLAWS");
        grades.forEach((label,code)->assertThat(read(csv(List.of(change(values(),"tinh_trang",label)),COLUMNS),"csv").groups().getFirst().write().conditionGrade()).isEqualTo(code));
        var ages=Map.of("0-3","AGE_0_3","4-6","AGE_4_6","7-9","AGE_7_9","10+","AGE_10_PLUS");
        ages.forEach((label,code)->assertThat(read(csv(List.of(change(values(),"do_tuoi",label)),COLUMNS),"csv").groups().getFirst().write().ageGroups()).containsExactly(code));
        var levels=Map.of("Starters · Pre A1","PRE_A1","Movers · A1","A1","Flyers / Key · A2","A2","Preliminary · B1","B1","First · B2","B2","Advanced · C1","C1","Proficiency · C2","C2");
        levels.forEach((label,code)->assertThat(read(csv(List.of(change(values(),"trinh_do_doc",label)),COLUMNS),"csv").groups().getFirst().write().readingLevel()).isEqualTo(code));
    }
    @Test void acceptsTheTwoRequestedCategoriesByNameAndCode() {
        for(var entry:Map.of("Tập đọc","READING_PRACTICE","Nấu ăn - thủ công - activity book","COOKING_CRAFT_ACTIVITY").entrySet()) {
            for(String value:List.of(entry.getKey(),entry.getValue())) {
                var doc=read(csv(List.of(change(values(),"the_loai",value)),COLUMNS),"csv");
                assertThat(doc.issues()).as(value).isEmpty();assertThat(doc.groups().getFirst().write().categoryCode()).isEqualTo(entry.getValue());
            }
        }
    }
    @Test void reportsMissingRequiredAndUnknownLabelsWithoutGuessing() {
        for(String column:List.of("ten_sach","the_loai","gia_tu","gia_den","trong_luong_g","tinh_trang","mo_ta_tinh_trang")) {
            var doc=read(csv(List.of(change(values(),column,"")),COLUMNS),"csv");assertThat(doc.fingerprint()).isNull();assertThat(doc.issues()).extracting(ImportIssue::column).contains(column);
        }
        for(String column:List.of("the_loai","tinh_trang","do_tuoi","trinh_do_doc","kieu_bia"))
            assertThat(read(csv(List.of(change(values(),column,"not a known label")),COLUMNS),"csv").issues()).extracting(ImportIssue::column).contains(column);
        assertThat(read(csv(List.of(change(values(),"kieu_bia","Paperback")),COLUMNS),"csv").issues()).extracting(ImportIssue::column).contains("kieu_bia");
        assertThat(read(csv(List.of(change(values(),"do_tuoi","0-3;AGE_0_3")),COLUMNS),"csv").issues()).extracting(ImportIssue::column).contains("do_tuoi");
        assertThat(read(csv(List.of(values()),COLUMNS),"csv").issues()).isEmpty();
    }
    @Test void limitsV2ToOneHundredBooksAndRejectsExtraOrDuplicateHeaders()throws Exception {
        assertThat(read(csv(Collections.nCopies(100,values()),COLUMNS),"csv").groups()).hasSize(100);
        assertThatThrownBy(()->read(csv(Collections.nCopies(101,values()),COLUMNS),"csv")).isInstanceOfSatisfying(BookImportException.class,e->assertThat(e.status).isEqualTo(413));
        var duplicate=new ArrayList<>(COLUMNS);duplicate.set(1,"kieu_bia (nếu là picture book)");
        assertThatThrownBy(()->parser.parse("a.csv",csv(List.of(values()),duplicate))).isInstanceOf(BookImportException.class);
        var unknown=new ArrayList<>(COLUMNS);unknown.set(1,"ten_tuy_y");
        assertThatThrownBy(()->parser.parse("a.csv",csv(List.of(values()),unknown))).isInstanceOf(BookImportException.class);
        var extra=new ArrayList<>(COLUMNS);extra.add("ton_kho");
        assertThatThrownBy(()->parser.parse("a.csv",csv(List.of(values()),extra))).isInstanceOf(BookImportException.class);
    }
    @Test void xlsxRejectsDataOutsideItsHeadersAndDoesNotEvaluateFormulas()throws Exception {
        var formula=read(workbook(List.of(values()),s->s.getRow(1).getCell(6).setCellFormula("21000+1")),"xlsx");
        assertThat(formula.issues()).extracting(ImportIssue::column).contains("gia_tu");assertThat(formula.fingerprint()).isNull();
        var extra=read(workbook(List.of(values()),s->s.getRow(1).createCell(16).setCellValue("not in headers")),"xlsx");
        assertThat(extra.issues()).isNotEmpty();assertThat(extra.fingerprint()).isNull();
    }
    @Test void legacyDigestAndGroupingRemainUnchanged() {
        var doc=validator.normalize(List.of(BookImportValidationTest.row(2,"A","","1")));
        assertThat(doc.fingerprint()).isEqualTo("7eeb28ad04e84becf333f10f1960783d696d9eb76fbe63417e340d3699f992fc");
        assertThat(doc.groups().getFirst().key()).isEqualTo("A");
    }
    @Test void privateTemplateApiNowProducesTheSixteenColumnFormat()throws Exception {
        var options=new ImportOptions(new vn.memay.taxonomy.TaxonomyDtos.Taxonomy(List.of(),List.of(),List.of(),List.of()),List.of());
        var bytes=new BookImportTemplate().render("xlsx",options);
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            assertThat(book.getSheet("Sach").getRow(0).getLastCellNum()).isEqualTo((short)16);
        }
        assertThat(parser.parse("a.xlsx",bytes)).isEmpty();
    }
}
