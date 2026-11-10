package vn.memay.media;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import org.springframework.security.core.Authentication;
import org.springframework.http.ResponseEntity;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.io.*;
import vn.memay.common.*;
import vn.memay.catalogue.BookDtos.BookDetail;
import vn.memay.media.MediaDtos.MediaRole;

@RestController
@RequestMapping("/api/v1/admin/books/{id}/media/{role}")
public class AdminMediaController {
    @org.springframework.beans.factory.annotation.Autowired private vn.memay.common.PerformanceTimings timings = new vn.memay.common.PerformanceTimings(false);

    public record Metadata(@NotNull @PositiveOrZero Long version, String alt, String sourceRef) {
    }

    private final AdminActorResolver actors;
    private final MediaService media;
    private final LocalUploadService local;

    public AdminMediaController(AdminActorResolver actors, MediaService media, LocalUploadService local) {
        this.actors = actors;
        this.media = media;
        this.local = local;
    }

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<BookDetail> upload(Authentication a, @PathVariable long id, @PathVariable MediaRole role,
            @RequestParam long version, @RequestParam MultipartFile file, @RequestParam(required = false) String alt,
            @RequestParam(required = false) String sourceRef,
            @RequestParam(required = false) String providerRevision) throws IOException {
        var actor = actors.current(a);
        if (providerRevision != null) {
            var capability = local.capabilities(actor);
            if (!"CLOUDINARY".equals(capability.provider()) || !providerRevision.equals(capability.revision()))
                throw new AdminApiException(409, "image_capability_changed");
        }
        if (version < 0)
            throw AdminApiException.field("version", "Version không hợp lệ");
        if (file.getSize() > ImageValidator.MAX_BYTES)
            throw new AdminApiException(413, "image_too_large");
        return ResponseEntity.status(201).body(media.upload(id, role.canonical(), version, actor, file.getBytes(), alt, sourceRef));
    }

    @PatchMapping
    public BookDetail metadata(Authentication a, @PathVariable long id, @PathVariable MediaRole role,
            @Valid @RequestBody Metadata body) {
        return media.updateMetadata(id, role.canonical(), body.version(), actors.current(a), body.alt(), body.sourceRef());
    }

    @DeleteMapping
    public BookDetail remove(Authentication a, @PathVariable long id, @PathVariable MediaRole role,
            @RequestParam long version) {
        if (version < 0)
            throw AdminApiException.field("version", "Version không hợp lệ");
        return media.remove(id, role.canonical(), version, actors.current(a));
    }

    @GetMapping("/content")
    public ResponseEntity<StreamingResponseBody> content(Authentication a, @PathVariable long id,
            @PathVariable MediaRole role, @RequestParam(defaultValue="1280") int size) {
        var input = media.content(id, role.canonical(), actors.current(a),size);
        var trace=timings.capture();
        StreamingResponseBody body = output -> {
            try (input) {
                if(trace==null)input.transferTo(output);else trace.measureIo("stream", () -> input.transferTo(output));
            }
        };
        return ResponseEntity.ok().header("Content-Type", "image/jpeg").header("Cache-Control", "no-store")
                .header("X-Content-Type-Options", "nosniff").body(body);
    }
}
