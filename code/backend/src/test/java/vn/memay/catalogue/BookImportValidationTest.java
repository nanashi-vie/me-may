package vn.memay.catalogue;

import org.junit.jupiter.api.Test;
import java.util.*;
import vn.memay.catalogue.BookImportDtos.*;
import static org.assertj.core.api.Assertions.*;

class BookImportValidationTest {
    private final BookImportValidator validator = new BookImportValidator(new BookValidation());

    static CellRow row(int number, String key, String variant, String stock) {
        var cells = new LinkedHashMap<String,String>();
        for (String column : List.of("nhom_sach","ten_sach","isbn","nha_xuat_ban","tac_gia","ngon_ngu",
                "the_loai","kieu_bia","gia_tu","gia_den","trong_luong_g","tinh_trang",
                "mo_ta_tinh_trang","do_tuoi","mo_ta_sach","trinh_do_doc","link_video","bo_suu_tap","bien_the","ton_kho")) cells.put(column, "");
        cells.putAll(Map.of("nhom_sach",key,"ten_sach","Sách tiếng Việt", "isbn","000123", "ngon_ngu","Tiếng Anh",
                "the_loai","BOARD_BOOK","gia_tu","21000","gia_den","25000","trong_luong_g","300",
                "tinh_trang","HIGH_FRESHNESS","mo_ta_tinh_trang","Bìa còn đẹp"));
        cells.put("bien_the", variant); cells.put("ton_kho",stock);
        return new CellRow("Sach",number,cells);
    }
    static CellRow change(CellRow row, String column, String value) {
        var cells = new LinkedHashMap<>(row.cells()); cells.put(column,value);
        return new CellRow(row.sheet(),row.row(),cells);
    }
    @Test void normalizationPreservesLogicalBooksAndReportsAllMissingFields() {
        var doc=validator.normalize(List.of(row(2,"A","Mới","2"),row(3,"B","","0"),row(4,"A","Cấn góc","1")));
        assertThat(doc.issues()).isEmpty(); assertThat(doc.groups()).hasSize(2);
        assertThat(doc.groups().getFirst().write().isbn()).isEqualTo("000123");
        assertThat(doc.groups().getFirst().write().variants()).extracting(BookDtos.VariantWrite::stock).containsExactlyInAnyOrder(2L,1L);
        assertThat(doc.groups().get(1).write().variants().getFirst().stock()).isZero();
        var bad=validator.normalize(List.of(change(change(row(2,"C","","1"),"ngon_ngu",""),"ton_kho","")));
        assertThat(bad.issues()).extracting(ImportIssue::column).contains("ngon_ngu","ton_kho");
        assertThat(bad.fingerprint()).isNull();
    }
    @Test void fingerprintIgnoresRowAndHeaderOrder() {
        var a=row(2,"A","Mới","1");var b=row(3,"A","Cấn góc","2");
        var reversed=new LinkedHashMap<String,String>();var keys=new ArrayList<>(a.cells().keySet());Collections.reverse(keys);
        keys.forEach(k->reversed.put(k,a.cells().get(k)));
        assertThat(validator.normalize(List.of(a,b)).fingerprint()).isEqualTo(validator.normalize(List.of(b,new CellRow("csv",99,reversed))).fingerprint());
    }
    @Test void changedStockChangesFingerprint() {
        assertThat(validator.normalize(List.of(row(2,"A","","1"))).fingerprint())
                .isNotEqualTo(validator.normalize(List.of(row(2,"A","","2"))).fingerprint());
    }
    @Test void commonFieldMismatchIdentifiesBothRows() {
        var doc=validator.normalize(List.of(row(2,"A","Mới","1"),change(row(4,"A","Lỗi","1"),"gia_tu","22000")));
        assertThat(doc.issues().stream().filter(i->i.column().equals("gia_tu")).map(ImportIssue::row)).contains(2,4);
    }
    @Test void rejectsInvalidNumbersEnumsAndGroupLimits() {
        for (String value:List.of("21.000","-1","1.5","2e3","9999999999999")) {
            var doc=validator.normalize(List.of(change(row(2,"A","","1"),"gia_tu",value)));
            assertThat(doc.issues()).as(value).extracting(ImportIssue::column).contains("gia_tu");
        }
        for (var entry:Map.of("the_loai","FAKE","tinh_trang","GOOD","link_video","http://example.test",
                "do_tuoi","AGE_0_3;AGE_0_3","kieu_bia","PAPERBACK").entrySet())
            assertThat(validator.normalize(List.of(change(row(2,"A","","1"),entry.getKey(),entry.getValue()))).issues())
                    .extracting(ImportIssue::column).contains(entry.getKey());
        assertThat(validator.normalize(List.of(row(2,"A"," Same ","1"),row(3,"A","same","1"))).issues())
                .extracting(ImportIssue::column).contains("bien_the");
        var rows=new ArrayList<CellRow>();for(int i=0;i<101;i++)rows.add(row(i+2,"A","v"+i,"1"));
        assertThat(validator.normalize(rows).issues()).extracting(ImportIssue::column).contains("bien_the");
    }
    @Test void limitsIssueDetailsWithoutLosingTotal() {
        var rows=new ArrayList<CellRow>();for(int i=0;i<500;i++)rows.add(change(change(change(row(i+2,"A","v"+i,""),"ngon_ngu",""),"tinh_trang",""),"ten_sach",""));
        var doc=validator.normalize(rows);assertThat(doc.issues()).hasSize(1000);assertThat(doc.totalIssues()).isGreaterThan(1000);
    }
}
