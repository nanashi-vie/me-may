package vn.memay.catalogue;

import org.springframework.stereotype.Component;
import org.apache.commons.csv.CSVFormat;
import java.io.*;
import java.nio.*;
import java.nio.charset.*;
import java.util.*;
import vn.memay.catalogue.BookImportDtos.*;

@Component
public class BookImportParser {
    public List<CellRow> parse(String filename,byte[] bytes) {
        if(bytes==null || bytes.length==0) throw BookImportException.file(422,"empty_file","Chọn file có dữ liệu.");
        if(bytes.length>BookImportSchema.MAX_BYTES) throw BookImportException.file(413,"file_limit","File tối đa 2 MiB.");
        String name=filename==null?"":filename.toLowerCase(Locale.ROOT);
        try {
            if(name.endsWith(".xlsx")) return new BookImportXlsxReader().read(bytes);
            if(!name.endsWith(".csv")) throw BookImportException.file(422,"file_format","Dùng file mẫu .csv UTF-8 hoặc .xlsx.");
            String text=StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes)).toString();
            if(text.startsWith("\ufeff"))text=text.substring(1);
            try(var csv=CSVFormat.RFC4180.builder().setIgnoreEmptyLines(false).get().parse(new StringReader(text))) {
                var iterator=csv.iterator();if(!iterator.hasNext())throw BookImportException.file(422,"headers","Thiếu hàng tiêu đề.");
                List<String> headers=BookImportSchema.canonicalHeaders(iterator.next().toList());int version=BookImportSchema.version(headers);
                var rows=new ArrayList<CellRow>();
                while(iterator.hasNext()) {
                    var record=iterator.next();
                    if(record.toList().stream().allMatch(String::isBlank))continue;
                    int max=version==2?100:500;
                    if(rows.size()>=max)throw BookImportException.file(413,"row_limit","Tối đa "+max+" dòng dữ liệu.");
                    var issues=new ArrayList<ImportIssue>();
                    if(record.size()!=headers.size())issues.add(new ImportIssue("CSV",Math.toIntExact(record.getRecordNumber()),"file","columns","Số ô không khớp "+headers.size()+" cột tiêu đề."));
                    var cells=new LinkedHashMap<String,String>();
                    for(int i=0;i<headers.size();i++)cells.put(headers.get(i).trim(),i<record.size()?record.get(i):"");
                    rows.add(new CellRow("CSV",Math.toIntExact(record.getRecordNumber()),cells,issues,version));
                }
                return List.copyOf(rows);
            }
        } catch(BookImportException e) { throw e; }
        catch(Exception e) { throw BookImportException.file(422,"file_unreadable","Không đọc được file. Dùng mẫu chuẩn, kiểm tra UTF-8, dấu phẩy và dấu nháy."); }
    }
    static void checkHeaders(List<String> input) {
        BookImportSchema.canonicalHeaders(input);
    }
}
