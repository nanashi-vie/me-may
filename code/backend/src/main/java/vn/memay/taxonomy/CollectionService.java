package vn.memay.taxonomy;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.util.*;
import vn.memay.auth.AdminUser;
import vn.memay.audit.AuditService;
import vn.memay.catalogue.BookAccess;
import vn.memay.common.AdminApiException;
import vn.memay.taxonomy.TaxonomyDtos.*;

@Service
public class CollectionService {
    private final CollectionRepository collections;
    private final BookAccess access;
    private final AuditService audit;
    private final EntityManager em;
    private final Clock clock;

    public CollectionService(CollectionRepository collections, BookAccess access, AuditService audit, EntityManager em,
            Clock clock) {
        this.collections = collections;
        this.access = access;
        this.audit = audit;
        this.em = em;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<CollectionDto> list(AdminUser actor) {
        return collections.findAll().stream()
                .sorted(Comparator.comparing((Collection c) -> c.sortOrder).thenComparing(c -> c.id)).map(this::dto)
                .toList();
    }

    @Transactional
    public CollectionDto create(AdminUser actor, CollectionCreate w) {
        access.requireOwner(actor);
        if (collections.existsBySlug(w.slug()))
            throw new AdminApiException(409, "slug_conflict");
        var c = new Collection();
        c.name = w.name().trim();
        c.slug = w.slug();
        c.sortOrder = w.sortOrder();
        c.active = w.active();
        c.createdAt = clock.instant();
        c.updatedAt = c.createdAt;
        collections.saveAndFlush(c);
        var result = dto(c);
        audit.record(actor, "COLLECTION", c.id, "CREATE", Map.of(), audit.snapshot(result), c.version);
        return result;
    }

    @Transactional
    public CollectionDto update(long id, long version, AdminUser actor, CollectionUpdate w) {
        access.requireOwner(actor);
        var c = collections.findById(id).orElseThrow(() -> new AdminApiException(404, "not_found"));
        if (c.version != version)
            throw AdminApiException.conflict(c.version);
        var before = dto(c);
        String name = w.name().trim();
        if (c.name.equals(name) && c.sortOrder.equals(w.sortOrder()) && c.active.equals(w.active()))
            return before;
        c.name = name;
        c.sortOrder = w.sortOrder();
        c.active = w.active();
        c.updatedAt = clock.instant();
        em.flush();
        var result = dto(c);
        audit.record(actor, "COLLECTION", id, "UPDATE", audit.snapshot(before), audit.snapshot(result), c.version);
        return result;
    }

    private CollectionDto dto(Collection c) {
        return new CollectionDto(c.id.toString(), c.name, c.slug, c.sortOrder, c.active, c.version, c.createdAt,
                c.updatedAt);
    }
}
