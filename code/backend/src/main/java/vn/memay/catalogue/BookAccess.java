package vn.memay.catalogue;
import org.springframework.stereotype.Component;
import vn.memay.auth.AdminUser;
import vn.memay.common.AdminApiException;
import vn.memay.catalogue.BookDtos.Publication;
@Component
public class BookAccess {
 public void requireWritable(AdminUser actor,Publication state){if(actor.getRole()!=AdminUser.Role.OWNER && state!=Publication.DRAFT)throw new AdminApiException(403,"forbidden");}
 public void requireOwner(AdminUser actor){if(actor.getRole()!=AdminUser.Role.OWNER)throw new AdminApiException(403,"forbidden");}
}
