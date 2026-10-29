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
    private final AdminActorResolver actors;
    private final BookCommandService commands;
    private final BookStatusService status;
    private final BookQueryService queries;

    public AdminBookController(AdminActorResolver actors, BookCommandService commands, BookStatusService status,
            BookQueryService queries) {
        this.actors = actors;
        this.commands = commands;
        this.status = status;
        this.queries = queries;
    }

    @GetMapping
    public Page<BookSummary> list(Authentication a, @RequestParam(required = false) String q,
            @RequestParam(required = false) Publication publication,
            @RequestParam(required = false) Availability availability, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return queries.list(actors.current(a), new BookFilter(q, publication, availability, page, size));
    }

    @PostMapping
    public ResponseEntity<BookDetail> create(Authentication a, @RequestBody BookCreate body) {
        var result = commands.createPublished(actors.current(a), body);
        return ResponseEntity.created(URI.create("/api/v1/admin/books/" + result.id())).body(result);
    }

    @GetMapping("/{id}")
    public BookDetail detail(Authentication a, @PathVariable long id) {
        return queries.detail(id, actors.current(a));
    }

    @PutMapping("/{id}")
    public BookDetail update(Authentication a, @PathVariable long id, @Valid @RequestBody BookUpdate body) {
        return commands.update(id, body.version(), actors.current(a), body.write(), body.media());
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
