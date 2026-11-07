package vn.memay.catalogue;

import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.http.ResponseEntity;
import jakarta.validation.Valid;
import java.net.URI;
import vn.memay.common.AdminActorResolver;
import vn.memay.catalogue.BookDtos.*;

@RestController
@RequestMapping("/api/v1/admin/books")
public class AdminBookController {
    @org.springframework.beans.factory.annotation.Autowired private vn.memay.common.PerformanceTimings timings = new vn.memay.common.PerformanceTimings(false);

    @org.springframework.beans.factory.annotation.Autowired private BookEntryInput entryInput;
    private final AdminActorResolver actors;
    private final BookCommandService commands;
    private final BookStatusService status;
    private final BookQueryService queries;
    private final BookTrashService trash;

    public AdminBookController(AdminActorResolver actors, BookCommandService commands, BookStatusService status,
            BookQueryService queries, BookTrashService trash) {
        this.actors = actors;
        this.commands = commands;
        this.status = status;
        this.queries = queries;
        this.trash = trash;
    }

    @GetMapping
    public Page<BookSummary> list(Authentication a, @RequestParam(required = false) String q,
            @RequestParam(required = false) Publication publication,
            @RequestParam(required = false) Availability availability, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,@RequestParam(required=false) Boolean unpublishedOnly,
            @RequestParam(required=false) Boolean missingOnly, @RequestParam(required=false) String category,
            @RequestParam(required=false) String binding, @RequestParam(required=false) Long focusId) {
        return queries.list(actors.current(a), new BookFilter(q, publication, availability, page, size, unpublishedOnly, missingOnly, category, binding, focusId));
    }

    @PostMapping
    public ResponseEntity<BookDetail> create(Authentication a, @RequestBody tools.jackson.databind.JsonNode payload) {
        var parsed=entryInput.create(payload);
        var result = timings.measure("publish", () -> commands.createPublished(actors.current(a), parsed.body(), parsed.options(), parsed.publication()));
        return ResponseEntity.created(URI.create("/api/v1/admin/books/" + result.id())).body(result);
    }

    @GetMapping("/title-duplicate")
    public TitleDuplicate titleDuplicate(Authentication a,@RequestParam String title,@RequestParam(required=false) Long excludeId) {
        return new TitleDuplicate(queries.titleDuplicate(actors.current(a),title,excludeId));
    }

    public record TrashChange(@jakarta.validation.constraints.NotNull @jakarta.validation.constraints.PositiveOrZero Long version,
            @jakarta.validation.constraints.NotNull Boolean trashed) {}

    @GetMapping("/trash")
    public Page<BookTrashService.TrashBook> trash(Authentication a, @RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="20") int size) {
        return trash.list(actors.current(a), page, size);
    }

    public record TrashBulk(@jakarta.validation.constraints.NotEmpty java.util.List<BookTrashService.Selection> items,
            @jakarta.validation.constraints.NotNull Boolean permanent) {}

    @GetMapping("/trash/selection")
    public java.util.List<BookTrashService.Selection> trashSelection(Authentication a) {
        return trash.selection(actors.current(a));
    }

    @PostMapping("/trash/bulk")
    public ResponseEntity<Void> bulkTrash(Authentication a, @Valid @RequestBody TrashBulk body) {
        trash.bulk(actors.current(a),body.items(),body.permanent());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/trash")
    public ResponseEntity<Void> changeTrash(Authentication a, @PathVariable long id, @Valid @RequestBody TrashChange body) {
        trash.change(actors.current(a), id, body.version(), body.trashed());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}")
    public BookDetail detail(Authentication a, @PathVariable long id) {
        return queries.detail(id, actors.current(a));
    }

    @PutMapping("/{id}")
    public BookDetail update(Authentication a, @PathVariable long id, @RequestBody tools.jackson.databind.JsonNode payload) {
        var parsed=entryInput.update(payload);var body=parsed.body();
        if(body.version()==null || body.version()<0) throw vn.memay.common.AdminApiException.field("version","Required non-negative version");
        return commands.update(id, body.version(), actors.current(a), body.write(), body.media(), parsed.options(), parsed.publishAfterSave(), parsed.confirmedActualCopy(), parsed.mediaMetadata());
    }

    @PatchMapping("/{id}/publication")
    public BookDetail publication(Authentication a, @PathVariable long id, @Valid @RequestBody PublicationChange body) {
        return status.publication(id, body.version(), actors.current(a), body.status(),
                Boolean.TRUE.equals(body.confirmedActualCopy()));
    }

    @PatchMapping("/{id}/availability")
    public BookDetail availability(Authentication a, @PathVariable long id,
            @Valid @RequestBody AvailabilityChange body) {
        return status.availability(id, body.version(), actors.current(a), body.availability());
    }

    @GetMapping("/{id}/preview")
    public PreviewBook preview(Authentication a, @PathVariable long id) {
        return queries.preview(id, actors.current(a));
    }

    @GetMapping("/{id}/audit")
    public Page<AuditSummary> audit(Authentication a, @PathVariable long id, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return queries.audit(id, actors.current(a), page, size);
    }
}
