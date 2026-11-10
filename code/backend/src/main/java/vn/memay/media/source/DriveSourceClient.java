package vn.memay.media.source;

import java.util.UUID;

public interface DriveSourceClient {
    DownloadedSource download(String fileId, UUID operationId);
}
