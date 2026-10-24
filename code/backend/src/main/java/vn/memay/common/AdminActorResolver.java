package vn.memay.common;
import org.springframework.stereotype.Component;
import org.springframework.security.core.Authentication;
import vn.memay.auth.*;
@Component
public class AdminActorResolver {
 private final AdminUserRepository users;
 public AdminActorResolver(AdminUserRepository users){this.users=users;}
 public AdminUser current(Authentication authentication){
  if(authentication==null || !authentication.isAuthenticated())throw new AdminApiException(401,"unauthorized");
  return users.findByEmail(authentication.getName()).filter(AdminUser::isActive).orElseThrow(()->new AdminApiException(401,"unauthorized"));
 }
}
