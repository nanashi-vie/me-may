package vn.memay.media;

import org.junit.jupiter.api.Test;
import vn.memay.auth.AdminUser;
import vn.memay.catalogue.BookAccess;
import vn.memay.common.AdminApiException;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.LongStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class BookPhotoDownloadServiceTest {
    private final AdminUser owner = new AdminUser("owner@example.test", "unused", AdminUser.Role.OWNER);
    private final MediaTransactions transactions = mock(MediaTransactions.class);
    private final MediaReadService reads = mock(MediaReadService.class);
    private final BookPhotoDownloadService service = new BookPhotoDownloadService(new BookAccess(), transactions, reads);

    @Test
    void limitsTheSelectionToTwentyBooks() {
        var ids = LongStream.rangeClosed(1, 21).boxed().toList();
        assertThatThrownBy(() -> service.create(owner, ids))
                .isInstanceOfSatisfying(AdminApiException.class, error -> assertThat(error.status).isEqualTo(400));
    }

    @Test
    void rejectsConcurrentGenerationAndReleasesSlotAfterReadFailure() throws Exception {
        var ids = List.of(1L);
        when(transactions.downloadPhotos(ids)).thenReturn(List.of(new MediaTransactions.DownloadBook(
                "MM-000001", List.of(new MediaTransactions.DownloadPhoto(MediaDtos.MediaRole.FRONT, null, null, "cover")))));
        var entered = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var closed = new AtomicBoolean();
        InputStream broken = new InputStream() {
            private boolean firstRead = true;
            @Override public int read() {
                throw new UnsupportedOperationException();
            }
            @Override public int read(byte[] bytes) throws IOException {
                if (firstRead) {
                    firstRead = false;
                    bytes[0] = 1;
                    return 1;
                }
                entered.countDown();
                try {
                    if (!release.await(5, TimeUnit.SECONDS)) throw new AssertionError("Timed out waiting for test");
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new AssertionError(e);
                }
                throw new IOException("Connection lost after partial read");
            }
            @Override public void close() {
                closed.set(true);
            }
        };
        when(reads.openAdmin(null, null, "cover", 1280))
                .thenReturn(broken, new ByteArrayInputStream(new byte[]{1}));
        try (var executor = Executors.newSingleThreadExecutor()) {
            var running = executor.submit(() -> assertThatThrownBy(() -> service.create(owner, ids))
                    .isInstanceOfSatisfying(AdminApiException.class, error -> assertThat(error.status).isEqualTo(502)));
            try {
                assertThat(entered.await(5, TimeUnit.SECONDS)).isTrue();
                assertThatThrownBy(() -> service.create(owner, ids))
                        .isInstanceOfSatisfying(AdminApiException.class, error -> assertThat(error.status).isEqualTo(429));
            } finally {
                release.countDown();
            }
            running.get(5, TimeUnit.SECONDS);
        }
        assertThat(closed).isTrue();
        assertThat(service.create(owner, ids).content()).isNotEmpty();
    }
}
