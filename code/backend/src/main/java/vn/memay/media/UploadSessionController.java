package vn.memay.media;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import java.util.UUID;
import java.io.IOException;
import vn.memay.common.*;
import static vn.memay.media.UploadSessionDtos.*;
@RestController
@RequestMapping("/api/v1/admin/upload-sessions")
public class UploadSessionController {
 private final AdminActorResolver actors;private final UploadSessionService sessions;
 public UploadSessionController(AdminActorResolver actors,UploadSessionService sessions){this.actors=actors;this.sessions=sessions;}
 @PostMapping public ResponseEntity<UploadSession> create(Authentication a){return ResponseEntity.status(201).body(sessions.create(actors.current(a)));}
 @GetMapping("/{id}") public UploadSession get(Authentication a,@PathVariable UUID id){return sessions.get(id,actors.current(a));}
 @DeleteMapping("/{id}") public ResponseEntity<Void> cancel(Authentication a,@PathVariable UUID id){sessions.cancel(id,actors.current(a));return ResponseEntity.noContent().build();}
 @PostMapping(path="/{id}/media",consumes="multipart/form-data") public ResponseEntity<TemporaryMedia> upload(Authentication a,@PathVariable UUID id,@RequestParam MultipartFile file,@RequestParam(required=false) String alt,@RequestParam(required=false) String sourceRef,@RequestParam(required=false) UUID replaceId,@RequestParam(required=false) UUID requestKey)throws IOException {
  if(file.getSize()>ImageValidator.MAX_BYTES)throw new AdminApiException(413,"image_too_large");
  return ResponseEntity.status(201).body(sessions.upload(id,actors.current(a),file.getBytes(),alt,sourceRef,replaceId,requestKey));
 }
 @GetMapping("/{id}/media/{mediaId}") public ResponseEntity<StreamingResponseBody> content(Authentication a,@PathVariable UUID id,@PathVariable UUID mediaId) {
  var input=sessions.content(id,mediaId,actors.current(a));StreamingResponseBody body=out->{try(input){input.transferTo(out);}};
  return ResponseEntity.ok().header("Content-Type","image/jpeg").header("Cache-Control","no-store").header("X-Content-Type-Options","nosniff").body(body);
 }
 public record Metadata(String alt,String sourceRef) {}
 @PatchMapping("/{id}/media/{mediaId}") public TemporaryMedia metadata(Authentication a,@PathVariable UUID id,@PathVariable UUID mediaId,@RequestBody Metadata body){return sessions.metadata(id,mediaId,actors.current(a),body.alt(),body.sourceRef());}
 @DeleteMapping("/{id}/media/{mediaId}") public ResponseEntity<Void> remove(Authentication a,@PathVariable UUID id,@PathVariable UUID mediaId){sessions.remove(id,mediaId,actors.current(a));return ResponseEntity.noContent().build();}
}
