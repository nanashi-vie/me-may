package vn.memay.catalogue;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.core.Authentication;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.*;
import java.io.IOException;
import vn.memay.common.AdminActorResolver;
import vn.memay.taxonomy.TaxonomyService;
import vn.memay.catalogue.BookImportDtos.*;

@RestController
@RequestMapping("/api/v1/admin/book-imports")
public class AdminBookImportController {
    private final AdminActorResolver actors;private final BookAccess access;private final BookImportService imports;
    private final BookImportTemplate templates;private final TaxonomyService taxonomy;private final JdbcTemplate jdbc;
    public AdminBookImportController(AdminActorResolver actors,BookAccess access,BookImportService imports,BookImportTemplate templates,TaxonomyService taxonomy,JdbcTemplate jdbc) {
        this.actors=actors;this.access=access;this.imports=imports;this.templates=templates;this.taxonomy=taxonomy;this.jdbc=jdbc;
    }
    @PostMapping(value="/preview",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImportPreview> preview(Authentication auth,@RequestParam MultipartFile file) throws IOException {
        var actor=actors.current(auth);access.requireOwner(actor);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(imports.preview(actor,file.getOriginalFilename(),bytes(file)));
    }
    @PostMapping(value="/confirm",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImportReceipt> confirm(Authentication auth,@RequestParam MultipartFile file,@RequestParam String fingerprint) throws IOException {
        var actor=actors.current(auth);access.requireOwner(actor);
        var result=imports.confirm(actor,file.getOriginalFilename(),bytes(file),fingerprint);
        return ResponseEntity.status(result.created()?201:200).cacheControl(CacheControl.noStore()).body(result.receipt());
    }
    @GetMapping("/options")
    public ResponseEntity<ImportOptions> options(Authentication auth) {
        access.requireOwner(actors.current(auth));return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(currentOptions());
    }
    @GetMapping("/templates")
    public ResponseEntity<byte[]> template(Authentication auth,@RequestParam String format) {
        access.requireOwner(actors.current(auth));
        byte[] body=templates.render(format,currentOptions());
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .contentType(MediaType.parseMediaType(format.equals("csv")?"text/csv;charset=UTF-8":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=\"me-may-sach."+format+"\"").body(body);
    }
    private ImportOptions currentOptions() {
        return new ImportOptions(taxonomy.get(),jdbc.query("select slug,name from collection where active=true order by sort_order,id",(r,n)->new CollectionOption(r.getString(1),r.getString(2))));
    }
    private byte[] bytes(MultipartFile file) throws IOException {
        if(file.getSize()>BookImportSchema.MAX_BYTES)throw BookImportException.file(413,"file_limit","File tối đa 2 MiB.");
        return file.getBytes();
    }
}
