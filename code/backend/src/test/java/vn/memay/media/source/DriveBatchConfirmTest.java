package vn.memay.media.source;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import vn.memay.media.MediaDtos.MediaRole;
import vn.memay.common.AdminApiException;
import static vn.memay.media.source.DriveBatchDtos.*;
import static org.assertj.core.api.Assertions.*;

class DriveBatchConfirmTest {
    @Test void shuffledEightSourcesMatchHashesWithoutChangingMediaRoles() {
        try(var f=new DriveBatchFixture()) {
            f.db.update("INSERT INTO book_copy(id,book_code,title,availability) VALUES(1,'MM-000001','Book','AVAILABLE')");
            var roles=List.of("FRONT","BACK","SPINE","INSIDE_1","INSIDE_2","INSIDE_3","INSIDE_4","INSIDE_5");
            var media=new java.util.ArrayList<UUID>();
            var targets=new java.util.ArrayList<Target>();
            for(int i=0;i<8;i++) {
                UUID id=UUID.randomUUID(),generation=UUID.randomUUID();media.add(id);
                f.db.update("INSERT INTO image_asset VALUES(?)",id);
                f.db.update("INSERT INTO image_generation(id,media_id,recipe_version,input_sha256,published_at) VALUES(?,?,'v1',?,now())",generation,id,Integer.toString(i).repeat(64));
                f.db.update("INSERT INTO book_media(id,book_copy_id,role,state,storage_public_id,provider,serving_generation) VALUES(?,1,?,'ACTIVE',?,'LOCAL',?)",id,roles.get(i),id.toString(),generation);
                targets.add(new Target(id,null,null));
            }
            var files=java.util.stream.IntStream.range(0,8).mapToObj(i->"file-"+(7-i)).toList();
            var batch=f.create(new Create(Mode.MATCH,null,"1",0L,files,targets,UUID.randomUUID()));
            var repo=new DriveBatchRepository(f.db);
            for(int i=0;i<8;i++) {
                var lease=f.tx.execute(t->repo.claim("memay/test")).orElseThrow();
                int index=7-i;
                f.tx.executeWithoutResult(t->f.batches.completeDownload(lease,
                        new DownloadedSource("fixture",Integer.toString(index).repeat(64),3,"image/jpeg","1"),f.actor,null));
            }
            var view=f.tx.execute(t->f.batches.status(batch.id(),f.actor));
            var pairs=new java.util.ArrayList<Selection>();
            for(int i=0;i<8;i++) {
                assertThat(view.items().get(i).candidates()).containsExactly(media.get(7-i));
                pairs.add(new Selection(view.items().get(i).id(),media.get(7-i),null));
            }
            var metadata=files.stream().map(file->new DriveSourceMetadata(file,"1",3,"image/jpeg")).toList();
            var result=f.tx.execute(t->f.batches.confirmChecked(batch.id(),new Confirm(UUID.randomUUID(),view.digest(),pairs),f.actor,metadata));
            assertThat(result.bookVersion()).isEqualTo(1);
            for(int i=0;i<8;i++) {
                assertThat(f.bindings.find(media.get(i)).orElseThrow().fileId()).isEqualTo("file-"+i);
                assertThat(f.db.queryForObject("SELECT role FROM book_media WHERE id=?",String.class,media.get(i))).isEqualTo(roles.get(i));
            }
        }
    }
    UUID readyImport(DriveBatchFixture f, UUID batch) {
        var item=f.db.queryForMap("SELECT * FROM drive_image_batch_item WHERE batch_id=? ORDER BY ordinal LIMIT 1",batch);
        UUID media=(UUID)item.get("media_id"), generation=UUID.randomUUID();
        String sha="a".repeat(64);
        f.db.update("INSERT INTO image_asset VALUES(?)",media);
        f.db.update("INSERT INTO image_generation(id,media_id,recipe_version,input_sha256,published_at) VALUES(?,?,'v1',?,now())",
                generation,media,sha);
        f.db.update("UPDATE temporary_media SET state='READY',asset_id='fixture',format='jpg',bytes=3,width=1,height=1,generation_id=? WHERE id=?",generation,media);
        f.db.update("""
                UPDATE drive_image_batch_item SET state='READY',generation_id=?,sha256=?,source_version='1',
                  source_bytes=3,mime='image/jpeg',candidates=cast(? as jsonb) WHERE id=?
                """,generation,sha,f.json.writeValueAsString(List.of(media)),item.get("id"));
        f.jobs.enqueue(media,generation,vn.memay.media.ImageTypes.JobKind.PROCESS,
                "staging/"+UUID.randomUUID()+"/input","v1","fixture:"+media,0);
        f.db.update("UPDATE image_job SET status='READY' WHERE media_id=?",media);
        return media;
    }
    @Test void forgedReadyMediaCannotFinalizeAndConfirmCommitsOnce() {
        try(var f=new DriveBatchFixture()) {
            var batch=f.create(f.importing(UUID.randomUUID(),"file-a"));
            UUID media=readyImport(f,batch.id());
            assertThatThrownBy(()->f.tx.executeWithoutResult(t->f.sessions.requireAdmitted(media)))
                    .isInstanceOf(AdminApiException.class);
            assertThat(f.tx.execute(t->f.sessions.get(f.session,f.actor)).media()).isEmpty();
            var view=f.tx.execute(t->f.batches.status(batch.id(),f.actor));
            var selected=new Selection(view.items().getFirst().id(),media,MediaRole.FRONT);
            var confirm=new Confirm(UUID.randomUUID(),view.digest(),List.of(selected));
            var metadata=List.of(new DriveSourceMetadata("file-a","1",3,"image/jpeg"));
            var result=f.tx.execute(t->f.batches.confirmChecked(batch.id(),confirm,f.actor,metadata));
            assertThat(result.state()).isEqualTo("CONFIRMED");
            assertThat(f.bindings.find(media).orElseThrow().bindingVersion()).isEqualTo(1);
            f.tx.executeWithoutResult(t->f.sessions.requireAdmitted(media));
            f.db.update("INSERT INTO book_copy(id,book_code,title,availability) VALUES(1,'MM-000001','Book','AVAILABLE')");
            f.tx.executeWithoutResult(t->f.sessions.consumeReady(media,1,MediaRole.FRONT,"Front"));
            assertThat(f.bindings.find(media)).isPresent();
            var replay=f.tx.execute(t->f.batches.confirmChecked(batch.id(),confirm,f.actor,List.of()));
            assertThat(replay).isEqualTo(result);
            assertThat(f.db.queryForObject("SELECT count(*) FROM audit_event WHERE action='SOURCE_VERIFIED'",Integer.class)).isEqualTo(1);
        }
    }
    @Test void sourceChangedBeforeConfirmRejectedAndPartialSuccessConfirmsSelectedOnly() {
        try(var f=new DriveBatchFixture()) {
            var batch=f.create(f.importing(UUID.randomUUID(),"file-a","file-b"));
            f.db.update("UPDATE drive_image_batch_item SET state='FAILED' WHERE file_id='file-b'");
            UUID media=readyImport(f,batch.id());
            var view=f.tx.execute(t->f.batches.status(batch.id(),f.actor));
            var selected=new Selection(view.items().getFirst().id(),media,MediaRole.FRONT);
            var confirm=new Confirm(UUID.randomUUID(),view.digest(),List.of(selected));
            assertThatThrownBy(()->f.tx.execute(t->f.batches.confirmChecked(batch.id(),confirm,f.actor,
                    List.of(new DriveSourceMetadata("file-a","2",3,"image/jpeg")))))
                    .isInstanceOf(AdminApiException.class);
            assertThat(f.bindings.find(media)).isEmpty();
            f.tx.execute(t->f.batches.confirmChecked(batch.id(),confirm,f.actor,
                    List.of(new DriveSourceMetadata("file-a","1",3,"image/jpeg"))));
            assertThat(f.db.queryForObject("SELECT count(*) FROM temporary_media WHERE state='DELETE_PENDING'",Integer.class)).isEqualTo(1);
        }
    }
    @Test void duplicateHashRequiresOneToOneSelectionAndBookVersionChangesOnce() {
        try(var f=new DriveBatchFixture()) {
            f.db.update("INSERT INTO book_copy(id,book_code,title,availability) VALUES(1,'MM-000001','Book','AVAILABLE')");
            UUID[] media={UUID.randomUUID(),UUID.randomUUID()}, generations={UUID.randomUUID(),UUID.randomUUID()};
            for(int i=0;i<2;i++) {
                f.db.update("INSERT INTO image_asset VALUES(?)",media[i]);
                f.db.update("INSERT INTO image_generation(id,media_id,recipe_version,input_sha256,published_at) VALUES(?,?,'v1',?,now())",generations[i],media[i],"a".repeat(64));
                f.db.update("INSERT INTO book_media(id,book_copy_id,role,state,storage_public_id,provider,serving_generation) VALUES(?,1,?,'ACTIVE',?,'LOCAL',?)",media[i],i==0?"FRONT":"BACK",media[i].toString(),generations[i]);
            }
            var request=new Create(Mode.MATCH,null,"1",0L,List.of("file-a","file-b"),
                    List.of(new Target(media[0],generations[0],0L),new Target(media[1],generations[1],0L)),UUID.randomUUID());
            var batch=f.create(request);
            var repo=new DriveBatchRepository(f.db);
            for(int i=0;i<2;i++) {
                var lease=f.tx.execute(t->repo.claim("memay/test")).orElseThrow();
                f.tx.executeWithoutResult(t->f.batches.completeDownload(lease,
                        new DownloadedSource("fixture","a".repeat(64),3,"image/jpeg","1"),f.actor,null));
            }
            var view=f.tx.execute(t->f.batches.status(batch.id(),f.actor));
            assertThat(view.items().getFirst().candidates()).containsExactlyInAnyOrder(media);
            var same=new Confirm(UUID.randomUUID(),view.digest(),List.of(
                    new Selection(view.items().get(0).id(),media[0],null),
                    new Selection(view.items().get(1).id(),media[0],null)));
            var metadata=List.of(new DriveSourceMetadata("file-a","1",3,"image/jpeg"),
                    new DriveSourceMetadata("file-b","1",3,"image/jpeg"));
            assertThatThrownBy(()->f.tx.execute(t->f.batches.confirmChecked(batch.id(),same,f.actor,metadata)))
                    .isInstanceOf(AdminApiException.class);
            var distinct=new Confirm(UUID.randomUUID(),view.digest(),List.of(
                    new Selection(view.items().get(0).id(),media[1],null),
                    new Selection(view.items().get(1).id(),media[0],null)));
            f.tx.execute(t->f.batches.confirmChecked(batch.id(),distinct,f.actor,metadata));
            assertThat(f.db.queryForObject("SELECT version FROM book_copy WHERE id=1",Long.class)).isEqualTo(1);
            assertThat(f.bindings.find(media[0]).orElseThrow().fileId()).isEqualTo("file-b");
        }
    }

}
