package vn.memay.catalogue;

import org.junit.jupiter.api.Test;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.zip.*;
import static org.assertj.core.api.Assertions.*;

class BookImportParserTest {
    final BookImportParser parser=new BookImportParser();
    final BookImportValidator validator=new BookImportValidator(new BookValidation());
    static byte[] csv(Map<String,String> values) {
        String header=String.join(",",BookImportSchema.HEADERS);
        String line=BookImportSchema.HEADERS.stream().map(k->"\""+values.getOrDefault(k,"").replace("\"","\"\"")+"\"").collect(java.util.stream.Collectors.joining(","));
        return ("\ufeff"+header+"\r\n"+line+"\r\n").getBytes(StandardCharsets.UTF_8);
    }
    static String xml(String value) { return value.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace("\"","&quot;"); }
    static byte[] xlsx(Map<String,String> values,String extraCell) throws IOException {
        var entries=new LinkedHashMap<String,String>();
        entries.put("[Content_Types].xml","<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"><Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/><Default Extension=\"xml\" ContentType=\"application/xml\"/><Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/><Override PartName=\"/xl/worksheets/sheet1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/></Types>");
        entries.put("_rels/.rels","<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/></Relationships>");
        entries.put("xl/workbook.xml","<workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><sheets><sheet name=\"Sach\" sheetId=\"1\" r:id=\"rId1\"/></sheets></workbook>");
        entries.put("xl/_rels/workbook.xml.rels","<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet1.xml\"/></Relationships>");
        var sheet=new StringBuilder("<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\"><sheetData><row r=\"1\">");
        for(int i=0;i<20;i++)sheet.append("<c r=\"").append((char)('A'+i)).append("1\" t=\"inlineStr\"><is><t>").append(BookImportSchema.HEADERS.get(i)).append("</t></is></c>");
        sheet.append("</row><row r=\"2\">");
        for(int i=0;i<20;i++)sheet.append("<c r=\"").append((char)('A'+i)).append("2\" t=\"inlineStr\"><is><t>").append(xml(values.getOrDefault(BookImportSchema.HEADERS.get(i),""))).append("</t></is></c>");
        entries.put("xl/worksheets/sheet1.xml",sheet.append(extraCell).append("</row></sheetData></worksheet>").toString());
        return zip(entries);
    }
    static byte[] zip(Map<String,String> entries) throws IOException {
        var output=new ByteArrayOutputStream();try(var zip=new ZipOutputStream(output)) {
            for(var e:entries.entrySet()){zip.putNextEntry(new ZipEntry(e.getKey()));zip.write(e.getValue().getBytes(StandardCharsets.UTF_8));zip.closeEntry();}
        }return output.toByteArray();
    }
    @Test void csvAndXlsxProduceSameCanonicalFingerprint() throws Exception {
        var values=new LinkedHashMap<>(BookImportValidationTest.row(2,"A","","1").cells());
        values.put("mo_ta_sach","Dòng 1, \"chữ\"\nDòng 2");
        var csv=validator.normalize(parser.parse("books.csv",csv(values)));
        var xlsx=validator.normalize(parser.parse("books.xlsx",xlsx(values,"")));
        assertThat(csv.issues()).isEmpty();assertThat(xlsx.issues()).isEmpty();
        assertThat(csv.fingerprint()).isNotBlank().isEqualTo(xlsx.fingerprint());
        assertThat(csv.groups().getFirst().write().description()).isEqualTo("Dòng 1, \"chữ\"\nDòng 2");
        assertThat(xlsx.groups().getFirst().write().isbn()).isEqualTo("000123");
    }
    @Test void rejectsUnexpectedExtraColumn() throws Exception {
        var bytes=xlsx(BookImportValidationTest.row(2,"A","","1").cells(),"<c r=\"U2\"><f>1+1</f><v>2</v></c>");
        assertThatThrownBy(()->parser.parse("books.xlsx",bytes)).isInstanceOf(RuntimeException.class);
    }
    @Test void rejectsUnsupportedFilesAndMalformedHeaders() {
        for(String filename:List.of("a.xls","a.xlsm","a.txt","a.xlsx"))
            assertThatThrownBy(()->parser.parse(filename,"hello".getBytes(StandardCharsets.UTF_8))).isInstanceOf(RuntimeException.class);
        for(String value:List.of("ten_sach;gia_tu\na;1","a,a\nb,c","", "ten_sach\na"))
            assertThatThrownBy(()->parser.parse("a.csv",value.getBytes(StandardCharsets.UTF_8))).isInstanceOf(RuntimeException.class);
        assertThatThrownBy(()->parser.parse("a.csv",new byte[2097153])).isInstanceOf(RuntimeException.class);
        assertThatThrownBy(()->parser.parse("a.csv",new byte[]{(byte)0xc3,(byte)0x28})).isInstanceOf(RuntimeException.class);
    }
}
