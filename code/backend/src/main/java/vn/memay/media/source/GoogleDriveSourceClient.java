package vn.memay.media.source;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.ServiceAccountCredentials;
import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import tools.jackson.databind.ObjectMapper;
import vn.memay.media.LocalImageStore;

public final class GoogleDriveSourceClient implements DriveSourceClient, AutoCloseable {
    private static final String METADATA = "fields=id,size,version,mimeType,trashed,capabilities(canDownload)&supportsAllDrives=true";
    private static final Set<String> IMAGE_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private final URI origin;
    private final AccessToken tokens;
    private final ObjectMapper json;
    private final LocalImageStore store;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10))
            .followRedirects(HttpClient.Redirect.NEVER).build();
    private final java.util.concurrent.ExecutorService downloads = Executors.newVirtualThreadPerTaskExecutor();
    private final java.util.concurrent.ScheduledExecutorService deadlines = Executors.newSingleThreadScheduledExecutor();

    @FunctionalInterface
    interface AccessToken {
        String get() throws IOException;
    }

    GoogleDriveSourceClient(URI origin, AccessToken tokens, ObjectMapper json, LocalImageStore store) {
        this.origin = origin;
        this.tokens = tokens;
        this.json = json;
        this.store = store;
    }

    public static GoogleDriveSourceClient create(String credentialsFile, ObjectMapper json, LocalImageStore store) {
        return new GoogleDriveSourceClient(URI.create("https://www.googleapis.com"), new AccessToken() {
            private GoogleCredentials credentials;

            @Override public synchronized String get() throws IOException {
                if (credentialsFile.isBlank()) throw access(401);
                if (credentials == null) {
                    try (var input = Files.newInputStream(Path.of(credentialsFile))) {
                        credentials = ServiceAccountCredentials.fromStream(input).toBuilder()
                                .setTokenServerUri(URI.create("https://oauth2.googleapis.com/token")).build()
                                .createScoped(List.of("https://www.googleapis.com/auth/drive.readonly"));
                    } catch (IOException | IllegalArgumentException e) {
                        throw access(401);
                    }
                }
                credentials.refreshIfExpired();
                var token = credentials.getAccessToken();
                if (token == null) throw access(401);
                return token.getTokenValue();
            }
        }, json, store);
    }

    @Override public DownloadedSource download(String fileId, UUID operationId) {
        if (fileId == null || !fileId.matches("[A-Za-z0-9_-]{1,200}") || operationId == null)
            throw new SourceAccessException("INVALID_SOURCE", false, 400);
        var download = downloads.submit(() -> fetch(fileId, operationId));
        try {
            return download.get(180, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            download.cancel(true);
            Thread.currentThread().interrupt();
            throw new SourceAccessException("ACCESS_ERROR", true, 0);
        } catch (TimeoutException e) {
            download.cancel(true);
            throw new SourceAccessException("ACCESS_ERROR", true, 0);
        } catch (ExecutionException e) {
            if (e.getCause() instanceof SourceAccessException safe) throw safe;
            throw new SourceAccessException("ACCESS_ERROR", true, 0);
        }
    }

    @Override public DriveSourceMetadata inspect(String fileId) {
        if (fileId == null || !fileId.matches("[A-Za-z0-9_-]{1,200}"))
            throw new SourceAccessException("INVALID_SOURCE", false, 400);
        var task = downloads.submit(() -> {
            var metadata = metadata("/drive/v3/files/" + fileId, fileId, tokens.get());
            return new DriveSourceMetadata(fileId, metadata.version(), metadata.bytes(), metadata.mime());
        });
        try {
            return task.get(90, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            task.cancel(true);
            Thread.currentThread().interrupt();
            throw access(0);
        } catch (TimeoutException e) {
            task.cancel(true);
            throw new SourceAccessException("ACCESS_ERROR", true, 0);
        } catch (ExecutionException e) {
            if (e.getCause() instanceof SourceAccessException safe) throw safe;
            throw new SourceAccessException("ACCESS_ERROR", true, 0);
        }
    }

    private DownloadedSource fetch(String fileId, UUID operation) throws IOException, InterruptedException {
        String token = tokens.get();
        String resource = "/drive/v3/files/" + fileId;
        Metadata before = metadata(resource, fileId, token);
        LocalImageStore.StagedInput staged = null;
        boolean verified = false;
        try {
            staged = get(resource + "?alt=media&supportsAllDrives=true", token,
                    stream -> store.stage(operation, new LimitedSource(stream, before.bytes())));
            if (staged.bytes() != before.bytes() || !before.equals(metadata(resource, fileId, token)))
                throw changed();
            verified = true;
            return new DownloadedSource(staged.key(), staged.sha256(), staged.bytes(), before.mime(), before.version());
        } finally {
            if (!verified && staged != null) {
                try {
                    store.discardInput(operation);
                } catch (IOException ignored) {
                    // The staging sweeper can remove this unreferenced operation.
                }
            }
        }
    }

    private record Metadata(long bytes, String mime, String version) {}

    private Metadata metadata(String resource, String fileId, String token) throws IOException, InterruptedException {
        return get(resource + "?" + METADATA, token, body -> {
            byte[] bytes = body.readNBytes(65_537);
            if (bytes.length > 65_536) throw access(200);
            var node = json.readTree(bytes);
            if (node.path("trashed").asBoolean(false)) throw new SourceAccessException("SOURCE_MISSING", false, 404);
            if (!node.path("capabilities").path("canDownload").asBoolean(false)) throw access(403);
            long size = node.path("size").asLong(-1);
            String mime = node.path("mimeType").asText("");
            String version = node.path("version").asText("");
            if (!fileId.equals(node.path("id").asText()) || !IMAGE_TYPES.contains(mime)
                    || size < 1 || size > LocalImageStore.MAX_INPUT_BYTES || version.isBlank())
                throw new SourceAccessException("INVALID_SOURCE", false, 200);
            return new Metadata(size, mime, version);
        });
    }

    @FunctionalInterface
    private interface Reader<T> {
        T read(InputStream body) throws IOException;
    }

    private <T> T get(String path, String token, Reader<T> reader) throws IOException, InterruptedException {
        var request = HttpRequest.newBuilder(origin.resolve(path)).timeout(Duration.ofSeconds(60))
                .header("Authorization", "Bearer " + token).GET().build();
        var response = http.send(request, HttpResponse.BodyHandlers.ofInputStream());
        try (var body = response.body()) {
            int status = response.statusCode();
            if (status == 404) throw new SourceAccessException("SOURCE_MISSING", false, 404);
            if (status != 200) throw access(status);
            var deadline = deadlines.schedule(() -> {
                try {
                    body.close();
                } catch (IOException ignored) {
                    // The reading task will surface the timeout.
                }
            }, 60, TimeUnit.SECONDS);
            try {
                return reader.read(body);
            } finally {
                deadline.cancel(false);
            }
        }
    }

    private static SourceAccessException access(int status) {
        return new SourceAccessException("ACCESS_ERROR", status == 429 || status >= 500, status);
    }

    private static SourceAccessException changed() {
        return new SourceAccessException("SOURCE_CHANGED", true, 200);
    }

    private static final class LimitedSource extends FilterInputStream {
        private long remaining;

        LimitedSource(InputStream input, long limit) {
            super(input);
            remaining = limit;
        }

        @Override public int read(byte[] bytes, int offset, int length) throws IOException {
            int count = super.read(bytes, offset, (int) Math.min(length, remaining + 1));
            if (count > remaining) throw changed();
            if (count > 0) remaining -= count;
            return count;
        }

        @Override public int read() throws IOException {
            int value = super.read();
            if (value != -1 && remaining-- == 0) throw changed();
            return value;
        }
    }

    @Override public void close() {
        downloads.shutdownNow();
        deadlines.shutdownNow();
        http.shutdownNow();
    }
}
