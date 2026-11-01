package vn.memay.catalogue;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Value;
import vn.memay.support.*;
import java.util.*;
import static vn.memay.support.AdminHttpClient.*;
import static org.assertj.core.api.Assertions.*;

class BookImportV2IntegrationTest extends CatalogueTestSupport {
    @Value("${local.server.port}") int port;AdminHttpClient api;
    @BeforeEach void login()throws Exception {api=new AdminHttpClient(port);api.login("owner@catalogue.test");}
    java.net.http.HttpResponse<String> request(String action,byte[] bytes,String fingerprint)throws Exception {
        return api.multipart("/api/v1/admin/book-imports/"+action,"books.csv",bytes,fingerprint==null?Map.of():Map.of("fingerprint",fingerprint),true);
    }
    long count(String table){return jdbc.queryForObject("select count(*) from "+table,Long.class);}
    byte[] file(List<Map<String,String>> rows){return BookImportV2Test.csv(rows,BookImportV2Test.COLUMNS);}

    @Test void duplicateRowsCommitAsSeparateHiddenBooksAndReplayDoesNotOverwrite()throws Exception {
        var values=BookImportV2Test.values();byte[] file=file(List.of(values,values));
        var preview=request("preview",file,null);assertThat(preview.statusCode()).isEqualTo(200);
        assertThat(tree(preview).path("document").path("schemaVersion").asInt()).isEqualTo(2);
        assertThat(count("book_copy")).isZero();String digest=tree(preview).path("document").path("fingerprint").asString();
        var first=request("confirm",file,digest);assertThat(first.statusCode()).isEqualTo(201);
        assertThat(tree(first).path("books").size()).isEqualTo(2);assertThat(count("book_variant")).isEqualTo(2);
        assertThat(jdbc.queryForList("select publication_status from listing",String.class)).containsOnly("ARCHIVED");
        assertThat(jdbc.queryForList("select language from book_copy",String.class)).containsOnly("Tiếng Anh");
        assertThat(jdbc.queryForList("select stock from book_variant",Long.class)).containsExactly(1L,1L);
        assertThat(jdbc.queryForObject("select schema_version from book_import_batch",Integer.class)).isEqualTo(2);
        assertThat(count("book_media")).isZero();assertThat(count("upload_session")).isZero();assertThat(count("audit_event")).isEqualTo(2);
        assertThat(jdbc.queryForObject("select count(*) from listing where published_at is not null",Long.class)).isZero();
        long id=Long.parseLong(tree(first).path("books").get(0).path("id").asString());
        jdbc.update("update book_copy set title='Owner edited',version=7 where id=?",id);jdbc.update("update book_variant set stock=9 where book_copy_id=?",id);
        var codes=BookImportV2Test.change(BookImportV2Test.change(values,"the_loai","BOARD_BOOK"),"tinh_trang","HIGH_FRESHNESS");
        var headers=new ArrayList<>(BookImportV2Test.COLUMNS);Collections.reverse(headers);
        var replay=request("confirm",BookImportV2Test.csv(List.of(codes,codes),headers),digest);
        assertThat(replay.statusCode()).isEqualTo(200);assertThat(tree(replay).path("id").asString()).isEqualTo(tree(first).path("id").asString());
        assertThat(count("book_copy")).isEqualTo(2);assertThat(queries.detail(id,owner).title()).isEqualTo("Owner edited");
        assertThat(queries.detail(id,owner).totalStock()).isEqualTo(9);assertThat(queries.detail(id,owner).version()).isEqualTo(7);
    }
    @Test void referenceErrorsKeepTheV2PreviewIdentityAndDoNotCreateBooks()throws Exception {
        byte[] file=file(List.of(BookImportV2Test.change(BookImportV2Test.values(),"bo_suu_tap","not-active")));
        var response=request("preview",file,null);assertThat(response.statusCode()).isEqualTo(200);
        var doc=tree(response).path("document");assertThat(doc.path("schemaVersion").asInt()).isEqualTo(2);
        assertThat(doc.path("fingerprint").isNull()).isTrue();assertThat(response.body()).contains("bo_suu_tap");assertThat(count("book_copy")).isZero();
    }
    @Test void legacyReceiptAndDigestStillReplayAlongsideV2()throws Exception {
        byte[] legacy=BookImportParserTest.csv(BookImportValidationTest.row(2,"A","","1").cells());
        String digest="7eeb28ad04e84becf333f10f1960783d696d9eb76fbe63417e340d3699f992fc";
        var old=request("confirm",legacy,digest);assertThat(old.statusCode()).isEqualTo(201);
        byte[] v2=file(List.of(BookImportV2Test.values()));var preview=request("preview",v2,null);
        var current=request("confirm",v2,tree(preview).path("document").path("fingerprint").asString());assertThat(current.statusCode()).isEqualTo(201);
        var replay=request("confirm",legacy,digest);assertThat(replay.statusCode()).isEqualTo(200);
        assertThat(tree(replay).path("id").asString()).isEqualTo(tree(old).path("id").asString());
        assertThat(jdbc.queryForList("select schema_version from book_import_batch",Integer.class)).containsExactlyInAnyOrder(1,2);
    }
    @Test void failureOnLastV2BookRollsBackTheEntireReceipt()throws Exception {
        byte[] data=file(List.of(BookImportV2Test.change(BookImportV2Test.values(),"ten_sach","A book"),BookImportV2Test.change(BookImportV2Test.values(),"ten_sach","Z reject")));
        var preview=request("preview",data,null);String digest=tree(preview).path("document").path("fingerprint").asString();
        jdbc.execute("alter table book_copy add constraint v2_reject_last check(title <> 'Z reject')");
        try {assertThat(request("confirm",data,digest).statusCode()).isEqualTo(500);}
        finally {jdbc.execute("alter table book_copy drop constraint v2_reject_last");}
        for(String table:List.of("book_copy","listing","book_variant","audit_event","book_import_batch","book_import_item"))assertThat(count(table)).as(table).isZero();
        assertThat(request("confirm",data,digest).statusCode()).isEqualTo(201);
    }
    @Test void staffCannotPreviewTheSimplifiedFile()throws Exception {
        api.login("staff@catalogue.test");assertThat(request("preview",file(List.of(BookImportV2Test.values())),null).statusCode()).isEqualTo(403);
    }
}
