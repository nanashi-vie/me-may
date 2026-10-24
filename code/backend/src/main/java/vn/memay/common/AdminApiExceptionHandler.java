package vn.memay.common;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import jakarta.persistence.OptimisticLockException;
import java.util.*;
@RestControllerAdvice
public class AdminApiExceptionHandler {
 private final org.springframework.jdbc.core.JdbcTemplate jdbc;
 public AdminApiExceptionHandler(org.springframework.jdbc.core.JdbcTemplate jdbc){this.jdbc=jdbc;}

 @ExceptionHandler(AdminApiException.class) ResponseEntity<?> domain(AdminApiException e){return response(e.status,e.error,e.fieldErrors,e.currentVersion);}
 @ExceptionHandler(MethodArgumentNotValidException.class) ResponseEntity<?> validation(MethodArgumentNotValidException e){
  Map<String,List<String>> fields=new LinkedHashMap<>();e.getBindingResult().getFieldErrors().forEach(f->fields.computeIfAbsent(f.getField(),k->new ArrayList<>()).add("Giá trị bắt buộc hoặc không hợp lệ"));return response(400,"validation_error",fields,null);
 }
 @ExceptionHandler({HttpMessageNotReadableException.class,MethodArgumentTypeMismatchException.class}) ResponseEntity<?> malformed(Exception e){return response(400,"invalid_request",Map.of(),null);}
 @ExceptionHandler({OptimisticLockException.class,ObjectOptimisticLockingFailureException.class}) ResponseEntity<?> stale(Exception e,jakarta.servlet.http.HttpServletRequest request){
  Long version=null;var match=java.util.regex.Pattern.compile("^/api/v1/admin/(books|collections)/([1-9][0-9]*)(?:/.*)?$").matcher(request.getRequestURI());
  if(match.matches()){String table=match.group(1).equals("books")?"book_copy":"collection";var values=jdbc.queryForList("select version from "+table+" where id=?",Long.class,Long.parseLong(match.group(2)));if(!values.isEmpty())version=values.getFirst();}
  return response(409,"version_conflict",Map.of(),version);
 }
 @ExceptionHandler(DataIntegrityViolationException.class) ResponseEntity<?> constraint(Exception e){return response(409,"data_conflict",Map.of(),null);}
 @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class) ResponseEntity<?> large(Exception e){return response(413,"image_too_large",Map.of(),null);}
 @ExceptionHandler(org.springframework.web.bind.MissingServletRequestParameterException.class) ResponseEntity<?> missing(Exception e){return response(400,"invalid_request",Map.of(),null);}
 private ResponseEntity<?> response(int status,String error,Map<String,List<String>> fields,Long version){
  var body=new LinkedHashMap<String,Object>();body.put("error",error);body.put("message",switch(error){case "version_conflict"->"Dữ liệu đã thay đổi. Tải lại trước khi lưu.";case "forbidden"->"Bạn không có quyền thực hiện thao tác này.";case "not_found"->"Không tìm thấy dữ liệu.";default->"Không thể thực hiện yêu cầu. Kiểm tra dữ liệu và thử lại.";});
  if(!fields.isEmpty())body.put("fieldErrors",fields);if(version!=null)body.put("currentVersion",version);return ResponseEntity.status(status).header("Cache-Control","no-store").body(body);
 }
}
