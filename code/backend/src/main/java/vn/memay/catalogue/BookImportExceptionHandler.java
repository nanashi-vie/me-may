package vn.memay.catalogue;

import org.springframework.web.bind.annotation.*;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.*;
import java.util.*;
import vn.memay.common.AdminApiException;

@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(assignableTypes=AdminBookImportController.class)
public class BookImportExceptionHandler {
    @ExceptionHandler(BookImportException.class)
    ResponseEntity<?> imported(BookImportException e) {
        return response(e.status,Map.of("error",e.error,"issues",e.issues,"totalIssues",e.totalIssues));
    }
    @ExceptionHandler(BookImportGate.Limited.class)
    ResponseEntity<?> limited(BookImportGate.Limited e) {
        return ResponseEntity.status(429).cacheControl(CacheControl.noStore()).header(HttpHeaders.RETRY_AFTER,Long.toString(e.retryAfter))
                .body(Map.of("error","import_rate_limited","message","Đang có import khác hoặc đã đạt giới hạn. Giữ file và thử lại sau."));
    }
    @ExceptionHandler(AdminApiException.class)
    ResponseEntity<?> domain(AdminApiException e) {return response(e.status,Map.of("error",e.error,"fieldErrors",e.fieldErrors));}
    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    ResponseEntity<?> large(Exception e) {return response(413,Map.of("error","file_limit"));}
    @ExceptionHandler({org.springframework.web.bind.MissingServletRequestParameterException.class,org.springframework.web.multipart.support.MissingServletRequestPartException.class,org.springframework.web.HttpMediaTypeNotSupportedException.class})
    ResponseEntity<?> malformed(Exception e) {return response(400,Map.of("error","invalid_request"));}
    @ExceptionHandler(Exception.class)
    ResponseEntity<?> failed(Exception e) {return response(500,Map.of("error","import_failed","message","Chưa nhận được xác nhận. Giữ file và thử lại đúng lần import này."));}
    private ResponseEntity<?> response(int status,Object body){return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).body(body);}
}
