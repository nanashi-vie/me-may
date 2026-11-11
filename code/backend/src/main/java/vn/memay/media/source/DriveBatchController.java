package vn.memay.media.source;

import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.memay.common.AdminActorResolver;

@RestController
@RequestMapping("/api/v1/admin/drive-image-batches")
@ConditionalOnProperty(prefix="memay.media.local",name="enabled",havingValue="true")
public class DriveBatchController {
    private final DriveBatchService batches;
    private final DriveBatchConfirmation confirmations;
    private final AdminActorResolver actors;
    public DriveBatchController(DriveBatchService batches,DriveBatchConfirmation confirmations,AdminActorResolver actors) {
        this.batches=batches; this.confirmations=confirmations; this.actors=actors;
    }
    @PostMapping ResponseEntity<DriveBatchDtos.View> create(@RequestBody DriveBatchDtos.Create body,Authentication auth) {
        return ResponseEntity.accepted().body(batches.create(body,actors.current(auth)));
    }
    @GetMapping("/{id}") DriveBatchDtos.View status(@PathVariable UUID id,Authentication auth) {
        return batches.status(id,actors.current(auth));
    }
    @DeleteMapping("/{id}") ResponseEntity<Void> cancel(@PathVariable UUID id,Authentication auth) {
        batches.cancel(id,actors.current(auth));
        return ResponseEntity.noContent().build();
    }
    @PostMapping("/{id}/confirm") DriveBatchDtos.View confirm(@PathVariable UUID id,
            @RequestBody DriveBatchDtos.Confirm body,Authentication auth) {
        return confirmations.confirm(id,body,actors.current(auth));
    }
}
