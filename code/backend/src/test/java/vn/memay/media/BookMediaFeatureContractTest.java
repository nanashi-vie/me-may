package vn.memay.media;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import vn.memay.support.*;
import java.util.*;
import static vn.memay.support.AdminHttpClient.*;
import static org.assertj.core.api.Assertions.*;

class BookMediaFeatureContractTest extends MediaTestSupport {
    @Value("${local.server.port}") int port;
    AdminHttpClient api() throws Exception {var a=new AdminHttpClient(port);a.login("owner@catalogue.test");return a;}
    Map<String,Object> createBody(AdminHttpClient a, int count) throws Exception {
        String session=tree(a.send("POST","/api/v1/admin/upload-sessions","{}",true)).path("id").asString();
        var photos=new ArrayList<Map<String,String>>();
        var roles=List.of("FRONT","BACK","SPINE","INSIDE_1","INSIDE_2","INSIDE_3","INTERNAL_1","INTERNAL_2");
        for(int i=0;i<count;i++) {
            var r=a.upload("/api/v1/admin/upload-sessions/"+session+"/media",0,ImageValidatorTest.image("jpeg"),true);
            assertThat(r.statusCode()).isEqualTo(201);
            photos.add(Map.of("mediaId",tree(r).path("id").asString(),"role",roles.get(i)));
        }
        return new LinkedHashMap<>(Map.of("write",new LinkedHashMap<>(Map.of("stock",1,"title","Partial")),
            "uploadSessionId",session,"media",photos,"publication","ARCHIVED","confirmedActualCopy",false));
    }
    Map<String,Object> updateBody(tools.jackson.databind.JsonNode b) {
        var w=new LinkedHashMap<String,Object>(JSON.convertValue(b,Map.class));
        for(String k:List.of("id","bookCode","slug","publication","availability","publishedAt","createdAt","updatedAt","media","totalStock","stock","stockLimit","internalNote","features"))w.remove(k);
        return w;
    }
    @Test void archivedCreateAllowsPartialAndReplaysWithoutDuplicate() throws Exception {
        var a=api();var body=createBody(a,0);
        var r=a.send("POST","/api/v1/admin/books",json(body),true);assertThat(r.statusCode()).isEqualTo(201);
        var b=tree(r);assertThat(b.path("publication").asString()).isEqualTo("ARCHIVED");assertThat(b.path("publishedAt").isNull()).isTrue();
        assertThat(b.path("weightG").isNull()).isTrue();
        var session=tree(a.send("GET","/api/v1/admin/upload-sessions/"+body.get("uploadSessionId"),null,false));
        assertThat(session.path("state").asString()).isEqualTo("CONSUMED");assertThat(session.path("bookId")).isEqualTo(b.path("id"));
        assertThat(tree(a.send("POST","/api/v1/admin/books",json(body),true)).path("id")).isEqualTo(b.path("id"));
        body.put("publication","PUBLISHED");assertThat(a.send("POST","/api/v1/admin/books",json(body),true).statusCode()).isEqualTo(409);
        assertThat(jdbc.queryForObject("select count(*) from book_copy",Integer.class)).isEqualTo(1);
        assertThat(a.send("GET","/api/v1/books/"+b.path("slug").asString(),null,false).statusCode()).isEqualTo(404);
    }
    @Test void emptyArchivedRejectedButImageOnlyAcceptedAndValuesStillValidated() throws Exception {
        var a=api();var body=createBody(a,0);var w=(Map<String,Object>)body.get("write");w.remove("title");
        assertThat(a.send("POST","/api/v1/admin/books",json(body),true).statusCode()).isEqualTo(400);
        w.put("title","Partial");w.put("weightG",-1);
        assertThat(a.send("POST","/api/v1/admin/books",json(body),true).statusCode()).isEqualTo(400);
        body=createBody(a,1);((Map<String,Object>)body.get("write")).remove("title");
        assertThat(a.send("POST","/api/v1/admin/books",json(body),true).statusCode()).isEqualTo(201);
    }
    @Test void eightImagesPrivateEverywhereAndReplacementKeepsLimit() throws Exception {
        var a=api();var body=createBody(a,8);String session=body.get("uploadSessionId").toString();
        assertThat(a.upload("/api/v1/admin/upload-sessions/"+session+"/media",0,ImageValidatorTest.image("jpeg"),true).statusCode()).isEqualTo(409);
        body.put("publication","PUBLISHED");body.put("confirmedActualCopy",true);
        var w=new LinkedHashMap<String,Object>(JSON.convertValue(BookFixtures.write("Eight","BOARD_BOOK",null,20000L,null,null,List.of(),List.of()),Map.class));
        w.put("featureCodes",List.of("SLIDE","SOUND","FLAP"));body.put("write",w);
        var r=a.send("POST","/api/v1/admin/books",json(body),true);assertThat(r.statusCode()).isEqualTo(201);var b=tree(r);
        assertThat(b.path("media").size()).isEqualTo(8);String slug=b.path("slug").asString(),id=b.path("id").asString();
        for(String role:List.of("INTERNAL_1","INTERNAL_2")) {
            assertThat(a.send("GET","/api/v1/books/"+slug+"/media/"+role,null,false).statusCode()).isEqualTo(404);
            assertThat(a.send("GET","/api/v1/books/"+slug+"/media/"+role+"?size=320&format=webp",null,false).statusCode()).isEqualTo(404);
            assertThat(a.send("GET","/api/v1/admin/books/"+id+"/media/"+role+"/content",null,false).statusCode()).isEqualTo(200);
        }
        for(String path:List.of("/api/v1/books","/api/v1/books/"+slug,"/api/v1/home","/api/v1/books/lookup?code="+b.path("bookCode").asString(),"/api/v1/admin/books/"+id+"/preview")) {
            var pub=a.send("GET",path,null,false);assertThat(pub.statusCode()).as(path).isEqualTo(200);
            assertThat(pub.body()).doesNotContain("INTERNAL_1","INTERNAL_2","storage_public_id","sourceRef");
        }
        var pub=tree(a.send("GET","/api/v1/books/"+slug,null,false));assertThat(pub.path("media").size()).isEqualTo(6);
        assertThat(pub.path("features").get(0).path("code").asString()).isEqualTo("SLIDE");
        assertThat(pub.path("features").get(1).path("label").asString()).isEqualTo("Âm thanh");
        a.login("staff@catalogue.test");assertThat(a.send("GET","/api/v1/admin/books/"+id+"/media/INTERNAL_1/content",null,false).statusCode()).isEqualTo(200);
        assertThat(a.send("PUT","/api/v1/admin/books/"+id,json(updateBody(b)),true).statusCode()).isEqualTo(403);
    }
    @Test void saveAndPublishAtomicRollbackTagsOrderAndPublishedAt() throws Exception {
        var a=api();var body=createBody(a,2);
        var r=a.send("POST","/api/v1/admin/books",json(body),true);assertThat(r.statusCode()).isEqualTo(201);var b=tree(r);String id=b.path("id").asString();
        var w=updateBody(b);w.put("title","Changed");w.put("featureCodes",List.of("SOUND","POP_UP"));w.put("publishAfterSave",true);w.put("confirmedActualCopy",true);
        assertThat(a.send("PUT","/api/v1/admin/books/"+id,json(w),true).statusCode()).isEqualTo(400);
        var unchanged=tree(a.send("GET","/api/v1/admin/books/"+id,null,false));assertThat(unchanged.path("title").asString()).isEqualTo("Partial");assertThat(unchanged.path("version")).isEqualTo(b.path("version"));assertThat(unchanged.path("features").size()).isZero();
        w.put("priceMinVnd",20000);w.put("priceMaxVnd",25000);w.put("weightG",300);w.put("categoryCode","BOARD_BOOK");
        r=a.send("PUT","/api/v1/admin/books/"+id,json(w),true);assertThat(r.statusCode()).isEqualTo(200);b=tree(r);var first=b.path("publishedAt");
        assertThat(b.path("publication").asString()).isEqualTo("PUBLISHED");assertThat(b.path("features").size()).isEqualTo(2);
        r=a.send("PATCH","/api/v1/admin/books/"+id+"/publication",json(Map.of("version",b.path("version").asLong(),"status","ARCHIVED")),true);b=tree(r);assertThat(b.path("publishedAt")).isEqualTo(first);
        w=updateBody(b);w.put("weightG",null);r=a.send("PUT","/api/v1/admin/books/"+id,json(w),true);assertThat(r.statusCode()).isEqualTo(200);b=tree(r);assertThat(b.path("features").size()).isEqualTo(2);assertThat(b.path("publication").asString()).isEqualTo("ARCHIVED");
        w=updateBody(b);w.put("weightG",300);w.put("featureCodes",List.of("POP_UP","SOUND"));w.put("publishAfterSave",true);w.put("confirmedActualCopy",true);
        r=a.send("PUT","/api/v1/admin/books/"+id,json(w),true);assertThat(r.statusCode()).isEqualTo(200);b=tree(r);assertThat(b.path("publishedAt")).isEqualTo(first);assertThat(b.path("features").get(0).path("code").asString()).isEqualTo("POP_UP");
        w=updateBody(b);w.put("featureCodes",List.of());r=a.send("PUT","/api/v1/admin/books/"+id,json(w),true);assertThat(r.statusCode()).isEqualTo(200);assertThat(tree(r).path("features").size()).isZero();assertThat(tree(r).path("publication").asString()).isEqualTo("PUBLISHED");
    }
    @Test void replacementAtEightKeepsEightFinalPhotos() throws Exception {
        var a=api();var body=createBody(a,8);String session=body.get("uploadSessionId").toString();
        var photos=(List<Map<String,String>>)body.get("media");String old=photos.get(6).get("mediaId");
        var r=a.upload("/api/v1/admin/upload-sessions/"+session+"/media?replaceId="+old+"&requestKey="+UUID.randomUUID(),0,ImageValidatorTest.image("jpeg"),true);
        assertThat(r.statusCode()).isEqualTo(201);photos.set(6,Map.of("mediaId",tree(r).path("id").asString(),"role","INTERNAL_1"));
        assertThat(jdbc.queryForObject("select count(*) from temporary_media where session_id=? and state='READY'",Integer.class,UUID.fromString(session))).isEqualTo(8);
        assertThat(a.send("POST","/api/v1/admin/books",json(body),true).statusCode()).isEqualTo(201);
    }
    @Test void auditFailureRollsBackContentFeaturesAndMediaReassignment() throws Exception {
        var a=api();var body=createBody(a,2);
        body.put("write",JSON.convertValue(BookFixtures.write("Original","BOARD_BOOK",null,20000L,null,null,List.of(),List.of()),Map.class));
        var r=a.send("POST","/api/v1/admin/books",json(body),true);assertThat(r.statusCode()).isEqualTo(201);var b=tree(r);String id=b.path("id").asString();
        var w=updateBody(b);w.put("title","Changed");w.put("featureCodes",List.of("SOUND"));w.put("publishAfterSave",true);w.put("confirmedActualCopy",true);
        w.put("mediaMetadata",List.of(Map.of("mediaId",b.path("media").get(0).path("id").asString(),"alt","Changed alt","sourceRef","Changed source")));
        w.put("media",List.of(Map.of("mediaId",b.path("media").get(0).path("id").asString(),"role","BACK"),Map.of("mediaId",b.path("media").get(1).path("id").asString(),"role","FRONT")));
        jdbc.execute("alter table audit_event add constraint s043_reject_publish check(action<>'PUBLICATION_CHANGED')");
        try {assertThat(a.send("PUT","/api/v1/admin/books/"+id,json(w),true).statusCode()).isEqualTo(409);}
        finally {jdbc.execute("alter table audit_event drop constraint s043_reject_publish");}
        var current=tree(a.send("GET","/api/v1/admin/books/"+id,null,false));assertThat(current).isEqualTo(b);
        assertThat(a.send("PUT","/api/v1/admin/books/"+id,json(w),true).statusCode()).isEqualTo(200);
    }
    @Test void rejectsBadFeatureCodesAndMoreThanThreeAndPreservesSession() throws Exception {
        var a=api();var body=createBody(a,0);var w=(Map<String,Object>)body.get("write");
        for(Object codes:Arrays.asList(List.of("SOUND","SOUND"),List.of("FAKE"),List.of("SOUND","FLAP","SLIDE","SPIN"),"SOUND",null)) {
            w.put("featureCodes",codes);assertThat(a.send("POST","/api/v1/admin/books",json(body),true).statusCode()).isEqualTo(400);
        }
        w.put("featureCodes",List.of("TOUCH","SPIN"));var r=a.send("POST","/api/v1/admin/books",json(body),true);assertThat(r.statusCode()).isEqualTo(201);
        assertThat(tree(r).path("features").get(0).path("label").asString()).isEqualTo("Chạm & cảm nhận");
        w.put("featureCodes",List.of("SPIN","TOUCH"));assertThat(a.send("POST","/api/v1/admin/books",json(body),true).statusCode()).isEqualTo(409);
        assertThat(a.send("GET","/api/v1/admin/taxonomy",null,false).body()).contains("Âm thanh","POP_UP");
    }
}
