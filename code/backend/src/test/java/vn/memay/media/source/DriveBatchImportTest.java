package vn.memay.media.source;

import java.nio.file.Path;
import java.io.ByteArrayInputStream;
import java.time.Clock;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.support.StaticListableBeanFactory;
import vn.memay.media.*;
import static org.assertj.core.api.Assertions.*;

class DriveBatchImportTest {
    @TempDir Path root;
    LocalUploadService uploads(DriveBatchFixture f, LocalImageStore store) {
        var beans = new StaticListableBeanFactory();
        beans.addBean("store",store);
        beans.addBean("jobs",new ImageJobService(f.jobs,store,null));
        return new LocalUploadService(f.db,f.sessions,beans.getBeanProvider(LocalImageStore.class),
                beans.getBeanProvider(ImageJobService.class),new UploadLimiter(Clock.systemUTC()),f.json,"v1");
    }
    @Test void importReusesDownloadedBytesAndRejectsLateDownload() throws Exception {
        try (var f = new DriveBatchFixture()) {
            var batch = f.create(f.importing(UUID.randomUUID(),"a"));
            var repository = new DriveBatchRepository(f.db);
            var lease = f.tx.execute(t -> repository.claim("memay/test")).orElseThrow();
            var store = new LocalImageStore(root.toRealPath());
            var staged = store.stage(lease.token(),new ByteArrayInputStream("original".getBytes()));
            var source = new DownloadedSource(staged.key(),staged.sha256(),staged.bytes(),"image/jpeg","1");
            f.tx.executeWithoutResult(t -> f.batches.completeDownload(lease,source,f.actor,uploads(f,store)));
            assertThat(f.db.queryForObject("SELECT input_key FROM image_job",String.class)).isEqualTo(staged.key());
            assertThat(f.db.queryForObject("SELECT state FROM drive_image_batch_item",String.class)).isEqualTo("ENCODING");
            assertThat(root.resolve(staged.key())).exists();
            assertThat(f.bindings.find(lease.mediaId())).isEmpty();
            assertThatThrownBy(() -> f.tx.executeWithoutResult(t ->
                    f.batches.completeDownload(lease,source,f.actor,uploads(f,store)))).isInstanceOf(RuntimeException.class);
        }
    }
    @Test void expiredSessionRejectsDownloadAndCancelReleasesSlots() throws Exception {
        try (var f = new DriveBatchFixture()) {
            f.create(f.importing(UUID.randomUUID(),"a"));
            var repo = new DriveBatchRepository(f.db);
            var lease = f.tx.execute(t -> repo.claim("memay/test")).orElseThrow();
            f.db.update("UPDATE upload_session SET state='CANCELLED'");
            var store = new LocalImageStore(root.toRealPath());
            var staged = store.stage(lease.token(),new ByteArrayInputStream("original".getBytes()));
            var source = new DownloadedSource(staged.key(),staged.sha256(),staged.bytes(),"image/jpeg","1");
            assertThatThrownBy(() -> f.tx.executeWithoutResult(t ->
                    f.batches.completeDownload(lease,source,f.actor,uploads(f,store)))).isInstanceOf(RuntimeException.class);
            f.tx.executeWithoutResult(t -> repo.expire());
            assertThat(f.db.queryForObject("SELECT state FROM drive_image_batch_item",String.class)).isEqualTo("CANCELLED");
            assertThat(f.db.queryForObject("SELECT state FROM temporary_media",String.class)).isEqualTo("DELETE_PENDING");
        }
    }
}
