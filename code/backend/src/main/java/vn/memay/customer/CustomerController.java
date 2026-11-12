package vn.memay.customer;

import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.http.ResponseEntity;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.Map;
import vn.memay.common.AdminActorResolver;
import static vn.memay.customer.CustomerDtos.*;

@RestController
@RequestMapping("/api/v1/admin/customers")
public class CustomerController {
 private final CustomerService customers;
 private final AdminActorResolver actors;
 public CustomerController(CustomerService customers,AdminActorResolver actors){this.customers=customers;this.actors=actors;}
 @GetMapping public Page<CustomerSummary> list(Authentication a,@RequestParam(defaultValue="") String q,@RequestParam(defaultValue="ACTIVE") String status,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return customers.list(q,status,page,size,actors.current(a));}
 @GetMapping("/duplicates") public Page<DuplicateSummary> duplicates(Authentication a,@RequestParam String phone,@RequestParam(required=false) Long excludeId,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return customers.duplicates(phone,excludeId,page,size,actors.current(a));}
 @GetMapping("/{id}") public CustomerDetail detail(Authentication a,@PathVariable long id){return customers.detail(id,actors.current(a));}
 @PostMapping public ResponseEntity<CustomerDetail> create(Authentication a,@Valid @RequestBody CreateRequest r){var c=customers.create(r,actors.current(a));return ResponseEntity.created(URI.create("/api/v1/admin/customers/"+c.id())).body(c);}
 @PutMapping("/{id}") public CustomerDetail update(Authentication a,@PathVariable long id,@Valid @RequestBody UpdateRequest r){return customers.update(id,r,actors.current(a));}
 @PatchMapping("/{id}/status") public CustomerDetail status(Authentication a,@PathVariable long id,@Valid @RequestBody StatusRequest r){return customers.status(id,r,actors.current(a));}
 @ExceptionHandler(CustomerService.DuplicatePhoneException.class) public ResponseEntity<?> duplicate(CustomerService.DuplicatePhoneException e){return ResponseEntity.status(409).header("Cache-Control","no-store").body(Map.of("error","CUSTOMER_PHONE_DUPLICATE","message","Số điện thoại đã có trong hồ sơ khách hàng.","duplicates",e.duplicates));}
}
