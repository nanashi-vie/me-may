package vn.memay.catalogue;

import org.junit.jupiter.api.Test;
import java.util.*;
import tools.jackson.databind.json.JsonMapper;
import vn.memay.catalogue.BookImportDtos.*;
import static org.assertj.core.api.Assertions.*;

class BookImportUnitPriceTest {
    static final List<String> COLUMNS=List.of("ten_sach","nha_xuat_ban","tac_gia","the_loai","kieu_bia","trong_luong_g","mo_ta_sach","don_gia_kg");
    final BookImportParser parser=new BookImportParser();
    final BookImportValidator validator=new BookImportValidator(new BookValidation());
    static Map<String,String> values(String unit,String weight) {
        var row=new LinkedHashMap<>(BookImportV3Test.values());row.put("don_gia_kg",unit);row.put("trong_luong_g",weight);return row;
    }
    static byte[] csv(List<Map<String,String>> rows) {return BookImportV2Test.csv(rows,COLUMNS);}
    ImportDocument read(byte[] bytes,String ext) {return validator.normalize(parser.parse("books."+ext,bytes));}
    @Test void calculatesTheSameRoundedPricesAsTheEntryForm() {
        long[][] cases={{80000,450,36000,42000},{81000,450,37000,42000},{1,1,1000,1000},{999999999999L,1,1000000000,1150000000}};
        for(var example:cases) {
            var doc=read(csv(List.of(values(Long.toString(example[0]),Long.toString(example[1])))),"csv");
            assertThat(doc.issues()).isEmpty();assertThat(doc.schemaVersion()).isEqualTo(4);
            var group=doc.groups().getFirst();assertThat(group.write().priceMinVnd()).isEqualTo(example[2]);
            assertThat(group.write().priceMaxVnd()).isEqualTo(example[3]);
            assertThat(new JsonMapper().valueToTree(group).path("unitPricePerKgVnd").asLong()).isEqualTo(example[0]);
        }
    }
    @Test void blankUnitPriceRemainsOptional()throws Exception {
        for(var ext:List.of("csv","xlsx")) {
            var rows=List.of(values("   ","450"));
            var doc=read(ext.equals("csv")?csv(rows):BookImportV3Test.xlsx(rows,COLUMNS,s->{}),ext);
            assertThat(doc.issues()).isEmpty();assertThat(doc.groups().getFirst().write().priceMinVnd()).isNull();
            assertThat(doc.groups().getFirst().write().priceMaxVnd()).isNull();
            assertThat(new JsonMapper().valueToTree(doc.groups().getFirst()).path("unitPricePerKgVnd").isNull()).isTrue();
        }
    }
    @Test void rejectsInvalidUnitAndComputedPriceOverflowWithoutClamping() {
        for(var unit:List.of("0","-1","1.5","80.000","80,000","1e5","text","1000000000000")) {
            var doc=read(csv(List.of(values(unit,"450"))),"csv");
            assertThat(doc.fingerprint()).isNull();assertThat(doc.issues()).extracting(ImportIssue::column).contains("don_gia_kg");
        }
        var overflow=read(csv(List.of(values("999999999999","9007199254740991"))),"csv");
        assertThat(overflow.fingerprint()).isNull();assertThat(overflow.issues()).extracting(ImportIssue::column).contains("don_gia_kg");
        var missingWeight=read(csv(List.of(values("80000",""))),"csv");
        assertThat(missingWeight.fingerprint()).isNull();assertThat(missingWeight.issues()).extracting(ImportIssue::column).contains("trong_luong_g");
    }
    @Test void excelAcceptsNumericUnitsAndRejectsFormulas()throws Exception {
        var rows=List.of(values("80000","450"));
        var numeric=read(BookImportV3Test.xlsx(rows,COLUMNS,s->s.getRow(1).getCell(7).setCellValue(80000)),"xlsx");
        assertThat(numeric.issues()).isEmpty();assertThat(numeric.groups().getFirst().write().priceMaxVnd()).isEqualTo(42000);
        var formula=read(BookImportV3Test.xlsx(rows,COLUMNS,s->s.getRow(1).getCell(7).setCellFormula("40000*2")),"xlsx");
        assertThat(formula.fingerprint()).isNull();assertThat(formula.issues()).extracting(ImportIssue::column).contains("don_gia_kg");
    }
    @Test void fingerprintsIncludeUnitEvenWhenRoundedPricesMatchAndIgnoreReordering()throws Exception {
        var a=values("80000","1");var b=values("81000","1");
        var one=read(csv(List.of(a)),"csv");var other=read(csv(List.of(b)),"csv");
        assertThat(one.groups().getFirst().write()).isEqualTo(other.groups().getFirst().write());
        assertThat(one.fingerprint()).isNotEqualTo(other.fingerprint());
        var headers=new ArrayList<>(COLUMNS);Collections.reverse(headers);
        var reordered=read(BookImportV3Test.xlsx(List.of(b,a),headers,s->{}),"xlsx");
        assertThat(reordered.fingerprint()).isEqualTo(read(csv(List.of(a,b)),"csv").fingerprint());
    }
    @Test void oldSevenAndSixteenColumnFingerprintsRemainByteCompatible() {
        assertThat(read(BookImportV3Test.csv(List.of(BookImportV3Test.values())),"csv").fingerprint())
                .isEqualTo("79c643c0ddc33676fc3a547582075c2012fc4261bd1d96b921bfbe9d9517cac2");
        assertThat(read(BookImportV2Test.csv(List.of(BookImportV2Test.values()),BookImportV2Test.COLUMNS),"csv").fingerprint())
                .isEqualTo("5d40b9e7429576a3591a9f4cc194c6d728a7482334eb7305e9888be44a5cfcf6");
    }
}
