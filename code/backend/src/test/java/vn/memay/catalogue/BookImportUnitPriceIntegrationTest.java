package vn.memay.catalogue;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Value;
import vn.memay.support.*;
import java.util.*;
import static vn.memay.support.AdminHttpClient.*;
import static org.assertj.core.api.Assertions.*;

class BookImportUnitPriceIntegrationTest extends CatalogueTestSupport {
    @Value("${local.server.port}") int port;AdminHttpClient api;
    @BeforeEach void login()throws Exception {api=new AdminHttpClient(port);api.login("owner@catalogue.test");}
    java.net.http.HttpResponse<String> request(String action,byte[] bytes,String fingerprint)throws Exception {
        return api.multipart("/api/v1/admin/book-imports/"+action,"books.csv",bytes,
                fingerprint==null?Map.of():Map.of("fingerprint",fingerprint),true);
    }
    @Test void flagsBothExcelRowsWithTheSameTitle() throws Exception {
        var first=BookImportUnitPriceTest.values("80000","450");
        var second=BookImportV2Test.change(BookImportUnitPriceTest.values("81000","450"),"ten_sach","  SÁCH MẪU  ");
        var file=BookImportV3Test.xlsx(List.of(first,second),BookImportUnitPriceTest.COLUMNS,s->{});
        var response=api.multipart("/api/v1/admin/book-imports/preview","books.xlsx",file,Map.of(),true);
        assertThat(response.statusCode()).isEqualTo(200);
        var document=tree(response).path("document");
        assertThat(document.path("fingerprint").isNull()).isTrue();
        assertThat(document.path("issues").values())
                .allSatisfy(issue->assertThat(issue.path("column").asString()).isEqualTo("ten_sach"))
                .extracting(issue->issue.path("row").asInt()).containsExactlyInAnyOrder(2,3);
    }

