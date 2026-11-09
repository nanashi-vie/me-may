package vn.memay.media;

import java.io.IOException;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import vn.memay.common.AdminActorResolver;
import vn.memay.common.AdminApiException;
import vn.memay.media.ImageMigrationDtos.*;

@RestController
@RequestMapping(ImageMigrationService.PATH)
@ConditionalOnProperty(prefix = "memay.media.local", name = "enabled", havingValue = "true")
public class ImageMigrationController {
    private final ImageMigrationService migration;
    private final AdminActorResolver actors;
    private final ImageMigrationApplyService apply;

    public ImageMigrationController(ImageMigrationService migration, AdminActorResolver actors, ImageMigrationApplyService apply) {
        this.migration = migration;
        this.actors = actors;
        this.apply = apply;
    }

    @GetMapping("/template")
    ResponseEntity<String> template(Authentication auth, @RequestParam(required = false) UUID after) {
        var template = migration.template(actors.current(auth), after);
        var response = ResponseEntity.ok().header("Content-Type", "text/csv;charset=UTF-8")
                .header("Content-Disposition", "attachment; filename=\"image-migration.csv\"")
                .header("Cache-Control", "no-store");
        if (template.next() != null) response.header("X-Next-Media-Id", template.next().toString());
        return response.body(template.csv());
    }

    @PostMapping(path = "/preview", consumes = "multipart/form-data")
    ResponseEntity<Accepted> preview(Authentication auth, @RequestParam MultipartFile file) throws IOException {
        if (file.getSize() > ImageMigrationService.MAX_CSV_BYTES) throw new AdminApiException(413, "manifest_too_large");
        return ResponseEntity.accepted().body(migration.preview(actors.current(auth), file.getBytes()));
    }

    @GetMapping("/{receiptId}")
    MigrationPreview status(Authentication auth, @PathVariable UUID receiptId) {
        return migration.status(actors.current(auth), receiptId);
    }

    @PostMapping("/{receiptId}/apply")
    ResponseEntity<ApplyAccepted> apply(Authentication auth, @PathVariable UUID receiptId, @RequestBody Apply request) {
        return ResponseEntity.accepted().body(apply.apply(actors.current(auth), receiptId, request));
    }

    @GetMapping("/{receiptId}/apply")
    ApplyStatus applyStatus(Authentication auth, @PathVariable UUID receiptId) {
        return apply.status(actors.current(auth), receiptId);
    }

    @PostMapping("/{receiptId}/rollback")
    ApplyStatus rollback(Authentication auth, @PathVariable UUID receiptId, @RequestBody Rollback request) {
        return apply.rollback(actors.current(auth), receiptId, request);
    }

    @GetMapping({"/{receiptId}/photos/{mediaId}", "/{receiptId}/photos/{mediaId}/{view:current}"})
    ResponseEntity<StreamingResponseBody> photo(Authentication auth, @PathVariable UUID receiptId,
            @PathVariable UUID mediaId, @PathVariable(required = false) String view) {
        var input = migration.photo(actors.current(auth), receiptId, mediaId, view != null);
        StreamingResponseBody body = output -> {
            try (input) { input.transferTo(output); }
        };
        return ResponseEntity.ok().header("Content-Type", "image/jpeg")
                .header("Cache-Control", "no-store").header("X-Content-Type-Options", "nosniff").body(body);
    }
}
