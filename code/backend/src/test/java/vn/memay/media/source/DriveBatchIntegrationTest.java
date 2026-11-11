package vn.memay.media.source;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import vn.memay.auth.AdminUser;
import vn.memay.common.AdminApiException;
import static org.assertj.core.api.Assertions.*;

class DriveBatchIntegrationTest {
    @Test void sameKeyReturnsSameOperationAndDifferentPayloadConflicts() {
        try (var f = new DriveBatchFixture()) {
            var key = UUID.randomUUID();
            var first = f.create(f.importing(key, "file-a", "file-b"));
            assertThat(f.create(f.importing(key, "file-a", "file-b")).id()).isEqualTo(first.id());
            assertThatThrownBy(() -> f.create(f.importing(key, "file-c"))).isInstanceOf(AdminApiException.class);
            assertThat(f.db.queryForObject("SELECT count(*) FROM temporary_media", Integer.class)).isEqualTo(2);
        }
    }
    @Test void createRejectsNinthReservedImageAndDuplicateFileIds() {
        try (var f = new DriveBatchFixture()) {
            assertThatThrownBy(() -> f.create(f.importing(UUID.randomUUID(), "same", "same")))
                    .isInstanceOf(AdminApiException.class);
            f.create(f.importing(UUID.randomUUID(), "a", "b", "c", "d", "e", "f", "g", "h"));
            assertThatThrownBy(() -> f.create(f.importing(UUID.randomUUID(), "ninth")))
                    .isInstanceOfSatisfying(AdminApiException.class, e -> assertThat(e.error).isEqualTo("media_limit"));
            assertThat(f.db.queryForObject("SELECT count(*) FROM temporary_media", Integer.class)).isEqualTo(8);
        }
    }
    @Test void ownerCannotReadOtherBatch() {
        try (var f = new DriveBatchFixture()) {
            var view = f.create(f.importing(UUID.randomUUID(), "file-a"));
            var other = new AdminUser("other@test.local", "fixture", AdminUser.Role.OWNER);
            ReflectionTestUtils.setField(other, "id", f.actor.getId() + 1);
            assertThatThrownBy(() -> f.tx.execute(t -> f.batches.status(view.id(), other)))
                    .isInstanceOf(AdminApiException.class);
        }
    }
    @Test void concurrentCreateCannotExceedEightSlots() throws Exception {
        try (var f = new DriveBatchFixture(); var executor = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var futures = java.util.stream.IntStream.range(0, 2).mapToObj(i -> executor.submit(() -> {
                try {
                    f.create(f.importing(UUID.randomUUID(), "a", "b", "c", "d", "e"));
                    return true;
                } catch (AdminApiException e) { return false; }
            })).toList();
            assertThat(futures.get(0).get() ^ futures.get(1).get()).isTrue();
            assertThat(f.db.queryForObject("SELECT count(*) FROM temporary_media", Integer.class)).isEqualTo(5);
        }
    }
}
