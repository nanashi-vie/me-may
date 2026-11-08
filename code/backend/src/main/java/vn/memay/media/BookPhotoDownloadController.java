package vn.memay.media;

import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.memay.common.AdminActorResolver;

import java.util.List;

@RestController
public class BookPhotoDownloadController {
    private final AdminActorResolver actors;
    private final BookPhotoDownloadService photos;

    public BookPhotoDownloadController(AdminActorResolver actors, BookPhotoDownloadService photos) {
        this.actors = actors;
        this.photos = photos;
    }

    @GetMapping("/api/v1/admin/books/photo-download")
    public ResponseEntity<byte[]> download(Authentication auth, @RequestParam List<Long> ids) {
        var archive = photos.create(actors.current(auth), ids);
        var response = ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/zip"))
                .cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(archive.filename()).build().toString());
        if (!archive.missingBookCodes().isEmpty()) {
            response.header("X-Missing-Book-Codes", String.join(",", archive.missingBookCodes()));
        }
        return response.body(archive.content());
    }
}
