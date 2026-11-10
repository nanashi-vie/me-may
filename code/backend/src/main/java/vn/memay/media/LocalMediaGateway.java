package vn.memay.media;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.util.UUID;
import vn.memay.common.AdminApiException;

final class LocalMediaGateway {
    private final URI origin;
    private final LocalImageStore store;
    private final DeadlineCloudinaryTransport transport;

    LocalMediaGateway(String origin, LocalImageStore store, DeadlineCloudinaryTransport transport) {
        this.origin = URI.create(origin);
        if (!("http".equals(this.origin.getScheme()) || "https".equals(this.origin.getScheme()))
                || this.origin.getHost() == null || this.origin.getUserInfo() != null
                || this.origin.getQuery() != null || this.origin.getFragment() != null
                || !this.origin.getPath().matches("/?"))
            throw new IllegalArgumentException("Invalid internal image origin");
        this.store = store;
        this.transport = transport;
    }

    boolean available(UUID media, UUID generation, int size, String format, long bytes) {
        return store.hasVariant(media, generation, size, format, bytes);
    }

    InputStream open(UUID media, UUID generation, int size, String format, ImageTypes.Variant variant) {
        if (!"OK".equals(store.integrity(media, generation, variant)))
            throw new AdminApiException(404, "not_found");
        String path = "/derived/" + media + "/" + generation + "/" + size + "." + format;
        try {
            return transport.openInternal(origin.resolve(path), variant.mime(), variant.bytes());
        } catch (CloudinaryTransport.MissingVariantException e) {
            throw new AdminApiException(404, "not_found");
        } catch (IOException e) {
            throw new AdminApiException(502, "media_provider_error");
        }
    }
}
