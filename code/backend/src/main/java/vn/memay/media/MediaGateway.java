package vn.memay.media;

import java.io.InputStream;

public interface MediaGateway {
    record UploadedMedia(String assetId, String publicId, String format, long bytes, int width, int height) {
    }

    enum DeleteResult {
        DELETED, NOT_FOUND
    }

    UploadedMedia upload(String publicId, byte[] bytes);

    InputStream openPreview(String publicId);

    default InputStream openPublicPreview(String publicId) {
        return openPreview(publicId);
    }

    default InputStream openPublicPreview(String publicId, int width, String format) {
        return openPublicPreview(publicId);
    }

    DeleteResult delete(String publicId);
}
