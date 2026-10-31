package vn.memay.catalogue;

import org.springframework.stereotype.Component;
import java.util.*;
import vn.memay.catalogue.BookDtos.*;
import vn.memay.catalogue.BookImportDtos.*;

@Component
public class BookImportValidator {
    private final BookValidation validation;
    public BookImportValidator(BookValidation validation) { this.validation=validation; }

    public ImportDocument normalize(List<CellRow> input) {
        var errors=new ArrayList<ImportIssue>();
        var grouped=new TreeMap<String,List<CellRow>>();
        if(input.isEmpty()) issue(errors,null,"file","empty","File không có dữ liệu sách.");
        if(input.size()>BookImportSchema.MAX_ROWS) issue(errors,null,"file","limit","Tối đa 500 dòng dữ liệu.");
        for(var row:input) {
            var cells=new LinkedHashMap<String,String>();
            for(String column:BookImportSchema.HEADERS) cells.put(column,BookValidation.trim(row.cells().get(column)));
            var clean=new CellRow(row.sheet(),row.row(),cells);
            String key=cells.get("nhom_sach");
            if(key==null || !key.matches("[A-Za-z0-9_-]{1,50}")) issue(errors,clean,"nhom_sach","invalid","Dùng khóa nhóm 1–50 ký tự chữ/số ASCII, _ hoặc -.");
            grouped.computeIfAbsent(key==null?"":key,k->new ArrayList<>()).add(clean);
        }
        if(grouped.size()>BookImportSchema.MAX_BOOKS) issue(errors,null,"nhom_sach","limit","Tối đa 100 nhóm sách.");
        var groups=new ArrayList<ImportGroup>();
        for(var entry:grouped.entrySet()) {
            var rows=entry.getValue();var writes=new ArrayList<BookWrite>();var slugs=new ArrayList<List<String>>();
            if(rows.size()>BookImportSchema.MAX_VARIANTS) issue(errors,rows.getFirst(),"bien_the","limit","Tối đa 100 biến thể mỗi sách.");
            for(var row:rows) {
                var c=row.cells();
                c.forEach((key,value)->{if(value!=null && value.length()>BookImportSchema.MAX_CELL) issue(errors,row,key,"length","Tối đa 10000 ký tự mỗi ô.");});
                for(String key:List.of("ten_sach","ngon_ngu","the_loai","tinh_trang","mo_ta_tinh_trang"))
                    if(c.get(key)==null) issue(errors,row,key,"required","Chưa nhập trường bắt buộc.");
                if(c.get("the_loai")!=null && !BookImportSchema.CATEGORIES.contains(c.get("the_loai"))) issue(errors,row,"the_loai","invalid","Mã thể loại không hợp lệ.");
                if(c.get("tinh_trang")!=null && !Set.of("HIGH_FRESHNESS","MINOR_FLAWS").contains(c.get("tinh_trang"))) issue(errors,row,"tinh_trang","invalid","Dùng HIGH_FRESHNESS hoặc MINOR_FLAWS.");
                var variants=List.of(new VariantWrite(null,c.get("bien_the"),number(c.get("ton_kho"),0,999999,"ton_kho",row,errors)));
                var write=new BookWrite(c.get("ten_sach"),c.get("isbn"),c.get("nha_xuat_ban"),c.get("tac_gia"),c.get("ngon_ngu"),
                        c.get("kieu_bia"),c.get("tinh_trang"),c.get("mo_ta_tinh_trang"),number(c.get("gia_tu"),1,999999999999L,"gia_tu",row,errors),
                        number(c.get("gia_den"),1,999999999999L,"gia_den",row,errors),number(c.get("trong_luong_g"),1,9007199254740991L,"trong_luong_g",row,errors),
                        c.get("mo_ta_sach"),c.get("the_loai"),split(c.get("do_tuoi")),c.get("trinh_do_doc"),c.get("link_video"),List.of(),variants);
                validation.metadataErrors(write).forEach((field,messages)->messages.forEach(message->issue(errors,row,BookImportSchema.FIELDS.getOrDefault(field,field),"required",message)));
                validation.writeErrors(write).forEach((field,messages)->messages.forEach(message->issue(errors,row,BookImportSchema.FIELDS.getOrDefault(field,field),"invalid",message)));
                if(c.get("bien_the")!=null && c.get("bien_the").length()>100) issue(errors,row,"bien_the","length","Tối đa 100 ký tự.");
                var collections=split(c.get("bo_suu_tap"));slugs.add(collections);
                if(collections.size()>100 || new HashSet<>(collections).size()!=collections.size() || collections.stream().anyMatch(s->s.isBlank() || s.length()>200))
                    issue(errors,row,"bo_suu_tap","invalid","Bộ sưu tập không hợp lệ hoặc trùng.");
                writes.add(write);
            }
            var first=writes.getFirst();var firstCommon=common(first,slugs.getFirst());
            for(int i=1;i<writes.size();i++) {
                var other=common(writes.get(i),slugs.get(i));
                firstCommon.forEach((column,value)->{if(!Objects.equals(value,other.get(column))) {
                    issue(errors,rows.getFirst(),column,"group_mismatch","Thông tin chung không khớp trong nhóm.");
                }});
                for(var column:firstCommon.keySet()) if(!Objects.equals(firstCommon.get(column),other.get(column)))
                    issue(errors,rows.get(i),column,"group_mismatch","Thông tin chung không khớp trong nhóm.");
            }
            var names=new HashSet<String>();var variants=new ArrayList<VariantWrite>();
            for(int i=0;i<writes.size();i++) {
                var v=writes.get(i).variants().getFirst();variants.add(v);
                if(rows.size()>1 && v.name()==null) issue(errors,rows.get(i),"bien_the","required","Đặt tên cho từng biến thể.");
                if(v.name()!=null && !names.add(v.name().toLowerCase(Locale.ROOT))) issue(errors,rows.get(i),"bien_the","duplicate","Tên biến thể bị trùng.");
            }
            variants.sort(Comparator.comparing(VariantWrite::name,Comparator.nullsFirst(Comparator.naturalOrder())));
            groups.add(new ImportGroup(entry.getKey(),withVariants(first,variants),slugs.getFirst(),rows.stream().map(CellRow::row).toList()));
        }
        return new ImportDocument(List.copyOf(groups),List.copyOf(errors.subList(0,Math.min(errors.size(),1000))),errors.size(),input.size(),errors.isEmpty()?BookImportFingerprint.digest(groups):null);
    }
    private static void issue(List<ImportIssue> errors,CellRow row,String column,String code,String message) {
        errors.add(new ImportIssue(row==null?null:row.sheet(),row==null?null:row.row(),column,code,message));
    }
    private static Long number(String value,long min,long max,String column,CellRow row,List<ImportIssue> errors) {
        try { if(value==null || !value.matches("[0-9]+")) throw new NumberFormatException();
            long n=Long.parseLong(value);if(n<min || n>max) throw new NumberFormatException();return n;
        } catch(NumberFormatException e) { issue(errors,row,column,"number","Nhập số nguyên từ "+min+" đến "+max+", không dấu phân nhóm.");return null; }
    }
    private static List<String> split(String value) { return value==null?List.of():Arrays.stream(value.split(";",-1)).map(String::trim).sorted().toList(); }
    private static Map<String,Object> common(BookWrite w,List<String> slugs) {
        var map=new LinkedHashMap<String,Object>();
        Object[] values={w.title(),w.isbn(),w.publisher(),w.author(),w.language(),w.categoryCode(),w.binding(),w.priceMinVnd(),w.priceMaxVnd(),w.weightG(),w.conditionGrade(),w.conditionNote(),w.ageGroups(),w.description(),w.readingLevel(),w.readingVideoUrl(),slugs};
        for(int i=0;i<values.length;i++) map.put(BookImportSchema.HEADERS.get(i+1),values[i]);
        return map;
    }
    public static BookWrite withVariants(BookWrite w,List<VariantWrite> variants) { return new BookWrite(w.title(),w.isbn(),w.publisher(),w.author(),w.language(),w.binding(),w.conditionGrade(),w.conditionNote(),w.priceMinVnd(),w.priceMaxVnd(),w.weightG(),w.description(),w.categoryCode(),w.ageGroups(),w.readingLevel(),w.readingVideoUrl(),w.collectionIds(),List.copyOf(variants)); }
    public static BookWrite withCollections(BookWrite w,List<String> ids) { return new BookWrite(w.title(),w.isbn(),w.publisher(),w.author(),w.language(),w.binding(),w.conditionGrade(),w.conditionNote(),w.priceMinVnd(),w.priceMaxVnd(),w.weightG(),w.description(),w.categoryCode(),w.ageGroups(),w.readingLevel(),w.readingVideoUrl(),ids,w.variants()); }
}
