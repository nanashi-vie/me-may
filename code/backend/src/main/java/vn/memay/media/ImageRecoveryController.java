package vn.memay.media;

import java.util.List;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.memay.common.AdminActorResolver;
import vn.memay.media.ImageInventoryService.Selection;

@RestController
@RequestMapping(ImageRecoveryService.PATH)
@ConditionalOnProperty(prefix = "memay.media.local", name = "enabled", havingValue = "true")
class ImageRecoveryController {
    private final ImageRecoveryService recovery;
    private final AdminActorResolver actors;

    ImageRecoveryController(ImageRecoveryService recovery, AdminActorResolver actors) {
        this.recovery = recovery;
        this.actors = actors;
    }

    record Rebuild(List<UUID> mediaIds, String scope, UUID after, Boolean apply, UUID requestKey) {}

    @GetMapping("/inventory")
    Object inventory(Authentication auth, @RequestParam(required = false) List<UUID> mediaIds,
            @RequestParam(required = false) String scope, @RequestParam(required = false) UUID after,
            @RequestParam(defaultValue = "false") boolean scanDisk, @RequestParam(required = false) String afterDisk) {
        return recovery.inventory(actors.current(auth), new Selection(mediaIds, scope, after), scanDisk, afterDisk);
    }

    @PostMapping("/rebuild")
    ResponseEntity<?> rebuild(Authentication auth, @RequestBody Rebuild body) {
        var actor = actors.current(auth);
        var selection = new Selection(body.mediaIds(), body.scope(), body.after());
        if (!Boolean.TRUE.equals(body.apply())) return ResponseEntity.ok(recovery.inventory(actor, selection, false, null));
        return ResponseEntity.accepted().body(recovery.rebuild(actor, selection, body.requestKey()));
    }

    @GetMapping("/rebuild/{id}")
    Object status(Authentication auth, @PathVariable UUID id) {
        return recovery.status(actors.current(auth), id);
    }
}
