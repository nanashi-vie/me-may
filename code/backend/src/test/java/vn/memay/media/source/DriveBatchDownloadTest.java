package vn.memay.media.source;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import vn.memay.common.AdminApiException;
import static org.assertj.core.api.Assertions.*;

class DriveBatchDownloadTest {
    @Test void restartReclaimsItemAndStaleLeaseCannotComplete() {
        try (var f = new DriveBatchFixture()) {
            f.create(f.importing(UUID.randomUUID(), "file-a"));
            var repo = new DriveBatchRepository(f.db);
            var first = f.tx.execute(t -> repo.claim("memay/test")).orElseThrow();
            var blocked = f.tx.execute(t -> repo.claim("memay/test"));
            assertThat(blocked).isEmpty();
            f.db.update("UPDATE drive_image_batch_item SET lease_until=now()-interval '1 second'");
            var second = f.tx.execute(t -> repo.claim("memay/test")).orElseThrow();
            assertThat(second.itemId()).isEqualTo(first.itemId());
            assertThat(second.token()).isNotEqualTo(first.token());
            assertThatThrownBy(() -> f.tx.executeWithoutResult(t -> repo.lockLease(first)))
                    .isInstanceOf(AdminApiException.class);
            f.tx.executeWithoutResult(t -> repo.fail(second, "ACCESS_ERROR", false));
            assertThat(f.db.queryForObject("SELECT state FROM drive_image_batch_item", String.class)).isEqualTo("FAILED");
        }
    }
    @Test void retryableErrorKeepsReservationAndThreeAttemptsTerminate() {
        try (var f = new DriveBatchFixture()) {
            f.create(f.importing(UUID.randomUUID(), "file-a"));
            var repo = new DriveBatchRepository(f.db);
            for (int i = 0; i < 3; i++) {
                var lease = f.tx.execute(t -> repo.claim("memay/test")).orElseThrow();
                f.tx.executeWithoutResult(t -> repo.fail(lease, "ACCESS_ERROR", true));
                f.db.update("UPDATE drive_image_batch_item SET available_at=now()");
            }
            assertThat(f.db.queryForObject("SELECT attempts FROM drive_image_batch_item", Integer.class)).isEqualTo(3);
            assertThat(f.db.queryForObject("SELECT state FROM drive_image_batch_item", String.class)).isEqualTo("FAILED");
            assertThat(f.db.queryForObject("SELECT state FROM temporary_media", String.class)).isEqualTo("DELETE_PENDING");
        }
    }
}
