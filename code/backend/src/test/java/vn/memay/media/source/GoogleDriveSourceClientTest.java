package vn.memay.media.source;

import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import tools.jackson.databind.ObjectMapper;
import vn.memay.media.LocalImageStore;
import static org.assertj.core.api.Assertions.*;

class GoogleDriveSourceClientTest {
    @TempDir Path root;
    private HttpServer server;
    private GoogleDriveSourceClient client;
    private final AtomicInteger metadataReads = new AtomicInteger();
    private volatile int error;
    private volatile boolean change;
    private volatile long size = 3;

    @BeforeEach void start() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/drive/v3/files/file-1", exchange -> {
            try (exchange) {
                if (!"GET".equals(exchange.getRequestMethod())
                        || !"Bearer fixture-token".equals(exchange.getRequestHeaders().getFirst("Authorization"))) {
                    exchange.sendResponseHeaders(401, -1);
                    return;
                }
                boolean media = exchange.getRequestURI().getRawQuery().contains("alt=media");
                byte[] payload = error != 0 ? "provider-secret-detail".getBytes()
                        : media ? new byte[]{97, 98, 99}
                        : ("""
                        {"id":"file-1","mimeType":"image/jpeg","size":"%s","version":"%s",
                         "trashed":false,"capabilities":{"canDownload":true}}
                        """.formatted(size, change ? metadataReads.incrementAndGet() : 1)).getBytes();
                exchange.sendResponseHeaders(error != 0 ? error : 200, payload.length);
                exchange.getResponseBody().write(payload);
            }
        });
        server.start();
        client = new GoogleDriveSourceClient(URI.create("http://127.0.0.1:" + server.getAddress().getPort()),
                () -> "fixture-token", new ObjectMapper(), new LocalImageStore(root.toRealPath()));
    }

    @AfterEach void stop() {
        client.close();
        server.stop(0);
    }

    @Test void inspectReadsMetadataWithoutStagingBytes() throws Exception {
        var metadata = client.inspect("file-1");
        assertThat(metadata).isEqualTo(new DriveSourceMetadata("file-1", "1", 3, "image/jpeg"));
        assertThat(root.resolve("staging")).doesNotExist();
        assertThatThrownBy(() -> client.inspect("https://another-host.test/private"))
                .isInstanceOf(SourceAccessException.class);
    }

    @Test void stagesStableBytesAndRejectsChangedVersion() throws Exception {
        var result = client.download("file-1", UUID.randomUUID());
        assertThat(result.bytes()).isEqualTo(3);
        assertThat(result.sha256()).isEqualTo("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
        assertThat(Files.readAllBytes(root.resolve(result.inputKey()))).containsExactly(97, 98, 99);
        change = true;
        var operation = UUID.randomUUID();
        assertError(operation, "SOURCE_CHANGED", true, 200);
        assertThat(root.resolve("staging/" + operation)).doesNotExist();
    }

    @Test void classifiesErrorsWithoutLeakingProviderResponseOrToken() {
        error = 403;
        assertError(UUID.randomUUID(), "ACCESS_ERROR", false, 403);
        error = 404;
        assertError(UUID.randomUUID(), "SOURCE_MISSING", false, 404);
        error = 429;
        assertError(UUID.randomUUID(), "ACCESS_ERROR", true, 429);
        error = 503;
        assertError(UUID.randomUUID(), "ACCESS_ERROR", true, 503);
    }

    @Test void rejectsOversizeMetadataAndArbitraryUrls() {
        size = LocalImageStore.MAX_INPUT_BYTES + 1;
        assertError(UUID.randomUUID(), "INVALID_SOURCE", false, 200);
        assertThatThrownBy(() -> client.download("https://another-host.test/private", UUID.randomUUID()))
                .isInstanceOf(SourceAccessException.class);
    }

    private void assertError(UUID operation, String code, boolean retryable, int status) {
        assertThatThrownBy(() -> client.download("file-1", operation))
                .isInstanceOfSatisfying(SourceAccessException.class, e -> {
                    assertThat(e.code()).isEqualTo(code);
                    assertThat(e.retryable()).isEqualTo(retryable);
                    assertThat(e.httpStatus()).isEqualTo(status);
                    assertThat(e.getMessage()).doesNotContain("provider-secret-detail", "fixture-token");
                });
    }
}
