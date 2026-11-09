package vn.memay.media;

import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.memay.common.AdminActorResolver;

@RestController
@RequestMapping("/api/v1/admin")
public class ImageOperationController {
    private final LocalUploadService uploads;
    private final AdminActorResolver actors;
    private final MediaTransactions media;

    public ImageOperationController(LocalUploadService uploads, AdminActorResolver actors, MediaTransactions media) {
        this.uploads = uploads;
        this.actors = actors;
        this.media = media;
    }

    @GetMapping("/media-capabilities")
    LocalUploadService.Capability capabilities(Authentication auth) {
        return uploads.capabilities(actors.current(auth));
    }

    @GetMapping("/image-operations/{jobId}")
    LocalUploadService.Operation status(@PathVariable UUID jobId, Authentication auth) {
        return uploads.operation(jobId, actors.current(auth), false);
    }

    @PostMapping("/image-operations/{jobId}/retry")
    LocalUploadService.Operation retry(@PathVariable UUID jobId, Authentication auth) {
        return uploads.operation(jobId, actors.current(auth), true);
    }
    record Replacement(long version, MediaDtos.MediaRole role, UUID requestKey) {}

    @PostMapping("/books/{id}/media/replacements/{mediaId}/commit")
    vn.memay.catalogue.BookDtos.BookDetail commit(@PathVariable long id, @PathVariable UUID mediaId,
            @RequestBody Replacement body, Authentication auth) {
        return media.commitReplacement(id, mediaId, body.version(), body.role(), body.requestKey(), actors.current(auth));
    }
}
