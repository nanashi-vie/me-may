package vn.memay.catalogue;

import org.apache.poi.openxml4j.opc.*;
import org.apache.poi.openxml4j.util.ZipSecureFile;
import org.apache.poi.xssf.eventusermodel.XSSFReader;
import org.apache.poi.xssf.model.*;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.util.XMLHelper;
import org.xml.sax.*;
import org.xml.sax.helpers.DefaultHandler;
import java.io.*;
import java.math.BigDecimal;
import java.nio.file.*;
import java.util.*;
import vn.memay.catalogue.BookImportDtos.*;

final class BookImportXlsxReader {
    private static final long MAX_XML=20L*1024*1024;
    static {
        ZipSecureFile.setMaxEntrySize(MAX_XML);ZipSecureFile.setMaxTextSize(MAX_XML);
        ZipSecureFile.setMaxFileCount(100);ZipSecureFile.setMinInflateRatio(.01);
    }
    List<CellRow> read(byte[] bytes) throws Exception {
        Path file=Files.createTempFile("memay-import-",".xlsx");
        try {
            Files.write(file,bytes);preflight(file);
            try(var pkg=OPCPackage.open(file.toFile(),PackageAccess.READ)) {
                for(var relation:pkg.getRelationships()) if(relation.getTargetMode()==TargetMode.EXTERNAL)bad("Không nhận liên kết ngoài.");
                for(var part:pkg.getParts()) {
                    String contentType=part.getContentType().toLowerCase(Locale.ROOT);
                    if(contentType.contains("macroenabled") || contentType.contains("vba") || contentType.contains("oleobject"))bad("Không nhận workbook macro hoặc đối tượng nhúng.");
                    if(!part.isRelationshipPart())for(var relation:part.getRelationships())if(relation.getTargetMode()==TargetMode.EXTERNAL)bad("Không nhận liên kết ngoài; dán URL dạng text.");
                }
                var reader=new XSSFReader(pkg);var strings=reader.getSharedStringsTable();var styles=reader.getStylesTable();
                var sheets=reader.getSheetIterator();var rows=new ArrayList<CellRow>();var seen=new HashSet<String>();int cells=0;
                while(sheets.hasNext())try(var stream=sheets.next()) {
                    String name=sheets.getSheetName();
                    if(!Set.of("Sach","HuongDan").contains(name) || !seen.add(name))bad("Workbook chỉ có sheet Sach và HuongDan, không trùng tên.");
                    var handler=new SheetHandler(name,strings,styles,20000-cells);parse(stream,handler);cells+=handler.cellCount;
                    if(name.equals("Sach"))rows.addAll(handler.rows);
                }
                if(!seen.contains("Sach"))bad("Thiếu sheet Sach.");return List.copyOf(rows);
            }
        } finally { Files.deleteIfExists(file); }
    }
    private static void preflight(Path file) throws Exception {
        long total=0;int count=0;int[] stringsAndStyles={0,0};
        try(var zip=new ZipSecureFile(file.toFile())) {
            var entries=zip.getEntries();var names=new HashSet<String>();
            while(entries.hasMoreElements()) {
                var e=entries.nextElement();String name=e.getName();
                if(++count>100 || !names.add(name) || e.getSize()>MAX_XML || name.contains(".."))bad("Cấu trúc ZIP không hợp lệ hoặc vượt giới hạn.");
                if(name.toLowerCase(Locale.ROOT).matches(".*(vbaproject|embeddings/|activex/|externallinks/).*"))bad("Không nhận macro, đối tượng nhúng hoặc liên kết workbook.");
                try(var in=zip.getInputStream(e)) {
                    byte[] buffer=new byte[8192];int n;
                    while((n=in.read(buffer))!=-1){total+=n;if(total>MAX_XML)limit("Tổng dữ liệu giải nén tối đa 20 MiB.");}
                }
                if(name.endsWith(".xml") || name.endsWith(".rels"))try(var in=zip.getInputStream(e)) {
                    parse(in,new DefaultHandler() {
                        int nodes=0, cellText=0;boolean scalar;
                        @Override public void startElement(String uri,String local,String q,Attributes a) {
                            if(++nodes>150000)limit("XML quá phức tạp.");
                            if(local.equals("si") && ++stringsAndStyles[0]>20000)limit("Tối đa 20000 shared strings.");
                            if(local.equals("xf") && ++stringsAndStyles[1]>20000)limit("Tối đa 20000 styles.");
                            if(local.equals("t") || local.equals("v")){cellText=0;scalar=true;}
                        }
                        @Override public void endElement(String uri,String local,String q) {if(local.equals("t") || local.equals("v"))scalar=false;}
                        @Override public void characters(char[] ch,int start,int length) { if(scalar){cellText+=length;if(cellText>10000)limit("Nội dung XML/ô vượt giới hạn.");} }
                    });
                }
            }
        }
    }
    private static void parse(InputStream in,DefaultHandler handler) throws Exception {
        var reader=XMLHelper.newXMLReader();reader.setFeature("http://apache.org/xml/features/disallow-doctype-decl",true);
        reader.setErrorHandler(new DefaultHandler() {
            @Override public void error(SAXParseException e) throws SAXException {throw e;}
            @Override public void fatalError(SAXParseException e) throws SAXException {throw e;}
        });
        reader.setContentHandler(handler);reader.setEntityResolver((publicId,systemId)->{throw new SAXException("external_entity");});
        reader.parse(new InputSource(in));
    }
    private static void bad(String message) { throw BookImportException.file(422,"xlsx_invalid",message); }
    private static void limit(String message) { throw BookImportException.file(413,"xlsx_limit",message); }

