package vn.memay.media;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import vn.memay.support.AdminHttpClient;
import vn.memay.support.BookFixtures;

import java.io.ByteArrayInputStream;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.zip.ZipInputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static vn.memay.support.AdminHttpClient.json;

class BookPhotoDownloadTest extends MediaTestSupport {
    private static final String DOWNLOAD = "/api/v1/admin/books/photo-download?ids=";

    @Value("${local.server.port}") int port;

    @Test
    void downloadsOneOrManyBooksWithHiddenPhotosAndReportsEmptyBooks() throws Exception {
        var first = seed(owner, BookFixtures.draft("First"));
        var second = seed(owner, BookFixtures.draft("Second"));
        var empty = seed(owner, BookFixtures.draft("Empty"));
        byte[] jpeg = ImageValidatorTest.image("jpeg");
        var front = media.upload(Long.parseLong(first.id()), MediaDtos.MediaRole.FRONT,
                first.version(), owner, jpeg, null, null);
        media.upload(Long.parseLong(first.id()), MediaDtos.MediaRole.INSIDE_4,
                front.version(), owner, jpeg, null, null);
        media.upload(Long.parseLong(second.id()), MediaDtos.MediaRole.BACK,
                second.version(), owner, jpeg, null, null);

        var api = new AdminHttpClient(port);
        assertThat(api.download(DOWNLOAD + first.id()).statusCode()).isEqualTo(401);
        api.login("staff@catalogue.test");
        assertThat(api.download(DOWNLOAD + first.id()).statusCode()).isEqualTo(403);
        api.login("owner@catalogue.test");

        var single = api.download(DOWNLOAD + first.id());
        assertThat(single.statusCode()).isEqualTo(200);
        assertThat(single.headers().firstValue("Content-Disposition")).hasValue(
                "attachment; filename=\"" + first.bookCode() + ".zip\"");
        assertThat(single.headers().firstValue("Cache-Control")).hasValue("no-store");
        var multiple = api.download(DOWNLOAD + first.id() + "&ids=" + second.id() + "&ids=" + empty.id());
        assertThat(multiple.statusCode()).isEqualTo(200);
        assertThat(multiple.headers().firstValue("Content-Type")).hasValue("application/zip");
        assertThat(multiple.headers().firstValue("Content-Disposition")).hasValue(
                "attachment; filename=\"me-may-anh-sach.zip\"");
        assertThat(multiple.headers().firstValue("X-Missing-Book-Codes")).hasValue(empty.bookCode());
        Map<String, byte[]> files = new LinkedHashMap<>();
        try (var zip = new ZipInputStream(new ByteArrayInputStream(multiple.body()))) {
            for (var entry = zip.getNextEntry(); entry != null; entry = zip.getNextEntry()) {
                files.put(entry.getName(), zip.readAllBytes());
            }
        }
        assertThat(files).containsOnlyKeys(first.bookCode() + "/FRONT.jpg",
                first.bookCode() + "/INSIDE_4.jpg", second.bookCode() + "/BACK.jpg");
        files.values().forEach(bytes -> assertThat(bytes).isEqualTo(jpeg));
    }

    @Test
    void rejectsInvalidSelectionsAndProviderFailureBeforeReturningZip() throws Exception {
        var book = seed(owner, BookFixtures.draft("Book"));
        var api = new AdminHttpClient(port);
        api.login("owner@catalogue.test");
        assertThat(api.download(DOWNLOAD + book.id() + "&ids=" + book.id()).statusCode()).isEqualTo(400);
        assertThat(api.download(DOWNLOAD + "0").statusCode()).isEqualTo(400);
        assertThat(api.download(DOWNLOAD + book.id()).statusCode()).isEqualTo(422);
        byte[] jpeg = ImageValidatorTest.image("jpeg");
        var front = media.upload(Long.parseLong(book.id()), MediaDtos.MediaRole.FRONT,
                book.version(), owner, jpeg, null, null);
        var beforeBack = Set.copyOf(fake.assets.keySet());
        var uploaded = media.upload(Long.parseLong(book.id()), MediaDtos.MediaRole.BACK,
                front.version(), owner, jpeg, null, null);
        String back = fake.assets.keySet().stream().filter(key -> !beforeBack.contains(key))
                .findFirst().orElseThrow();
        fake.assets.put(back, new byte[33 * 1024 * 1024]);
        assertThat(api.download(DOWNLOAD + book.id()).statusCode()).isEqualTo(413);
        fake.assets.remove(back);
        var failure = api.download(DOWNLOAD + book.id());
        assertThat(failure.statusCode()).isEqualTo(502);
        assertThat(failure.headers().firstValue("Content-Disposition")).isEmpty();
        assertThat(api.send("PATCH", "/api/v1/admin/books/" + book.id() + "/trash",
                json(Map.of("version", uploaded.version(), "trashed", true)), true).statusCode()).isEqualTo(204);
        assertThat(api.download(DOWNLOAD + book.id()).statusCode()).isEqualTo(404);
    }
}
