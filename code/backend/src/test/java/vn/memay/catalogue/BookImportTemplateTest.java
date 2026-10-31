package vn.memay.catalogue;

import org.junit.jupiter.api.Test;
import org.apache.poi.xssf.usermodel.*;
import org.apache.poi.common.usermodel.HyperlinkType;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.function.Consumer;
import vn.memay.catalogue.BookImportDtos.*;
import vn.memay.taxonomy.TaxonomyDtos.*;
import static org.assertj.core.api.Assertions.*;

class BookImportTemplateTest {
    final BookImportParser parser=new BookImportParser();
    final BookImportValidator validator=new BookImportValidator(new BookValidation());
    static byte[] workbook(Consumer<XSSFSheet> mutate) throws IOException {
        try(var book=new XSSFWorkbook();var out=new ByteArrayOutputStream()) {
            var sheet=book.createSheet("Sach");var header=sheet.createRow(0);var data=sheet.createRow(1);
            var values=BookImportValidationTest.row(2,"A","","1").cells();
            for(int i=0;i<20;i++){header.createCell(i).setCellValue(BookImportSchema.HEADERS.get(i));data.createCell(i).setCellValue(values.get(BookImportSchema.HEADERS.get(i)));}
            mutate.accept(sheet);book.write(out);return out.toByteArray();
        }
    }
    @Test void templatesContainNoImportableExampleRows() throws Exception {
        var options=new ImportOptions(new Taxonomy(List.of(new Option("BOARD_BOOK","Board book",0)),List.of(),List.of(),List.of()),List.of(new CollectionOption("moi-ve","Mới về")));
        var template=new BookImportTemplate();
        for(String format:List.of("csv","xlsx"))assertThat(parser.parse("template."+format,template.render(format,options))).isEmpty();
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(template.render("xlsx",options)))) {
            assertThat(book.getSheet("HuongDan")).isNotNull();
            assertThat(book.getSheet("Sach").getColumnStyle(2).getDataFormatString()).isEqualTo("@");
        }
    }
    @Test void formulaCachedValuesAreNeverAccepted() throws Exception {
        var bytes=workbook(sheet->sheet.getRow(1).getCell(19).setCellFormula("1+1"));
        var doc=validator.normalize(parser.parse("a.xlsx",bytes));
        assertThat(doc.issues()).extracting(ImportIssue::column).contains("ton_kho");assertThat(doc.fingerprint()).isNull();
    }
    @Test void rejectsDateBooleanAndNumericIdentifiersButAcceptsExactNumericPrice() throws Exception {
        var numeric=validator.normalize(parser.parse("a.xlsx",workbook(s->s.getRow(1).getCell(8).setCellValue(21000))));
        assertThat(numeric.issues()).isEmpty();assertThat(numeric.groups().getFirst().write().priceMinVnd()).isEqualTo(21000L);
        var bad=validator.normalize(parser.parse("a.xlsx",workbook(s->{s.getRow(1).getCell(2).setCellValue(123);s.getRow(1).getCell(19).setCellValue(true);}))); 
        assertThat(bad.issues()).extracting(ImportIssue::column).contains("isbn","ton_kho");
        var dates=validator.normalize(parser.parse("a.xlsx",workbook(s->{var c=s.getRow(1).getCell(10);c.setCellValue(new Date());var style=s.getWorkbook().createCellStyle();style.setDataFormat((short)14);c.setCellStyle(style);}))); 
        assertThat(dates.issues()).extracting(ImportIssue::column).contains("trong_luong_g");
    }
    @Test void rejectsMergedCellsHyperlinksAndExtraSheets() throws Exception {
        assertThatThrownBy(()->parser.parse("a.xlsx",workbook(s->s.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(1,1,0,1))))).isInstanceOf(BookImportException.class);
        assertThatThrownBy(()->parser.parse("a.xlsx",workbook(s->{var h=s.getWorkbook().getCreationHelper().createHyperlink(HyperlinkType.URL);h.setAddress("https://example.test");s.getRow(1).getCell(0).setHyperlink(h);}))).isInstanceOf(BookImportException.class);
        assertThatThrownBy(()->parser.parse("a.xlsx",workbook(s->s.getWorkbook().createSheet("Khac").createRow(0).createCell(0).setCellValue("data")))).isInstanceOf(BookImportException.class);
    }
    @Test void rejectsOversizedExpandedXmlAndExternalEntities() throws Exception {
        var zip=BookImportParserTest.zip(Map.of("x.xml","<x>"+"a".repeat(21*1024*1024)+"</x>"));
        assertThatThrownBy(()->parser.parse("a.xlsx",zip)).isInstanceOf(BookImportException.class);
        var xxe=BookImportParserTest.zip(Map.of("x.xml","<!DOCTYPE x [<!ENTITY e SYSTEM 'file:///missing'>]><x>&e;</x>"));
        assertThatThrownBy(()->parser.parse("a.xlsx",xxe)).isInstanceOf(BookImportException.class);
        var entries=new LinkedHashMap<String,String>();for(int i=0;i<101;i++)entries.put("a"+i+".xml","<x/>");
        assertThatThrownBy(()->parser.parse("a.xlsx",BookImportParserTest.zip(entries))).isInstanceOf(BookImportException.class);
    }
    @Test void rejectsTooManyRowsAndLongCells() throws Exception {
        var values=BookImportValidationTest.row(2,"A","","1").cells();
        var csv=new String(BookImportParserTest.csv(values),StandardCharsets.UTF_8);
        String header=csv.substring(0,csv.indexOf('\n')+1),line=csv.substring(csv.indexOf('\n')+1);
        assertThatThrownBy(()->parser.parse("a.csv",(header+line.repeat(501)).getBytes(StandardCharsets.UTF_8))).isInstanceOf(BookImportException.class);
        var doc=validator.normalize(parser.parse("a.xlsx",workbook(s->s.getRow(1).getCell(14).setCellValue("x".repeat(10000)))));
        assertThat(doc.issues()).isEmpty();
        assertThatThrownBy(()->parser.parse("a.xlsx",workbook(s->s.getRow(1).getCell(14).setCellValue("x".repeat(10001))))).isInstanceOf(BookImportException.class);
    }
    @Test void boundsSharedStringCountBeforePoiMaterialization() throws Exception {
        var entries=new LinkedHashMap<String,String>();
        try(var zip=new java.util.zip.ZipInputStream(new ByteArrayInputStream(workbook(s->{})))) {
            java.util.zip.ZipEntry entry;while((entry=zip.getNextEntry())!=null)entries.put(entry.getName(),new String(zip.readAllBytes(),StandardCharsets.UTF_8));
        }
        var xml=new StringBuilder("<sst xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">");
        for(int i=0;i<20001;i++)xml.append("<si><t>value").append(i).append("</t></si>");
        entries.put("xl/extra.xml",xml.append("</sst>").toString());
        assertThatThrownBy(()->parser.parse("a.xlsx",BookImportParserTest.zip(entries)))
                .isInstanceOfSatisfying(BookImportException.class,e->assertThat(e.status).isEqualTo(413));
    }
    @Test void rejectsMacroWorkbookRenamedToXlsx() throws Exception {
        var bytes=workbook(s->s.getWorkbook().setWorkbookType(XSSFWorkbookType.XLSM));
        assertThatThrownBy(()->parser.parse("renamed.xlsx",bytes)).isInstanceOf(BookImportException.class);
    }
    @Test void rejectsMissingSharedStringAndExcessiveCellEvents() throws Exception {
        var entries=new LinkedHashMap<String,String>();
        try(var zip=new java.util.zip.ZipInputStream(new ByteArrayInputStream(workbook(s->{})))) {
            java.util.zip.ZipEntry entry;while((entry=zip.getNextEntry())!=null)entries.put(entry.getName(),new String(zip.readAllBytes(),StandardCharsets.UTF_8));
        }
        entries.computeIfPresent("xl/worksheets/sheet1.xml",(k,v)->v.replaceFirst("<v>0</v>","<v>99999999</v>"));
        assertThatThrownBy(()->parser.parse("a.xlsx",BookImportParserTest.zip(entries))).isInstanceOf(BookImportException.class);
        var many=workbook(s->{var guide=s.getWorkbook().createSheet("HuongDan");for(int i=0;i<20001;i++)guide.createRow(i).createCell(0).setCellValue("row"+i);});
        assertThatThrownBy(()->parser.parse("a.xlsx",many)).isInstanceOf(BookImportException.class);
        assertThatThrownBy(()->parser.parse("a.xlsx",BookImportParserTest.zip(Map.of("x.xml","<x>"+"a".repeat(500000)+"</x>")))).isInstanceOf(BookImportException.class);
    }
}
