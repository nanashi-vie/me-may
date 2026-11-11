package vn.memay.media.source;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import vn.memay.media.MediaDtos.MediaRole;

public final class DriveBatchDtos {
    private DriveBatchDtos() {}
    public enum Mode { IMPORT, MATCH }
    public record Target(UUID mediaId, UUID generationId, long bindingVersion) {}
    public record Create(Mode mode, UUID sessionId, Long bookId, Long bookVersion,
                         List<String> fileIds, List<Target> targets, UUID requestKey) {}
    public record Selection(UUID itemId, UUID mediaId, MediaRole role) {}
    public record Confirm(UUID requestKey, String digest, List<Selection> selections) {}
    public record ItemView(UUID id, String fileId, String state, String errorCode, UUID mediaId,
                           String contentPath, List<UUID> candidates) {}
    public record View(UUID id, Mode mode, String state, Instant expiresAt, String digest,
                       List<ItemView> items, Long bookVersion, List<Selection> selections) {}
    public record Snapshot(UUID mediaId, UUID generationId, long bindingVersion,
                           String sha256, String recipe) {}
}
