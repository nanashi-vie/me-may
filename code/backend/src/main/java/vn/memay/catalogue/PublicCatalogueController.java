package vn.memay.catalogue;

import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import java.net.URI;
import java.util.List;
import vn.memay.catalogue.PublicCatalogueDtos.*;
import vn.memay.taxonomy.TaxonomyService;
import vn.memay.taxonomy.TaxonomyDtos.Taxonomy;
import vn.memay.media.MediaGateway;
import vn.memay.media.MediaDtos.MediaRole;
import vn.memay.common.AdminApiException;

@RestController
@RequestMapping("/api/v1")
public class PublicCatalogueController {
    private final PublicCatalogueService catalogue;
    private final TaxonomyService taxonomy;
    private final JdbcTemplate jdbc;
    private final MediaGateway media;
    private final Contact contact;
    private final vn.memay.cache.PublicCacheInvalidation publicCache;

    public PublicCatalogueController(PublicCatalogueService catalogue, TaxonomyService taxonomy, JdbcTemplate jdbc,
            MediaGateway media, @Value("${CONTACT_ZALO_HOTLINE_URL:}") String hotline,
            @Value("${CONTACT_ZALO_GROUP_URL:}") String group, vn.memay.cache.PublicCacheInvalidation publicCache) {
        this.catalogue = catalogue;
        this.publicCache = publicCache;
        this.taxonomy = taxonomy;
        this.jdbc = jdbc;
        this.media = media;
        this.contact = new Contact(zalo(hotline), zalo(group));
    }

    private static String zalo(String value) {
        if (value == null || value.isBlank())
            return null;
        try {
            var u = URI.create(value);
            if (!"https".equals(u.getScheme()) || !"zalo.me".equals(u.getHost()) || u.getUserInfo() != null
                    || u.getPort() != -1)
                throw new IllegalArgumentException();
            return u.toASCIIString();
        } catch (RuntimeException e) {
            throw new IllegalArgumentException("Contact URL must be https://zalo.me/...");
        }
    }

    @GetMapping("/books")
    public BookDtos.Page<Book> books(@RequestParam(required = false) String q,
            @RequestParam(required = false) String category, @RequestParam(required = false) String binding,
            @RequestParam(name = "age", required = false) List<String> ages,
            @RequestParam(defaultValue = "newest") String sort, @RequestParam(defaultValue = "0") int page) {
        return catalogue.list(q, category, binding, ages, sort, page, null);
    }

    @GetMapping("/books/{slug}")
    public Book detail(@PathVariable String slug) {
        return catalogue.detail(slug);
    }

    @GetMapping("/books/{slug}/related")
    public RelatedBooks related(@PathVariable String slug) {
        return catalogue.related(slug);
    }

    @GetMapping("/books/lookup")
    public List<Book> lookup(@RequestParam(name = "code", required = false) List<String> codes) {
        return catalogue.lookup(codes);
    }

    @GetMapping("/collections")
    public List<Collection> collections() {
        return catalogue.collections();
    }

    @GetMapping("/collections/{slug}")
    public CollectionPage collection(@PathVariable String slug, @RequestParam(required = false) String q,
            @RequestParam(required = false) String category, @RequestParam(required = false) String binding,
            @RequestParam(name = "age", required = false) List<String> ages,
            @RequestParam(defaultValue = "newest") String sort, @RequestParam(defaultValue = "0") int page) {
        return new CollectionPage(catalogue.collection(slug),
                catalogue.list(q, category, binding, ages, sort, page, slug));
    }

    @GetMapping("/taxonomy")
    public Taxonomy taxonomy() {
        return taxonomy.get();
    }

    @GetMapping("/home")
    public Home home() {
        return catalogue.home();
    }

    @GetMapping("/cache-policy")
    public java.util.Map<String, Object> cachePolicy() {
        var now = jdbc.queryForObject("select current_timestamp", (r, n) -> r.getTimestamp(1).toInstant());
        var transitions = jdbc.queryForList(
                "select least(case when starts_at>current_timestamp then starts_at end, "
                + "case when ends_at>current_timestamp then ends_at end) from flash_sale where enabled",
                java.sql.Timestamp.class);
        var expires = now.plusSeconds(30);
        for (var transition : transitions)
            if (transition != null && transition.toInstant().isBefore(expires)) expires = transition.toInstant();
        return java.util.Map.of("enabled", publicCache.enabled(), "expiresAt", expires.toString(),
                "serverNow", now.toString());
    }

    @GetMapping("/contact")
    public Contact contact() {
        return contact;
    }

    @GetMapping("/books/{slug}/media/{role}")
    public ResponseEntity<StreamingResponseBody> image(@PathVariable String slug, @PathVariable MediaRole role,
            @RequestParam(defaultValue = "640") int size, @RequestParam(defaultValue = "jpg") String format,
            @RequestParam(required = false) String v) {
        if ((size != 320 && size != 640) || !List.of("jpg", "webp").contains(format))
            throw AdminApiException.field("variant", "Kích thước hoặc định dạng ảnh không hợp lệ");
        var keys = jdbc.queryForList(
                "select m.storage_public_id from book_media m join book_copy b on b.id=m.book_copy_id join listing l on l.book_copy_id=b.id where l.slug=? and l.publication_status='PUBLISHED' and m.state='ACTIVE' and m.role=? and (cast(? as text) is null or m.id::text=?)",
                String.class, slug, role.name(), v, v);
        if (keys.isEmpty())
            throw new AdminApiException(404, "not_found");
        var input = media.openPublicPreview(keys.getFirst(), size, format);
        StreamingResponseBody body = output -> {
            try (input) {
                input.transferTo(output);
            }
        };
        return ResponseEntity.ok().header("Content-Type", format.equals("webp") ? "image/webp" : "image/jpeg")
                .header("Cache-Control", "no-store")
                .header("X-Memay-Public-Cache", publicCache.enabled() && v != null ? "30" : "0")
                .header("X-Content-Type-Options", "nosniff").body(body);
    }
}
