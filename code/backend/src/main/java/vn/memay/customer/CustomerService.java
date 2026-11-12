package vn.memay.customer;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import java.time.Clock;
import java.util.*;
import vn.memay.auth.AdminUser;
import vn.memay.audit.AuditService;
import vn.memay.common.AdminApiException;
import static vn.memay.customer.CustomerDtos.*;

@Service
public class CustomerService {
 private final CustomerRepository customers;
 private final JdbcTemplate jdbc;
 private final AuditService audit;
 private final Clock clock;
 public CustomerService(CustomerRepository customers,JdbcTemplate jdbc,AuditService audit,Clock clock){this.customers=customers;this.jdbc=jdbc;this.audit=audit;this.clock=clock;}
 public static final class DuplicatePhoneException extends RuntimeException {
  public final Page<DuplicateSummary> duplicates;
  DuplicatePhoneException(Page<DuplicateSummary> duplicates){super("CUSTOMER_PHONE_DUPLICATE");this.duplicates=duplicates;}
 }
 private void requireOwner(AdminUser actor){
  var roles=jdbc.queryForList("select role from admin_user where id=? and active=true for share",String.class,actor.getId());
  if(roles.isEmpty()||!roles.getFirst().equals("OWNER"))throw new AdminApiException(403,"forbidden");
 }
 private void paging(int page,int size){if(page<0||size<1||size>100)throw new AdminApiException(400,"invalid_request");}
 private CustomerDetail current(long id,boolean lock){return customers.find(id,lock).orElseThrow(()->new AdminApiException(404,"not_found"));}
 private void version(CustomerDetail c,Long expected){if(expected==null||expected<0)throw new AdminApiException(400,"invalid_request");if(c.version()!=expected)throw AdminApiException.conflict(c.version());}
 private void checkPhone(String phone,Long id,Boolean confirmed,String confirmedPhone){
  if(Boolean.TRUE.equals(confirmed)&&(phone==null||!phone.equals(confirmedPhone)))throw AdminApiException.field("phone","Xác nhận không khớp số điện thoại đang nhập");
  if(phone!=null){var matches=customers.duplicates(phone,id,0,20);if(matches.totalElements()>0&&!Boolean.TRUE.equals(confirmed))throw new DuplicatePhoneException(matches);}
 }
 @Transactional(readOnly=true)
 public Page<CustomerSummary> list(String q,String status,int page,int size,AdminUser actor){paging(page,size);if(!Set.of("ACTIVE","ARCHIVED","ALL").contains(status))throw new AdminApiException(400,"invalid_request");return customers.list(CustomerValidation.normalizeQuery(q),status,page,size);}
 @Transactional(readOnly=true)
 public CustomerDetail detail(long id,AdminUser actor){return current(id,false);}
 @Transactional(readOnly=true)
 public Page<DuplicateSummary> duplicates(String phone,Long excludeId,int page,int size,AdminUser actor){paging(page,size);return customers.duplicates(CustomerValidation.normalizePhone(phone),excludeId,page,size);}
 @Transactional
 public CustomerDetail create(CreateRequest r,AdminUser actor){
  requireOwner(actor);var w=CustomerValidation.normalize(r.write());checkPhone(w.phone(),null,r.confirmDuplicatePhone(),r.confirmedPhone());
  var result=customers.insert(w,actor.getId(),clock.instant());record(actor,result,"CREATE");return result;
 }
 @Transactional
 public CustomerDetail update(long id,UpdateRequest r,AdminUser actor){
  requireOwner(actor);var c=current(id,true);version(c,r.version());var w=CustomerValidation.normalize(r.write());
  if(!Objects.equals(c.phone(),w.phone()))checkPhone(w.phone(),id,r.confirmDuplicatePhone(),r.confirmedPhone());
  if(c.write().equals(w))return c;
  if(customers.update(id,c.version(),w,clock.instant())!=1)throw AdminApiException.conflict(current(id,false).version());
  var result=current(id,false);record(actor,result,"UPDATE");return result;
 }
 @Transactional
 public CustomerDetail status(long id,StatusRequest r,AdminUser actor){
  requireOwner(actor);var c=current(id,true);version(c,r.version());if(r.status()==null)throw new AdminApiException(400,"invalid_request");if(c.status()==r.status())return c;
  if(customers.setStatus(id,c.version(),r.status(),clock.instant())!=1)throw AdminApiException.conflict(current(id,false).version());
  var result=current(id,false);record(actor,result,r.status()==Status.ACTIVE?"RESTORE":"ARCHIVE");return result;
 }
 private void record(AdminUser actor,CustomerDetail c,String action){audit.record(actor,"CUSTOMER",Long.parseLong(c.id()),action,Map.of(),Map.of(),c.version());}
}
