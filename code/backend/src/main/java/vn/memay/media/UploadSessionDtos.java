package vn.memay.media;
import java.time.Instant;
import java.util.*;
public final class UploadSessionDtos {
 public record TemporaryMedia(String id,String state,String alt,String sourceRef,Integer width,Integer height,String contentPath) {}
 public record UploadSession(String id,String state,Instant expiresAt,List<TemporaryMedia> media) {}
 public record Intent(UUID id,UUID sessionId,String publicId) {}
}
