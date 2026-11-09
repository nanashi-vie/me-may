package vn.memay.media.source;

import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.memay.common.AdminActorResolver;
import vn.memay.common.AdminApiException;

@RestController
@RequestMapping("/api/v1/admin/media/{mediaId}/source")
@ConditionalOnProperty(prefix = "memay.media.local", name = "enabled", havingValue = "true")
public class AdminSourceController {
    private final SourceBindingService bindings;
    private final AdminActorResolver actors;

    public AdminSourceController(SourceBindingService bindings, AdminActorResolver actors) {
        this.bindings = bindings;
        this.actors = actors;
    }

    record Verify(String fileId, Long bindingVersion, Long bookVersion, UUID requestKey) {}
    record Accepted(UUID operationId) {}

    @PutMapping
    ResponseEntity<Accepted> verify(@PathVariable UUID mediaId, @RequestBody Verify body, Authentication auth) {
        if (body.bindingVersion() == null) throw new AdminApiException(400, "invalid_source_request");
        UUID id = bindings.verify(mediaId, body.fileId(), body.bindingVersion(), body.bookVersion(),
                body.requestKey(), actors.current(auth));
        return ResponseEntity.accepted().body(new Accepted(id));
    }

    @GetMapping
    SourceBindingService.Status status(@PathVariable UUID mediaId, Authentication auth) {
        return bindings.status(mediaId, actors.current(auth));
    }
}
