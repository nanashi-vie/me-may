package vn.memay.media;
import org.springframework.stereotype.Service;
import java.util.UUID;
import java.io.InputStream;
import vn.memay.auth.AdminUser;
import static vn.memay.media.UploadSessionDtos.*;
@Service
public class UploadSessionService {
    @org.springframework.beans.factory.annotation.Autowired private vn.memay.common.PerformanceTimings timings = new vn.memay.common.PerformanceTimings(false);

 private final UploadSessionTransactions transactions;private final MediaGateway gateway;private final ImageValidator validator;private final UploadLimiter limiter;private final tools.jackson.databind.ObjectMapper json;
 public UploadSessionService(UploadSessionTransactions transactions,MediaGateway gateway,ImageValidator validator,UploadLimiter limiter,tools.jackson.databind.ObjectMapper json){this.transactions=transactions;this.gateway=gateway;this.validator=validator;this.limiter=limiter;this.json=json;}
 public UploadSession create(AdminUser actor){return transactions.create(actor);}
 public UploadSession get(UUID id,AdminUser actor){return transactions.get(id,actor);}
 public TemporaryMedia upload(UUID id,AdminUser actor,byte[] file,String alt,String sourceRef,UUID replace,UUID requestKey) {
  transactions.requireOwner(actor);timings.measure("validation", () -> { validator.validate(file); return null; });
  try(var lease=limiter.acquire(actor.getId())) {
   String fingerprint;
   try {
    var digest=java.security.MessageDigest.getInstance("SHA-256");digest.update(file);
    digest.update(json.writeValueAsBytes(java.util.Arrays.asList(alt,sourceRef,replace)));fingerprint=java.util.HexFormat.of().formatHex(digest.digest());
   }catch(java.security.NoSuchAlgorithmException e){throw new IllegalStateException(e);}
   var intent=timings.measure("begin", () -> transactions.begin(id,actor,replace,alt,sourceRef,requestKey,fingerprint));
   if(intent.ready()!=null)return intent.ready();
   try {var uploaded=gateway.upload(intent.publicId(),file);return timings.measure("ready", () -> transactions.ready(intent,actor,uploaded));}
   catch(RuntimeException e){try{transactions.failed(intent.id());}catch(RuntimeException cleanup){org.slf4j.LoggerFactory.getLogger(UploadSessionService.class).warn("Temporary upload awaiting recovery: {}",intent.id());}throw e;}
  }
 }
 public InputStream content(UUID session,UUID media,AdminUser actor){return gateway.openPreview(timings.measure("authorization", () -> transactions.contentKey(session,media,actor)));}
 public TemporaryMedia metadata(UUID session,UUID media,AdminUser actor,String alt,String sourceRef){return transactions.metadata(session,media,actor,alt,sourceRef);}
 public void remove(UUID session,UUID media,AdminUser actor){transactions.remove(session,media,actor);}
 public void cancel(UUID session,AdminUser actor){transactions.cancel(session,actor);}
}
