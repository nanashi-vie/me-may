package vn.memay.media;
import org.springframework.stereotype.Service;
import java.util.UUID;
import java.io.InputStream;
import vn.memay.auth.AdminUser;
import static vn.memay.media.UploadSessionDtos.*;
@Service
public class UploadSessionService {
 private final UploadSessionTransactions transactions;private final MediaGateway gateway;private final ImageValidator validator;private final UploadLimiter limiter;
 public UploadSessionService(UploadSessionTransactions transactions,MediaGateway gateway,ImageValidator validator,UploadLimiter limiter){this.transactions=transactions;this.gateway=gateway;this.validator=validator;this.limiter=limiter;}
 public UploadSession create(AdminUser actor){return transactions.create(actor);}
 public UploadSession get(UUID id,AdminUser actor){return transactions.get(id,actor);}
 public TemporaryMedia upload(UUID id,AdminUser actor,byte[] file,String alt,String sourceRef,UUID replace) {
  transactions.requireOwner(actor);validator.validate(file);
  try(var lease=limiter.acquire(actor.getId())) {
   var intent=transactions.begin(id,actor,replace,alt,sourceRef);
   try {return transactions.ready(intent,actor,gateway.upload(intent.publicId(),file));}
   catch(RuntimeException e){transactions.failed(intent.id());throw e;}
  }
 }
 public InputStream content(UUID session,UUID media,AdminUser actor){return gateway.openPreview(transactions.contentKey(session,media,actor));}
 public void remove(UUID session,UUID media,AdminUser actor){transactions.remove(session,media,actor);}
 public void cancel(UUID session,AdminUser actor){transactions.cancel(session,actor);}
}
