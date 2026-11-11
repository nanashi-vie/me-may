package vn.memay.media;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.*;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.*;
import vn.memay.media.source.*;
import vn.memay.support.AdminHttpClient;
import vn.memay.support.BookFixtures;
import static org.assertj.core.api.Assertions.*;
import static vn.memay.support.AdminHttpClient.*;

@TestPropertySource(properties={"memay.media.local.enabled=true",
        "memay.media.local.recipe=drive-import-fixture","memay.media.drive-batch.initial-delay-ms=1000","memay.media.recovery.poll-delay-ms=50"})
@Import(DriveBatchRecoveryTest.DriveFixture.class)
@DirtiesContext
class DriveBatchRecoveryTest extends MediaTestSupport {
    @TempDir static Path root;
    @Value("${local.server.port}") int port;
    @Autowired ImageJobService worker;
    @Autowired AtomicInteger sourceDownloads;
    static final String DIGEST="sha256:"+"a".repeat(64), CONFIG="b".repeat(64);
    @DynamicPropertySource static void root(DynamicPropertyRegistry registry) {
        registry.add("memay.media.local.root",()-> { try { return root.toRealPath().toString(); } catch (Exception e) { throw new IllegalStateException(e); } });
    }
    @TestConfiguration static class DriveFixture {
        @Bean AtomicInteger sourceDownloads() { return new AtomicInteger(); }
        @Bean @Primary DriveSourceClient drive(LocalImageStore store, AtomicInteger sourceDownloads) {
            return new DriveSourceClient() {
                public DownloadedSource download(String file,UUID operation) {
                    try {
                        sourceDownloads.incrementAndGet();
                        var staged=store.stage(operation,new java.io.ByteArrayInputStream(ImageValidatorTest.image("jpeg")));
                        return new DownloadedSource(staged.key(),staged.sha256(),staged.bytes(),"image/jpeg","1");
                    } catch(Exception e) { throw new IllegalStateException(e); }
                }
                public DriveSourceMetadata inspect(String file) {
                    try { return new DriveSourceMetadata(file,"1",ImageValidatorTest.image("jpeg").length,"image/jpeg"); }
                    catch(Exception e) { throw new IllegalStateException(e); }
                }
            };
        }
    }
    @Test void linkOnlyImportSavesVerifiedBindingAndRebuildsLostDerived() throws Exception {
        jdbc.update("DELETE FROM image_job");
        sourceDownloads.set(0);
        jdbc.update("INSERT INTO image_recipe VALUES('drive-import-fixture',?,jsonb_build_object('sha256',?::text)) ON CONFLICT DO NOTHING",DIGEST,CONFIG);
        var api=new AdminHttpClient(port);api.login(owner.getEmail());
        String session=tree(api.send("POST","/api/v1/admin/upload-sessions","{}",true)).path("id").asString();
        String endpoint="/api/v1/admin/drive-image-batches";
        var created=api.send("POST",endpoint,json(Map.of("mode","IMPORT","sessionId",session,
                "fileIds",List.of("back-source","front-source"),"requestKey",UUID.randomUUID())),true);
        assertThat(created.statusCode()).isEqualTo(202);
        String batchId=tree(created).path("id").asString();
        for(int i=0;i<2;i++) finish(awaitJob());
        String batchPath=endpoint+"/"+batchId;
        tools.jackson.databind.JsonNode ready=null;
        for(int i=0;i<80;i++) {
            ready=tree(api.send("GET",batchPath,null,false));
            if ("READY".equals(ready.path("state").asString())) break;
            Thread.sleep(50);
        }
        assertThat(ready.path("state").asString()).isEqualTo("READY");
        var first=ready.path("items").get(0);var second=ready.path("items").get(1);
        var roles=List.of(Map.of("itemId",first.path("id").asString(),"mediaId",first.path("mediaId").asString(),"role","BACK"),
                Map.of("itemId",second.path("id").asString(),"mediaId",second.path("mediaId").asString(),"role","FRONT"));
        var write=BookFixtures.write("Imported from Drive","BOARD_BOOK",null,20000L,null,null,List.of(),List.of());
        var bookInput=Map.of("uploadSessionId",session,"write",write,"publication","ARCHIVED","confirmedActualCopy",true,
                "media",List.of(Map.of("mediaId",first.path("mediaId").asString(),"role","BACK"),
                        Map.of("mediaId",second.path("mediaId").asString(),"role","FRONT")));
        assertThat(api.send("POST","/api/v1/admin/books",json(bookInput),true).statusCode()).isEqualTo(400);
        String confirmation=json(Map.of("requestKey",UUID.randomUUID(),"digest",ready.path("digest").asString(),"selections",roles));
        assertThat(api.send("POST",batchPath+"/confirm",confirmation,true).statusCode()).isEqualTo(200);
        assertThat(sourceDownloads.get()).isEqualTo(2);
        var saved=api.send("POST","/api/v1/admin/books",json(bookInput),true);
        assertThat(saved.statusCode()).isEqualTo(201);
        assertThat(api.send("POST",batchPath+"/confirm",confirmation,true).statusCode()).isEqualTo(200);
        UUID media=UUID.fromString(second.path("mediaId").asString());
        UUID generation=jdbc.queryForObject("SELECT serving_generation FROM book_media WHERE id=?",UUID.class,media);
        assertThat(jdbc.queryForObject("SELECT status FROM image_source_binding WHERE media_id=?",String.class,media)).isEqualTo("VERIFIED");
        Path folder=root.resolve("derived/"+media+"/"+generation);
        Files.delete(folder.resolve("480.jpg"));Files.delete(folder.resolve("1280.jpg"));Files.delete(folder);
        var rebuild=api.send("POST","/api/v1/admin/image-recovery/rebuild",
                json(Map.of("mediaIds",List.of(media),"apply",true,"requestKey",UUID.randomUUID())),true);
        assertThat(rebuild.statusCode()).isEqualTo(202);
        var recovery=awaitJob();
        assertThat(recovery.kind()).isEqualTo(ImageTypes.JobKind.REBUILD);
        assertThat(recovery.generationId()).isEqualTo(generation);
        finish(recovery);
        assertThat(Files.readAllBytes(folder.resolve("480.jpg"))).isEqualTo(ImageValidatorTest.image("jpeg"));
        assertThat(sourceDownloads.get()).isEqualTo(3);
    }
    @Test void savedBookAcceptsFiveImportedPhotosOneAtATimeAndKeepsReceiptAfterReload() throws Exception {
        jdbc.update("DELETE FROM image_job");
        sourceDownloads.set(0);
        jdbc.update("INSERT INTO image_recipe VALUES('drive-import-fixture',?,jsonb_build_object('sha256',?::text)) ON CONFLICT DO NOTHING",DIGEST,CONFIG);
        var book=seed(owner,BookFixtures.draft("Saved book without photos"));
        var api=new AdminHttpClient(port);api.login(owner.getEmail());
        String session=tree(api.send("POST","/api/v1/admin/upload-sessions","{}",true)).path("id").asString();
        var created=api.send("POST","/api/v1/admin/drive-image-batches",json(Map.of("mode","IMPORT","sessionId",session,
                "fileIds",List.of("back","cover","spine","inside-one","inside-two"),"requestKey",UUID.randomUUID())),true);
        assertThat(created.statusCode()).isEqualTo(202);
        String batchPath="/api/v1/admin/drive-image-batches/"+tree(created).path("id").asString();
        for(int i=0;i<5;i++) finish(awaitJob());
        tools.jackson.databind.JsonNode ready=null;
        for(int i=0;i<80;i++) {
            ready=tree(api.send("GET",batchPath,null,false));
            if("READY".equals(ready.path("state").asString())) break;
            Thread.sleep(50);
        }
        assertThat(ready.path("state").asString()).isEqualTo("READY");
        var roles=List.of("BACK","FRONT","SPINE","INSIDE_1","INSIDE_2");
        var selections=new ArrayList<Map<String,String>>();
        for(int i=0;i<5;i++) {
            var item=ready.path("items").get(i);
            selections.add(Map.of("itemId",item.path("id").asString(),"mediaId",item.path("mediaId").asString(),"role",roles.get(i)));
        }
        String bookPath="/api/v1/admin/books/"+book.id();
        var first=selections.getFirst();
        String firstCommit=bookPath+"/media/replacements/"+first.get("mediaId")+"/commit";
        assertThat(api.send("POST",firstCommit,json(Map.of("version",book.version(),"role","BACK","requestKey",UUID.randomUUID())),true).statusCode()).isEqualTo(409);
        String confirmation=json(Map.of("requestKey",UUID.randomUUID(),"digest",ready.path("digest").asString(),"selections",selections));
        assertThat(api.send("POST",batchPath+"/confirm",confirmation,true).statusCode()).isEqualTo(200);
        assertThat(tree(api.send("GET",bookPath,null,false)).path("media").size()).isZero();
        long version=book.version();
        for(int i=0;i<5;i++) {
            var selected=selections.get(i);
            String path=bookPath+"/media/replacements/"+selected.get("mediaId")+"/commit";
            String body=json(Map.of("version",version,"role",selected.get("role"),"requestKey",selected.get("itemId")));
            var committed=api.send("POST",path,body,true);
            assertThat(committed.statusCode()).as(committed.body()).isEqualTo(200);
            version=tree(committed).path("version").asLong();
            assertThat(tree(api.send("POST",path,body,true)).path("version").asLong()).isEqualTo(version);
            assertThat(tree(api.send("GET",bookPath,null,false)).path("media").size()).isEqualTo(i+1);
        }
        assertThat(tree(api.send("GET",batchPath,null,false)).path("state").asString()).isEqualTo("CONFIRMED");
        assertThat(api.send("POST",batchPath+"/confirm",confirmation,true).statusCode()).isEqualTo(200);
        assertThat(tree(api.send("GET","/api/v1/admin/upload-sessions/"+session,null,false)).path("media").size()).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM image_source_binding WHERE status='VERIFIED' AND media_id IN (SELECT id FROM book_media WHERE book_copy_id=?)",Integer.class,Long.parseLong(book.id()))).isEqualTo(5);
        assertThat(sourceDownloads.get()).isEqualTo(5);
        // Model local uploads attached without Drive verification, as in the owner's flow.
        jdbc.update("DELETE FROM image_source_binding WHERE media_id IN (SELECT id FROM book_media WHERE book_copy_id=?)",Long.parseLong(book.id()));
        var matching=api.send("POST","/api/v1/admin/drive-image-batches",json(Map.of(
                "mode","MATCH","bookId",book.id(),"bookVersion",version,
                "fileIds",List.of("inside-two","cover","back","inside-one","spine"),
                "targets",selections.stream().map(s->Map.of("mediaId",s.get("mediaId"))).toList(),
                "requestKey",UUID.randomUUID())),true);
        assertThat(matching.statusCode()).as(matching.body()).isEqualTo(202);
        String matchPath="/api/v1/admin/drive-image-batches/"+tree(matching).path("id").asString();
        tools.jackson.databind.JsonNode matched=null;
        for(int i=0;i<150;i++) {
            matched=tree(api.send("GET",matchPath,null,false));
            if("READY".equals(matched.path("state").asString())) break;
            Thread.sleep(100);
        }
        assertThat(matched.path("state").asString()).isEqualTo("READY");
        var pairs=new ArrayList<DriveBatchDtos.Selection>();
        for(int i=0;i<5;i++) {
            var item=matched.path("items").get(i);
            assertThat(item.path("candidates").size()).isEqualTo(5);
            pairs.add(new DriveBatchDtos.Selection(UUID.fromString(item.path("id").asString()),UUID.fromString(selections.get(i).get("mediaId")),null));
        }
        String confirmMatch=json(Map.of("requestKey",UUID.randomUUID(),"digest",matched.path("digest").asString(),"selections",pairs));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM image_source_binding WHERE media_id IN (SELECT id FROM book_media WHERE book_copy_id=?)",Integer.class,Long.parseLong(book.id()))).isZero();
        var matchedResult=api.send("POST",matchPath+"/confirm",confirmMatch,true);
        assertThat(matchedResult.statusCode()).as(matchedResult.body()).isEqualTo(200);
        assertThat(tree(matchedResult).path("bookVersion").asLong()).isEqualTo(version+1);
        assertThat(api.send("POST",matchPath+"/confirm",confirmMatch,true).statusCode()).isEqualTo(200);
        assertThat(tree(api.send("GET",bookPath,null,false)).path("version").asLong()).isEqualTo(version+1);
        for(int i=0;i<5;i++) {
            var binding=jdbc.queryForMap("SELECT file_id,status FROM image_source_binding WHERE media_id=?",pairs.get(i).mediaId());
            assertThat(binding.get("status")).isEqualTo("VERIFIED");
            assertThat(binding.get("file_id")).isEqualTo(matched.path("items").get(i).path("fileId").asString());
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM image_job WHERE kind='PROCESS'",Integer.class)).isEqualTo(5);
        assertThat(sourceDownloads.get()).isEqualTo(10);
    }
    ImageTypes.JobLease awaitJob() throws Exception {
        for(int i=0;i<200;i++) {
            var job=worker.claim();
            if(job.isPresent()) return job.get();
            Thread.sleep(30);
        }
        throw new AssertionError("No PROCESS/REBUILD job");
    }
    void finish(ImageTypes.JobLease job) throws Exception {
        if (job.kind()==ImageTypes.JobKind.PROCESS)
            assertThat(jdbc.queryForObject("SELECT state FROM temporary_media WHERE id=?",String.class,job.mediaId())).isEqualTo("UPLOADING");
        byte[] jpeg=ImageValidatorTest.image("jpeg");
        String hash=HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(jpeg));
        Path output=Files.createDirectories(root.resolve("staging/"+job.token()+"/output"));
        var variants=new ArrayList<ImageTypes.Variant>();
        for(String size:List.of("480","1280")) {
            Files.write(output.resolve(size+".jpg"),jpeg);
            variants.add(new ImageTypes.Variant(size,"derived/"+job.mediaId()+"/"+job.generationId()+"/"+size+".jpg",
                    "image/jpeg",3,2,jpeg.length,hash));
        }
        worker.complete(job.jobId(),job.token(),new ImageTypes.Manifest(job.mediaId(),job.generationId(),
                job.recipeVersion(),variants,DIGEST,CONFIG));
    }
}
