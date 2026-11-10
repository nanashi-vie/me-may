package vn.memay.media;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class ImageMigrationDtos {
    private ImageMigrationDtos() {}

    public record Accepted(UUID receiptId, String statusPath) {}
    public record MigrationPreview(UUID receiptId, String digest, List<PreviewRow> rows, Instant expiresAt,
                                   String status) {}
    public record PreviewRow(int line, UUID mediaId, Long bookId, String bookCode, Long bookVersion,
                             String role, String fileId, String sourceSha256, String sourceVersion,
                             String currentPhotoPath, String previewPath, String errorCode, String status) {}
    public record Apply(String digest, UUID requestKey, List<UUID> confirmedMediaIds) {}
    public record Rollback(UUID requestKey, Map<Long, Long> expectedBookVersions) {}
    public record ApplyAccepted(UUID operationId, String statusPath) {}
    public record BookResult(long bookId, Long bookVersion, String status, String errorCode) {}
    public record ApplyStatus(UUID operationId, String status, List<BookResult> books) {}
}
