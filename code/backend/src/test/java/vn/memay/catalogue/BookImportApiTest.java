package vn.memay.catalogue;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.*;
import vn.memay.support.*;
import java.util.*;
import static vn.memay.support.AdminHttpClient.*;
import static org.assertj.core.api.Assertions.*;

class BookImportApiTest extends CatalogueTestSupport {
    @Value("${local.server.port}") int port;@Autowired BookImportGate gate;AdminHttpClient api;
    @BeforeEach void login()throws Exception {api=new AdminHttpClient(port);api.login("owner@catalogue.test");}
    byte[] file(){return BookImportParserTest.csv(BookImportValidationTest.row(2,"A","","2").cells());}
    java.net.http.HttpResponse<String> request(String action,byte[] bytes,String fingerprint)throws Exception {
        return api.multipart("/api/v1/admin/book-imports/"+action,"books.csv",bytes,fingerprint==null?Map.of():Map.of("fingerprint",fingerprint),true);
    }
    @Test void previewDoesNotAllocateBooksOrCodes()throws Exception {
        long before=jdbc.queryForObject("select last_value from book_code_seq",Long.class);
        var response=request("preview",file(),null);assertThat(response.statusCode()).isEqualTo(200);
        assertThat(tree(response).path("document").path("totalIssues").asInt()).isZero();
        assertThat(tree(response).path("document").path("fingerprint").asString()).hasSize(64);
        for(String table:List.of("book_copy","book_import_batch","book_import_item","audit_event"))assertThat(jdbc.queryForObject("select count(*) from "+table,Long.class)).isZero();
        assertThat(jdbc.queryForObject("select last_value from book_code_seq",Long.class)).isEqualTo(before);
        assertThat(response.headers().firstValue("cache-control").orElse("")).contains("no-store");
    }
    @Test void confirmRejectsChangedFingerprint()throws Exception {
        var result=request("confirm",file(),"0".repeat(64));assertThat(result.statusCode()).isEqualTo(409);
        assertThat(jdbc.queryForObject("select count(*) from book_copy",Long.class)).isZero();
    }
    @Test void confirmsOnceAndReturnsReceiptEvenWhenQuotaExhausted()throws Exception {
        String fingerprint=tree(request("preview",file(),null)).path("document").path("fingerprint").asString();
        var first=request("confirm",file(),fingerprint);assertThat(first.statusCode()).isEqualTo(201);
        for(int i=0;i<8;i++)try(var permit=gate.acquire(owner.getId())){gate.charge(owner.getId());}
        var retry=request("confirm",file(),fingerprint);assertThat(retry.statusCode()).isEqualTo(200);
        assertThat(tree(retry).path("id").asString()).isEqualTo(tree(first).path("id").asString());
        var again=request("preview",file(),null);assertThat(again.statusCode()).isEqualTo(200);assertThat(tree(again).path("receipt").path("id").asString()).isEqualTo(tree(first).path("id").asString());
        var different=BookImportParserTest.csv(BookImportValidationTest.row(2,"B","","1").cells());
        var limit=request("preview",different,null);assertThat(limit.statusCode()).isEqualTo(429);assertThat(limit.headers().firstValue("retry-after")).isPresent();
        assertThat(jdbc.queryForObject("select count(*) from book_copy",Long.class)).isEqualTo(1);
    }
    @Test void reportsAllMissingFieldsAndRechecksCollectionOnConfirm()throws Exception {
        var bad=BookImportValidationTest.change(BookImportValidationTest.change(BookImportValidationTest.row(2,"A","","1"),"ngon_ngu",""),"gia_tu","");
        var response=request("preview",BookImportParserTest.csv(bad.cells()),null);assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).contains("ngon_ngu","gia_tu");assertThat(tree(response).path("document").path("fingerprint").isNull()).isTrue();
        jdbc.update("insert into collection(name,slug,active) values('New','new',true)");
        var bytes=BookImportParserTest.csv(BookImportValidationTest.change(BookImportValidationTest.row(2,"A","","1"),"bo_suu_tap","new").cells());
        String fingerprint=tree(request("preview",bytes,null)).path("document").path("fingerprint").asString();
        jdbc.update("update collection set active=false where slug='new'");
        var result=request("confirm",bytes,fingerprint);assertThat(result.statusCode()).isEqualTo(422);assertThat(result.body()).contains("bo_suu_tap");
        assertThat(jdbc.queryForObject("select count(*) from book_copy",Long.class)).isZero();
    }
    @Test void ownerCsrfAndFileBoundsAreEnforced()throws Exception {
        var anon=new AdminHttpClient(port);assertThat(anon.send("GET","/api/v1/admin/book-imports/options",null,false).statusCode()).isEqualTo(401);
        assertThat(api.multipart("/api/v1/admin/book-imports/preview","books.csv",file(),Map.of(),false).statusCode()).isEqualTo(403);
        assertThat(request("preview",new byte[2097153],null).statusCode()).isEqualTo(413);
        assertThat(request("preview","bad".getBytes(java.nio.charset.StandardCharsets.UTF_8),null).statusCode()).isEqualTo(422);
        api.login("staff@catalogue.test");assertThat(request("preview",file(),null).statusCode()).isEqualTo(403);
        assertThat(api.send("GET","/api/v1/admin/book-imports/options",null,false).statusCode()).isEqualTo(403);
    }
    @Test void templatesAndOptionsArePrivateAndOnlyContainActiveReferences()throws Exception {
        jdbc.update("insert into collection(name,slug,active) values('Active','active',true),('Hidden','inactive',false)");
        var options=api.send("GET","/api/v1/admin/book-imports/options",null,false);assertThat(options.statusCode()).isEqualTo(200);assertThat(options.body()).contains("active").doesNotContain("inactive");
        for(String format:List.of("csv","xlsx")) {
            var response=api.download("/api/v1/admin/book-imports/templates?format="+format);assertThat(response.statusCode()).isEqualTo(200);
            assertThat(response.headers().firstValue("cache-control").orElse("")).contains("no-store");
            assertThat(new BookImportParser().parse("template."+format,response.body())).isEmpty();
        }
        assertThat(api.send("GET","/api/v1/admin/book-imports/templates?format=xls",null,false).statusCode()).isEqualTo(400);
    }
    @Test void failedParsesConsumeQuotaAndReleaseInflightPermit()throws Exception {
        for(int i=0;i<10;i++)assertThat(request("preview","invalid".getBytes(java.nio.charset.StandardCharsets.UTF_8),null).statusCode()).isEqualTo(422);
        assertThat(request("preview",file(),null).statusCode()).isEqualTo(429);
    }
    @Test void issueCapKeepsTotalAndNeverEnablesImport()throws Exception {
        var bad=BookImportValidationTest.change(BookImportValidationTest.change(BookImportValidationTest.row(2,"A","v",""),"ngon_ngu",""),"tinh_trang","");
        var text=new String(BookImportParserTest.csv(bad.cells()),java.nio.charset.StandardCharsets.UTF_8);int line=text.indexOf('\n')+1;
        var bytes=(text.substring(0,line)+text.substring(line).repeat(500)).getBytes(java.nio.charset.StandardCharsets.UTF_8);
        var response=request("preview",bytes,null);assertThat(response.statusCode()).isEqualTo(200);
        var document=tree(response).path("document");assertThat(document.path("issues").size()).isEqualTo(1000);
        assertThat(document.path("totalIssues").asInt()).isGreaterThan(1000);assertThat(document.path("fingerprint").isNull()).isTrue();
        var confirm=request("confirm",bytes,"0".repeat(64));assertThat(confirm.statusCode()).isEqualTo(422);
        assertThat(tree(confirm).path("issues").size()).isEqualTo(1000);
        assertThat(jdbc.queryForObject("select count(*) from book_import_batch",Long.class)).isZero();
    }
}
