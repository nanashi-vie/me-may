package vn.memay.media;
import java.io.IOException;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vn.memay.common.*;
@RestController
public class HeroBannerController {
 private final ObjectProvider<HeroBannerMedia> media;private final AdminActorResolver actors;
 public HeroBannerController(ObjectProvider<HeroBannerMedia> media,AdminActorResolver actors){this.media=media;this.actors=actors;}
 private HeroBannerMedia service(){var s=media.getIfAvailable();if(s==null)throw new AdminApiException(503,"local_media_unavailable");return s;}
 @PostMapping("/api/v1/admin/hero-banners/uploads") @ResponseStatus(HttpStatus.ACCEPTED)
 public HeroBannerMedia.Upload upload(Authentication a,@RequestParam UUID requestKey,@RequestParam MultipartFile file)throws IOException{try(var input=file.getInputStream()){return service().upload(actors.current(a),requestKey,input);}}
 @GetMapping("/api/v1/admin/hero-banners/uploads/{id}") public HeroBannerMedia.Upload status(Authentication a,@PathVariable UUID id){return service().status(actors.current(a),id);}
 @GetMapping("/api/v1/admin/hero-banners/uploads/{id}/content") public ResponseEntity<byte[]> preview(Authentication a,@PathVariable UUID id){return response(service().content(actors.current(a),id,800,"jpg",true),true,null);}
 @GetMapping("/api/v1/hero-banners/{id}/content") public ResponseEntity<byte[]> content(@PathVariable UUID id,@RequestParam(defaultValue="1600") int size,@RequestParam(defaultValue="webp") String format,@RequestHeader(value="If-None-Match",required=false) String tag){
  var s=media.getIfAvailable();if(s==null)throw new AdminApiException(404,"banner_not_found");return response(s.content(null,id,size,format,false),false,tag);
 }
 private ResponseEntity<byte[]> response(HeroBannerMedia.Content c,boolean preview,String tag){
  var builder=ResponseEntity.status(!preview&&c.etag().equals(tag)?304:200).header("Cache-Control",preview?"no-store":"public, max-age=86400, immutable").header("X-Content-Type-Options","nosniff").contentType(MediaType.parseMediaType(c.mime()));
  if(!preview)builder.eTag(c.etag());return builder.body(!preview&&c.etag().equals(tag)?null:c.bytes());
 }
}