    private static final class SheetHandler extends DefaultHandler {
        final String sheet;final SharedStrings strings;final StylesTable styles;final int budget;
        final List<CellRow> rows=new ArrayList<>();final List<String> headers=new ArrayList<>();
        final Map<Integer,String> values=new TreeMap<>();final List<ImportIssue> issues=new ArrayList<>();
        final StringBuilder text=new StringBuilder();int row,col,cellCount,style;String type;boolean formula,capture;
        SheetHandler(String sheet,SharedStrings strings,StylesTable styles,int budget) { this.sheet=sheet;this.strings=strings;this.styles=styles;this.budget=budget; }
        @Override public void startElement(String uri,String local,String q,Attributes a) {
            if(local.equals("mergeCell") && sheet.equals("Sach"))bad("Không gộp ô trong sheet Sach.");
            if(local.equals("row")) {row=Integer.parseInt(a.getValue("r"));values.clear();issues.clear();}
            if(local.equals("c")) {
                if(++cellCount>budget)limit("Tối đa 20000 ô toàn workbook.");
                String ref=a.getValue("r");if(ref==null || !ref.matches("[A-Z]{1,3}"+row))bad("Địa chỉ ô không hợp lệ.");
                int n=0;for(char ch:ref.replaceAll("[0-9]","").toCharArray())n=n*26+ch-'A'+1;col=n-1;
                if(col>=20 && sheet.equals("Sach"))bad("Sheet Sach chỉ có 20 cột theo mẫu.");
                if(values.containsKey(col))bad("Ô bị trùng.");
                type=a.getValue("t");style=a.getValue("s")==null?0:Integer.parseInt(a.getValue("s"));formula=false;text.setLength(0);
            }
            if(local.equals("f"))formula=true;
            if(local.equals("v") || local.equals("t"))capture=true;
        }
        @Override public void characters(char[] ch,int start,int length) {
            if(capture) {text.append(ch,start,length);if(text.length()>10000)limit("Tối đa 10000 ký tự mỗi ô.");}
        }
        @Override public void endElement(String uri,String local,String q) {
            if(local.equals("v") || local.equals("t"))capture=false;
            if(local.equals("c")) {
                String value=text.toString();String problem=null;
                if(formula)problem="Không nhận công thức, kể cả công thức đã có kết quả.";
                else if("s".equals(type)) {
                    try {value=strings.getItemAt(Integer.parseInt(value)).getString();if(value.length()>10000)limit("Tối đa 10000 ký tự mỗi ô.");}
                    catch(BookImportException e){throw e;}catch(Exception e){bad("Shared string không tồn tại.");}
                } else if(!value.isBlank() && !"inlineStr".equals(type) && !"str".equals(type)) {
                    if(type!=null && !type.equals("n"))problem="Ô phải là text hoặc số nguyên hợp lệ; không date/boolean/error.";
                    else try {
                        if(styles!=null && DateUtil.isADateFormat(styles.getStyleAt(style).getDataFormat(),styles.getStyleAt(style).getDataFormatString()))throw new IllegalArgumentException();
                        long n=new BigDecimal(value).longValueExact();if(n<0 || n>9007199254740991L)throw new IllegalArgumentException();
                        if(row==1 || (col<headers.size() && Set.of("isbn","nhom_sach").contains(headers.get(col))))problem="Nhập ô dạng text để giữ nguyên mã và số 0 đầu.";
                        else if(col<headers.size() && !Set.of("gia_tu","gia_den","trong_luong_g","ton_kho").contains(headers.get(col)))problem="Cột này cần text.";
                        value=Long.toString(n);
                    } catch(Exception e) {problem="Ô số không nguyên, mất độ chính xác, ngày hoặc vượt giới hạn.";}
                }
                if(problem!=null) {
                    if(row==1 || !sheet.equals("Sach"))bad(problem);
                    issues.add(new ImportIssue(sheet,row,col<headers.size()?headers.get(col):"file","cell_type",problem));value="";
                }
                values.put(col,value);
            }
            if(local.equals("row") && sheet.equals("Sach")) {
                if(row==1) {
                    for(int i=0;i<20;i++)headers.add(values.getOrDefault(i,"").trim());BookImportParser.checkHeaders(headers);
                } else if(!issues.isEmpty() || values.values().stream().anyMatch(v->!v.isBlank())) {
                    if(headers.isEmpty())bad("Thiếu hàng tiêu đề số 1.");if(rows.size()>=500)limit("Tối đa 500 dòng dữ liệu.");
                    var mapped=new LinkedHashMap<String,String>();for(int i=0;i<20;i++)mapped.put(headers.get(i),values.getOrDefault(i,""));
                    rows.add(new CellRow(sheet,row,mapped,List.copyOf(issues)));
                }
            }
        }
    }
}
