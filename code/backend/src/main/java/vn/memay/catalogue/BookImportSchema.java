package vn.memay.catalogue;

import java.util.*;

public final class BookImportSchema {
    private BookImportSchema() {}
    public static final int VERSION=1, MAX_BYTES=2*1024*1024, MAX_ROWS=500, MAX_BOOKS=100,
            MAX_VARIANTS=100, MAX_ISSUES=1000, MAX_CELL=10000;
    public static final List<String> HEADERS=List.of("nhom_sach","ten_sach","isbn","nha_xuat_ban","tac_gia",
            "ngon_ngu","the_loai","kieu_bia","gia_tu","gia_den","trong_luong_g","tinh_trang",
            "mo_ta_tinh_trang","do_tuoi","mo_ta_sach","trinh_do_doc","link_video","bo_suu_tap","bien_the","ton_kho");
    public static final Map<String,String> FIELDS=Map.ofEntries(Map.entry("title","ten_sach"),Map.entry("isbn","isbn"),
            Map.entry("publisher","nha_xuat_ban"),Map.entry("author","tac_gia"),Map.entry("language","ngon_ngu"),
            Map.entry("categoryCode","the_loai"),Map.entry("binding","kieu_bia"),Map.entry("priceMinVnd","gia_tu"),
            Map.entry("priceMaxVnd","gia_den"),Map.entry("weightG","trong_luong_g"),Map.entry("conditionGrade","tinh_trang"),
            Map.entry("conditionNote","mo_ta_tinh_trang"),Map.entry("ageGroups","do_tuoi"),Map.entry("description","mo_ta_sach"),
            Map.entry("readingLevel","trinh_do_doc"),Map.entry("readingVideoUrl","link_video"),Map.entry("collectionIds","bo_suu_tap"),
            Map.entry("variants","bien_the"));
    public static final Set<String> CATEGORIES=Set.of("BOARD_BOOK","PICTURE_BOOK","ENCYCLOPEDIA_SCIENCE","HISTORY","CHAPTER","STORY_COLLECTION");
}
