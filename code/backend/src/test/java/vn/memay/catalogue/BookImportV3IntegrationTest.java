package vn.memay.catalogue;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Value;
import vn.memay.support.*;
import java.util.*;
import static vn.memay.support.AdminHttpClient.*;
import static org.assertj.core.api.Assertions.*;

class BookImportV3IntegrationTest extends CatalogueTestSupport {
    @Value("${local.server.port}") int port; AdminHttpClient api;
    @BeforeEach void login()throws Exception {api=new AdminHttpClient(port);api.login("owner@catalogue.test");}
    java.net.http.HttpResponse<String> request(String action,byte[] bytes,String fingerprint)throws Exception {
        return api.multipart("/api/v1/admin/book-imports/"+action,"books.csv",bytes,
                fingerprint==null?Map.of():Map.of("fingerprint",fingerprint),true);
    }
    String preview(byte[] data)throws Exception {
        var response=request("preview",data,null);assertThat(response.statusCode()).isEqualTo(200);
        assertThat(tree(response).path("document").path("issues").size()).isZero();
        return tree(response).path("document").path("fingerprint").asString();
    }
    long imported(byte[] data,String digest)throws Exception {
        var response=request("confirm",data,digest);assertThat(response.statusCode()).isEqualTo(201);
        return Long.parseLong(tree(response).path("books").get(0).path("id").asString());
    }
    long count(String table){return jdbc.queryForObject("select count(*) from "+table,Long.class);}
    @Test void commitsUnpricedHiddenBooksThenAllowsPricingBeforePublish()throws Exception {
        byte[] data=BookImportV3Test.csv(List.of(BookImportV3Test.values()));String digest=preview(data);
        assertThat(count("book_copy")).isZero();assertThat(count("book_import_batch")).isZero();
        long id=imported(data,digest);var b=queries.detail(id,owner);
        assertThat(b.priceMinVnd()).isNull();assertThat(b.priceMaxVnd()).isNull();assertThat(b.unitPricePerKgVnd()).isNull();
        assertThat(b.publication()).isEqualTo(BookDtos.Publication.ARCHIVED);assertThat(b.publishedAt()).isNull();
        assertThat(b.totalStock()).isEqualTo(1);assertThat(b.language()).isEqualTo("Tiếng Anh");
        assertThat(b.publisher()).isEqualTo("NXB mẫu");assertThat(b.author()).isEqualTo("Tác giả mẫu");
        assertThat(b.description()).isEqualTo("Mô tả, dòng đầu\nDòng sau");
        assertThat(jdbc.queryForObject("select schema_version from book_import_batch",Integer.class)).isEqualTo(3);
        assertThat(count("book_media")).isZero();assertThat(count("audit_event")).isEqualTo(1);
        for(String role:List.of("FRONT","BACK"))jdbc.update("insert into book_media(id,book_copy_id,role,state,storage_public_id,alt) values (?, ?,?,'ACTIVE',?,?)",UUID.randomUUID(),id,role,"test/"+UUID.randomUUID(),role);
        var publish=Map.of("version",b.version(),"status","PUBLISHED","confirmedActualCopy",true);
        assertThat(api.send("PATCH","/api/v1/admin/books/"+id+"/publication",json(publish),true).statusCode()).isEqualTo(400);
        assertThat(new AdminHttpClient(port).send("GET","/api/v1/books/"+b.slug(),null,false).statusCode()).isEqualTo(404);
        var body=new BookEntryContractTest().body(b);body.remove("variants");body.remove("conditionNote");
        body.put("stock",3);body.put("internalNote","Private updated note");body.put("unitPricePerKgVnd",80000);
        body.put("priceMinVnd",36000);body.put("priceMaxVnd",42000);
        var saved=api.send("PUT","/api/v1/admin/books/"+id,json(body),true);assertThat(saved.statusCode()).isEqualTo(200);
        var retry=request("confirm",data,digest);assertThat(retry.statusCode()).isEqualTo(200);
        assertThat(count("book_copy")).isEqualTo(1);var edited=queries.detail(id,owner);
        assertThat(edited.priceMinVnd()).isEqualTo(36000);assertThat(edited.priceMaxVnd()).isEqualTo(42000);
        assertThat(edited.unitPricePerKgVnd()).isEqualTo(80000);assertThat(edited.totalStock()).isEqualTo(3);
        assertThat(edited.conditionNote()).isEqualTo("Private updated note");
        publish=Map.of("version",edited.version(),"status","PUBLISHED","confirmedActualCopy",true);
        assertThat(api.send("PATCH","/api/v1/admin/books/"+id+"/publication",json(publish),true).statusCode()).isEqualTo(200);
        var publicBook=new AdminHttpClient(port).send("GET","/api/v1/books/"+b.slug(),null,false);
        assertThat(publicBook.statusCode()).isEqualTo(200);assertThat(publicBook.body()).doesNotContain("Private updated note");
    }
    @Test void v1v2ReceiptsKeepPricesAndReplayAlongsideV3()throws Exception {
        byte[] v1=BookImportParserTest.csv(BookImportValidationTest.row(2,"A","","1").cells());
        String d1="7eeb28ad04e84becf333f10f1960783d696d9eb76fbe63417e340d3699f992fc";
        long id1=imported(v1,d1);
        byte[] v2=BookImportV2Test.csv(List.of(BookImportV2Test.values()),BookImportV2Test.COLUMNS);String d2=preview(v2);long id2=imported(v2,d2);
        byte[] v3=BookImportV3Test.csv(List.of(BookImportV3Test.values()));imported(v3,preview(v3));
        for(long id:List.of(id1,id2)) {
            var original=queries.detail(id,owner);assertThat(original.priceMinVnd()).isNotNull();assertThat(original.priceMaxVnd()).isNotNull();
            jdbc.update("update listing set price_min_vnd=36000,price_max_vnd=42000 where book_copy_id=?",id);
            jdbc.update("update book_copy set condition_note='edited',version=7 where id=?",id);
            jdbc.update("update book_variant set stock=9 where book_copy_id=?",id);
        }
        assertThat(request("confirm",v1,d1).statusCode()).isEqualTo(200);assertThat(request("confirm",v2,d2).statusCode()).isEqualTo(200);
        for(long id:List.of(id1,id2)) {
            var current=queries.detail(id,owner);assertThat(current.priceMinVnd()).isEqualTo(36000);
            assertThat(current.conditionNote()).isEqualTo("edited");assertThat(current.totalStock()).isEqualTo(9);assertThat(current.version()).isEqualTo(7);
        }
        assertThat(count("book_copy")).isEqualTo(3);
        assertThat(jdbc.queryForList("select schema_version from book_import_batch",Integer.class)).containsExactlyInAnyOrder(1,2,3);
    }
    @Test void lastBookFailureRollsBackWholeV3Batch()throws Exception {
        byte[] data=BookImportV3Test.csv(List.of(BookImportV3Test.change("ten_sach","A book"),BookImportV3Test.change("ten_sach","Z reject")));
        String digest=preview(data);jdbc.execute("alter table book_copy add constraint v3_reject_last check(title <> 'Z reject')");
        try {assertThat(request("confirm",data,digest).statusCode()).isEqualTo(500);}
        finally {jdbc.execute("alter table book_copy drop constraint v3_reject_last");}
        for(String table:List.of("book_copy","listing","book_variant","audit_event","book_import_batch","book_import_item"))assertThat(count(table)).as(table).isZero();
        imported(data,digest);assertThat(count("book_copy")).isEqualTo(2);
    }
    @Test void staleCategoryCannotCreateAReceiptAndStaffCannotImport()throws Exception {
        byte[] data=BookImportV3Test.csv(List.of(BookImportV3Test.values()));String digest=preview(data);
        jdbc.update("update category set code='TEMP_BOARD' where code='BOARD_BOOK'");
        try {
            assertThat(request("confirm",data,digest).statusCode()).isEqualTo(422);assertThat(count("book_import_batch")).isZero();
        } finally {jdbc.update("update category set code='BOARD_BOOK' where code='TEMP_BOARD'");}
        api.login("staff@catalogue.test");assertThat(request("preview",data,null).statusCode()).isEqualTo(403);
        assertThat(request("confirm",data,digest).statusCode()).isEqualTo(403);
    }
}
