package vn.memay.customer;
import java.time.Instant;
import java.util.List;
import jakarta.validation.constraints.*;
public final class CustomerDtos {
 private CustomerDtos(){}
 public enum Status { ACTIVE, ARCHIVED }
 public record CustomerWrite(String fullName,String phone,String defaultAddress,String zaloName,String tiktokId,String threadsId,String note){}
 public record CreateRequest(String fullName,String phone,String defaultAddress,String zaloName,String tiktokId,String threadsId,String note,Boolean confirmDuplicatePhone,String confirmedPhone){
  public CustomerWrite write(){return new CustomerWrite(fullName,phone,defaultAddress,zaloName,tiktokId,threadsId,note);}
 }
 public record UpdateRequest(String fullName,String phone,String defaultAddress,String zaloName,String tiktokId,String threadsId,String note,@NotNull @Min(0) Long version,Boolean confirmDuplicatePhone,String confirmedPhone){
  public CustomerWrite write(){return new CustomerWrite(fullName,phone,defaultAddress,zaloName,tiktokId,threadsId,note);}
 }
 public record StatusRequest(@NotNull Status status,@NotNull @Min(0) Long version){}
 public record CustomerDetail(String id,String customerCode,String fullName,String phone,String defaultAddress,String zaloName,String tiktokId,String threadsId,String note,Status status,long version,String createdBy,Instant createdAt,Instant updatedAt){
  public CustomerWrite write(){return new CustomerWrite(fullName,phone,defaultAddress,zaloName,tiktokId,threadsId,note);}
 }
 public record CustomerSummary(String id,String customerCode,String fullName,String phone,String defaultAddress,Status status,long version,Instant createdAt){}
 public record DuplicateSummary(String id,String customerCode,String fullName,String phone,Status status){}
 public record Page<T>(List<T> items,int page,int size,long totalElements,long totalPages){}
}