    @Test void rejectsExcelTitlePublishedAfterPreview() throws Exception {
        var row=BookImportV2Test.change(BookImportUnitPriceTest.values("80000","450"),"ten_sach"," REAL BOOK ");
        var file=BookImportV3Test.xlsx(List.of(row),BookImportUnitPriceTest.COLUMNS,s->{});
        String endpoint="/api/v1/admin/book-imports/";
        var preview=api.multipart(endpoint+"preview","books.xlsx",file,Map.of(),true);
        String digest=tree(preview).path("document").path("fingerprint").asString();
        assertThat(digest).hasSize(64);

        var existing=ready();
        var publish=Map.of("version",existing.version(),"status","PUBLISHED","confirmedActualCopy",true);
        assertThat(api.send("PATCH","/api/v1/admin/books/"+existing.id()+"/publication",json(publish),true).statusCode()).isEqualTo(200);

        var updated=api.multipart(endpoint+"preview","books.xlsx",file,Map.of(),true);
        assertThat(tree(updated).path("document").path("fingerprint").isNull()).isTrue();
        var confirm=api.multipart(endpoint+"confirm","books.xlsx",file,Map.of("fingerprint",digest),true);
        assertThat(confirm.statusCode()).isEqualTo(422);
        var issue=tree(confirm).path("issues").get(0);
        assertThat(issue.path("row").asInt()).isEqualTo(2);
        assertThat(issue.path("column").asString()).isEqualTo("ten_sach");
        assertThat(jdbc.queryForObject("select count(*) from book_copy",Long.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from book_import_batch",Long.class)).isZero();
    }

    @Test void persistsOptionalUnitPriceAndReplayNeverOverwritesLaterEdits()throws Exception {
        var blank=BookImportV2Test.change(BookImportUnitPriceTest.values("","450"),"ten_sach","Blank unit");
        byte[] data=BookImportUnitPriceTest.csv(List.of(BookImportUnitPriceTest.values("80000","450"),blank));
        var preview=request("preview",data,null);assertThat(preview.statusCode()).isEqualTo(200);
        assertThat(jdbc.queryForObject("select count(*) from book_copy",Long.class)).isZero();
        String digest=tree(preview).path("document").path("fingerprint").asString();
        var response=request("confirm",data,digest);assertThat(response.statusCode()).isEqualTo(201);
        assertThat(jdbc.queryForObject("select schema_version from book_import_batch",Integer.class)).isEqualTo(4);
        long id=jdbc.queryForObject("select id from book_copy where title=?",Long.class,"Sách mẫu");
        var book=queries.detail(id,owner);assertThat(book.unitPricePerKgVnd()).isEqualTo(80000);
        assertThat(book.priceMinVnd()).isEqualTo(36000);assertThat(book.priceMaxVnd()).isEqualTo(42000);
        assertThat(book.publication()).isEqualTo(BookDtos.Publication.ARCHIVED);assertThat(book.media()).isEmpty();
        long blankId=jdbc.queryForObject("select id from book_copy where title='Blank unit'",Long.class);
        var unpriced=queries.detail(blankId,owner);assertThat(unpriced.unitPricePerKgVnd()).isNull();assertThat(unpriced.priceMinVnd()).isNull();assertThat(unpriced.priceMaxVnd()).isNull();
        var body=new BookEntryContractTest().body(book);body.remove("variants");body.remove("conditionNote");
        body.put("stock",4);body.put("unitPricePerKgVnd",81000);body.put("internalNote","Owner edit");
        body.put("priceMinVnd",40000);body.put("priceMaxVnd",48000);
        assertThat(api.send("PUT","/api/v1/admin/books/"+id,json(body),true).statusCode()).isEqualTo(200);
        var retry=request("confirm",data,digest);assertThat(retry.statusCode()).isEqualTo(200);
        assertThat(tree(retry).path("id").asString()).isEqualTo(tree(response).path("id").asString());
        var saved=queries.detail(id,owner);assertThat(saved.unitPricePerKgVnd()).isEqualTo(81000);
        assertThat(saved.priceMinVnd()).isEqualTo(40000);assertThat(saved.priceMaxVnd()).isEqualTo(48000);
        assertThat(saved.totalStock()).isEqualTo(4);assertThat(saved.conditionNote()).isEqualTo("Owner edit");
        assertThat(jdbc.queryForObject("select count(*) from book_copy",Long.class)).isEqualTo(2);
    }
    @Test void distinctUnitPricesRemainDistinctEvenWhenRoundedPricesMatch()throws Exception {
        byte[] data=BookImportUnitPriceTest.csv(List.of(BookImportUnitPriceTest.values("80000","1"),
                BookImportV2Test.change(BookImportUnitPriceTest.values("81000","1"),"ten_sach","Second book")));
        var preview=request("preview",data,null);assertThat(preview.statusCode()).isEqualTo(200);
        var response=request("confirm",data,tree(preview).path("document").path("fingerprint").asString());
        assertThat(response.statusCode()).isEqualTo(201);
        assertThat(jdbc.queryForList("select unit_price_per_kg_vnd from book_copy",Long.class)).containsExactlyInAnyOrder(80000L,81000L);
        assertThat(jdbc.queryForList("select price_min_vnd from listing",Long.class)).containsExactly(1000L,1000L);
    }
    @Test void oneInvalidUnitRejectsWholeFileWithSourceColumn()throws Exception {
        byte[] data=BookImportUnitPriceTest.csv(List.of(BookImportUnitPriceTest.values("80000","450"),BookImportUnitPriceTest.values("-1","450")));
        var preview=request("preview",data,null);assertThat(preview.statusCode()).isEqualTo(200);
        var document=tree(preview).path("document");assertThat(document.path("fingerprint").isNull()).isTrue();
        assertThat(document.path("issues").get(0).path("column").asString()).isEqualTo("don_gia_kg");
        assertThat(document.path("issues").get(0).path("row").asInt()).isEqualTo(3);
        assertThat(request("confirm",data,"0".repeat(64)).statusCode()).isEqualTo(422);
        assertThat(jdbc.queryForObject("select count(*) from book_copy",Long.class)).isZero();
        assertThat(jdbc.queryForObject("select count(*) from book_import_batch",Long.class)).isZero();
    }
}
