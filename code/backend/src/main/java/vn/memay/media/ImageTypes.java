package vn.memay.media;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class ImageTypes {
    private ImageTypes() {}

    public enum Provider { CLOUDINARY, LOCAL }
    public enum JobKind { PROCESS, VERIFY, MIGRATE, REBUILD, PREVIEW }
    public enum SourceStatus { UNVERIFIED, VERIFIED, SOURCE_MISSING, SOURCE_CHANGED, ACCESS_ERROR }

    public record Variant(String name, String key, String mime, int width, int height, long bytes, String sha256) {}
    public record Manifest(UUID mediaId, UUID generationId, String recipeVersion, List<Variant> variants,
                           String workerDigest, String configurationDigest) {
        public Manifest(UUID mediaId, UUID generationId, String recipeVersion, List<Variant> variants) {
            this(mediaId, generationId, recipeVersion, variants, null, null);
        }
        public Manifest {
            variants = List.copyOf(variants);
        }
    }
    public record JobLease(UUID jobId, UUID token, UUID mediaId, UUID generationId, JobKind kind,
                           String inputKey, String recipeVersion, Instant expiresAt) {}
    public record SourceBinding(UUID mediaId, String fileId, String sha256, String sourceVersion,
                                long sourceBytes, String mime, SourceStatus status, long bindingVersion,
                                Instant verifiedAt) {}
}
