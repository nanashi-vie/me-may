package vn.memay.taxonomy;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.http.ResponseEntity;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import vn.memay.common.AdminActorResolver;
import vn.memay.taxonomy.TaxonomyDtos.*;
@RestController @RequestMapping("/api/v1/admin")
public class AdminTaxonomyController {
 private final AdminActorResolver actors;private final TaxonomyService taxonomy;private final CollectionService collections;
 public AdminTaxonomyController(AdminActorResolver actors,TaxonomyService taxonomy,CollectionService collections){this.actors=actors;this.taxonomy=taxonomy;this.collections=collections;}
 @GetMapping("/taxonomy") public Taxonomy taxonomy(Authentication a){actors.current(a);return taxonomy.get();}
 @GetMapping("/collections") public List<CollectionDto> list(Authentication a){return collections.list(actors.current(a));}
 @PostMapping("/collections") public ResponseEntity<CollectionDto> create(Authentication a,@Valid @RequestBody CollectionCreate w){var result=collections.create(actors.current(a),w);return ResponseEntity.created(URI.create("/api/v1/admin/collections/"+result.id())).body(result);}
 @PutMapping("/collections/{id}") public CollectionDto update(Authentication a,@PathVariable long id,@Valid @RequestBody CollectionUpdate w){return collections.update(id,w.version(),actors.current(a),w);}
}
