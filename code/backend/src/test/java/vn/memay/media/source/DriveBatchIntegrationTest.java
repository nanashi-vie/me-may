package vn.memay.media.source;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import vn.memay.auth.AdminUser;
import vn.memay.common.AdminApiException;
import static org.assertj.core.api.Assertions.*;

class DriveBatchIntegrationTest {
    @Test void frontendMatchPayloadCanOmitServerCapturedTargetSnapshot() {
        var input=tools.jackson.databind.json.JsonMapper.builder()
                .disable(tools.jackson.databind.MapperFeature.ALLOW_COERCION_OF_SCALARS).build().readValue("""
                {"mode":"MATCH","sessionId":null,"bookId":"578","bookVersion":6,
                 "fileIds":["source"],"targets":[{"mediaId":"ab351a89-20c6-4115-b0fc-42795d2cf5c4"}],
                 "requestKey":"78045d72-e538-4fc3-9b51-798395b715c4"}
                """,DriveBatchDtos.Create.class);
        assertThat(input.bookId()).isEqualTo("578");
        assertThat(input.targets().getFirst().generationId()).isNull();
        assertThat(input.targets().getFirst().bindingVersion()).isNull();
    }
    @Test void sameKeyReturnsSameOperationAndDifferentPayloadConflicts() {
        try (var f = new DriveBatchFixture()) {
            var key = UUID.randomUUID();
            var first = f.create(f.importing(key, "file-a", "file-b"));
            assertThat(f.create(f.importing(key, "file-a", "file-b")).id()).isEqualTo(first.id());
            assertThatThrownBy(() -> f.create(f.importing(key, "file-c"))).isInstanceOf(AdminApiException.class);
            assertThat(f.db.queryForObject("SELECT count(*) FROM temporary_media", Integer.class)).isEqualTo(2);
        }
    }
    @Test void explicitGenerationRequiresBindingVersion() {
        try(var f=new DriveBatchFixture()) {
            var target=new DriveBatchDtos.Target(UUID.randomUUID(),UUID.randomUUID(),null);
            var request=new DriveBatchDtos.Create(DriveBatchDtos.Mode.MATCH,f.session,null,null,
                    java.util.List.of("file"),java.util.List.of(target),UUID.randomUUID());
            assertThatThrownBy(()->f.create(request)).isInstanceOf(AdminApiException.class);
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
