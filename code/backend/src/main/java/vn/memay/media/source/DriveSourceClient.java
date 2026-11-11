package vn.memay.media.source;

import java.util.UUID;

public interface DriveSourceClient {
    default DriveSourceMetadata inspect(String fileId) {
        throw new SourceAccessException("ACCESS_ERROR", false, 503);
    }
    DownloadedSource download(String fileId, UUID operationId);
}
