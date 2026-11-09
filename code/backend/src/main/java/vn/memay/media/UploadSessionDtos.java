package vn.memay.media;
import java.time.Instant;
import java.util.*;
public final class UploadSessionDtos {
 public record TemporaryMedia(String id,String state,String alt,String sourceRef,Integer width,Integer height,String contentPath, String provider, UUID jobId, String jobStatus, UUID requestKey) {
  public TemporaryMedia(String id,String state,String alt,String sourceRef,Integer width,Integer height,String contentPath) {
   this(id,state,alt,sourceRef,width,height,contentPath,"CLOUDINARY",null,null,null);
  }
 }
 public record UploadSession(String id,String state,Instant expiresAt,List<TemporaryMedia> media,String bookId) {}
 public record Intent(UUID id,UUID sessionId,String publicId,TemporaryMedia ready) {}
}
