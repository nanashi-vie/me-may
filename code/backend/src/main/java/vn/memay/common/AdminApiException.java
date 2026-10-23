package vn.memay.common;
import java.util.Map;
public class AdminApiException extends RuntimeException {
 public final int status; public final String error; public final Map<String,java.util.List<String>> fieldErrors; public final Long currentVersion;
 public AdminApiException(int status,String error){this(status,error,Map.of(),null);}
 public AdminApiException(int status,String error,Map<String,java.util.List<String>> fields,Long version){super(error+(fields.isEmpty()?"":": "+String.join(",",fields.keySet())));this.status=status;this.error=error;this.fieldErrors=fields;this.currentVersion=version;}
 public static AdminApiException field(String field,String message){return new AdminApiException(400,"validation_error",Map.of(field,java.util.List.of(message)),null);}
 public static AdminApiException conflict(long version){return new AdminApiException(409,"version_conflict",Map.of(),version);}
}
