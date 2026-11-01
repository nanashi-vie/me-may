package vn.memay.catalogue;

import java.util.*;

public final class BookImportSchema {
    private BookImportSchema() {}
    public static final int VERSION=1, MAX_BYTES=2*1024*1024, MAX_ROWS=500, MAX_BOOKS=100,
            MAX_VARIANTS=100, MAX_ISSUES=1000, MAX_CELL=10000;
    public static final List<String> HEADERS=List.of("nhom_sach","ten_sach","isbn","nha_xuat_ban","tac_gia",
            "ngon_ngu","the_loai","kieu_bia","gia_tu","gia_den","trong_luong_g","tinh_trang",
            "mo_ta_tinh_trang","do_tuoi","mo_ta_sach","trinh_do_doc","link_video","bo_suu_tap","bien_the","ton_kho");
    public static final List<String> V2_HEADERS=List.of("ten_sach","isbn","nha_xuat_ban","tac_gia","the_loai","kieu_bia",
            "gia_tu","gia_den","trong_luong_g","tinh_trang","mo_ta_tinh_trang","do_tuoi","mo_ta_sach","trinh_do_doc","link_video","bo_suu_tap");
    public static int version(List<String> headers) {
        var set=new HashSet<>(headers);
        if(headers.size()==20 && set.size()==20 && set.equals(new HashSet<>(HEADERS)))return 1;
        if(headers.size()==16 && set.size()==16 && set.equals(new HashSet<>(V2_HEADERS)))return 2;
        throw BookImportException.file(422,"headers","File cần đúng 16 cột V2 (hoặc 20 cột V1), không cột lạ, thiếu hoặc trùng.");
    }
    public static List<String> canonicalHeaders(List<String> input) {
        var trimmed=input.stream().map(String::trim).toList();
        if(trimmed.size()==20){version(trimmed);return trimmed;}
        var headers=trimmed.stream().map(h->h.equals("kieu_bia (nếu là picture book)")?"kieu_bia":h).toList();
        version(headers);return headers;
    }
    private static Map<String,String> labels(Map<String,String> aliases) {
        var result=new HashMap<String,String>();aliases.forEach((label,code)->{result.put(label.toLowerCase(Locale.ROOT),code);result.put(code.toLowerCase(Locale.ROOT),code);});return Map.copyOf(result);
    }
    private static final Map<String,Map<String,String>> LABELS=Map.of(
            "the_loai",labels(Map.of("Board Book","BOARD_BOOK","Picture Book","PICTURE_BOOK","Chapter","CHAPTER",
                    "Bách khoa toàn thư & khoa học","ENCYCLOPEDIA_SCIENCE","Lịch sử","HISTORY","Tuyển tập truyện","STORY_COLLECTION",
                    "Tập đọc","READING_PRACTICE","Nấu ăn - thủ công - activity book","COOKING_CRAFT_ACTIVITY")),
            "kieu_bia",labels(Map.of("Paperback","PAPERBACK","Hardcover","HARDCOVER")),
            "tinh_trang",labels(Map.of("Độ mới cao","HIGH_FRESHNESS","Có lỗi nhẹ","MINOR_FLAWS")),
            "do_tuoi",labels(Map.of("0-3","AGE_0_3","0–3","AGE_0_3","4-6","AGE_4_6","4–6","AGE_4_6","7-9","AGE_7_9","7–9","AGE_7_9","10+","AGE_10_PLUS")),
            "trinh_do_doc",labels(Map.of("Starters · Pre A1","PRE_A1","Movers · A1","A1","Flyers / Key · A2","A2",
                    "Preliminary · B1","B1","First · B2","B2","Advanced · C1","C1","Proficiency · C2","C2")));
    static String normalizeLabel(String column,String value) {
        String text=BookValidation.trim(value);if(text==null)return null;
        return LABELS.getOrDefault(column,Map.of()).getOrDefault(text.toLowerCase(Locale.ROOT),text);
    }
    public static final Map<String,String> FIELDS=Map.ofEntries(Map.entry("title","ten_sach"),Map.entry("isbn","isbn"),
            Map.entry("publisher","nha_xuat_ban"),Map.entry("author","tac_gia"),Map.entry("language","ngon_ngu"),
            Map.entry("categoryCode","the_loai"),Map.entry("binding","kieu_bia"),Map.entry("priceMinVnd","gia_tu"),
            Map.entry("priceMaxVnd","gia_den"),Map.entry("weightG","trong_luong_g"),Map.entry("conditionGrade","tinh_trang"),
            Map.entry("conditionNote","mo_ta_tinh_trang"),Map.entry("ageGroups","do_tuoi"),Map.entry("description","mo_ta_sach"),
            Map.entry("readingLevel","trinh_do_doc"),Map.entry("readingVideoUrl","link_video"),Map.entry("collectionIds","bo_suu_tap"),
            Map.entry("variants","bien_the"));
    public static final Set<String> CATEGORIES=Set.of("BOARD_BOOK","PICTURE_BOOK","ENCYCLOPEDIA_SCIENCE","HISTORY","CHAPTER","STORY_COLLECTION","READING_PRACTICE","COOKING_CRAFT_ACTIVITY");
}
