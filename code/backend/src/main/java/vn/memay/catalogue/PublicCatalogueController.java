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
@RestController @RequestMapping("/api/v1")
public class PublicCatalogueController {
 private final PublicCatalogueService catalogue;private final TaxonomyService taxonomy;private final JdbcTemplate jdbc;private final MediaGateway media;private final Contact contact;
 public PublicCatalogueController(PublicCatalogueService catalogue,TaxonomyService taxonomy,JdbcTemplate jdbc,MediaGateway media,@Value("${CONTACT_ZALO_HOTLINE_URL:}")String hotline,@Value("${CONTACT_ZALO_GROUP_URL:}")String group){this.catalogue=catalogue;this.taxonomy=taxonomy;this.jdbc=jdbc;this.media=media;this.contact=new Contact(zalo(hotline),zalo(group));}
 private static String zalo(String value){if(value==null||value.isBlank())return null;try{var u=URI.create(value);if(!"https".equals(u.getScheme())||!"zalo.me".equals(u.getHost())||u.getUserInfo()!=null||u.getPort()!=-1)throw new IllegalArgumentException();return u.toASCIIString();}catch(RuntimeException e){throw new IllegalArgumentException("Contact URL must be https://zalo.me/...");}}
 @GetMapping("/books") public BookDtos.Page<Book> books(@RequestParam(required=false)String q,@RequestParam(required=false)String category,@RequestParam(required=false)String binding,@RequestParam(name="age",required=false)List<String> ages,@RequestParam(defaultValue="newest")String sort,@RequestParam(defaultValue="0")int page){return catalogue.list(q,category,binding,ages,sort,page,null);}
 @GetMapping("/books/{slug}") public Book detail(@PathVariable String slug){return catalogue.detail(slug);}
 @GetMapping("/books/lookup") public List<Book> lookup(@RequestParam(name="code",required=false)List<String> codes){return catalogue.lookup(codes);}
 @GetMapping("/collections") public List<Collection> collections(){return catalogue.collections();}
 @GetMapping("/collections/{slug}") public CollectionPage collection(@PathVariable String slug,@RequestParam(required=false)String q,@RequestParam(required=false)String category,@RequestParam(required=false)String binding,@RequestParam(name="age",required=false)List<String> ages,@RequestParam(defaultValue="newest")String sort,@RequestParam(defaultValue="0")int page){return new CollectionPage(catalogue.collection(slug),catalogue.list(q,category,binding,ages,sort,page,slug));}
 @GetMapping("/taxonomy") public Taxonomy taxonomy(){return taxonomy.get();}
 @GetMapping("/home") public Home home(){return catalogue.home();}
 @GetMapping("/contact") public Contact contact(){return contact;}
 @GetMapping("/books/{slug}/media/{role}") public ResponseEntity<StreamingResponseBody> image(@PathVariable String slug,@PathVariable MediaRole role){
  var keys=jdbc.queryForList("select m.storage_public_id from book_media m join book_copy b on b.id=m.book_copy_id join listing l on l.book_copy_id=b.id where l.slug=? and l.publication_status='PUBLISHED' and m.state='ACTIVE' and m.role=?",String.class,slug,role.name());
  if(keys.isEmpty())throw new AdminApiException(404,"not_found");var input=media.openPublicPreview(keys.getFirst());StreamingResponseBody body=output->{try(input){input.transferTo(output);}};return ResponseEntity.ok().header("Content-Type","image/jpeg").header("Cache-Control","no-store").header("X-Content-Type-Options","nosniff").body(body);
 }
}
