package vn.memay.media;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import java.io.InputStream;
import vn.memay.auth.AdminUser;
import vn.memay.catalogue.BookDtos.BookDetail;
import vn.memay.media.MediaDtos.MediaRole;

@Service
public class MediaService {
    @org.springframework.beans.factory.annotation.Autowired private vn.memay.common.PerformanceTimings timings = new vn.memay.common.PerformanceTimings(false);

    private final MediaTransactions transactions;
    private final MediaGateway gateway;
    private final ImageValidator validator;
    private final UploadLimiter limiter;
    private final String namespace;

    public MediaService(MediaTransactions transactions, MediaGateway gateway, ImageValidator validator,
            UploadLimiter limiter, @Value("${memay.media.namespace:memay/dev}") String namespace) {
        this.transactions = transactions;
        this.gateway = gateway;
        this.validator = validator;
        this.limiter = limiter;
        this.namespace = namespace;
    }

    public BookDetail upload(long id, MediaRole role, long version, AdminUser actor, byte[] file, String alt,
            String sourceRef) {
        timings.measure("validation", () -> {validator.validate(file);return null;});
        try (var lease = limiter.acquire(actor.getId())) {
            var intent = timings.measure("begin", () -> transactions.begin(id, role, version, actor, alt, sourceRef, namespace));
            var uploaded = gateway.upload(intent.publicId(), file);
            try {
                return timings.measure("ready", () -> transactions.attach(intent, id, version, actor, uploaded));
            } catch (RuntimeException e) {
                try {
                    transactions.fail(intent.id());
                } catch (RuntimeException cleanup) {
                    org.slf4j.LoggerFactory.getLogger(MediaService.class).warn("Media intent awaiting recovery: {}",
                            intent.id());
                }
                throw e;
            }
        }
    }

    public BookDetail updateMetadata(long id, MediaRole role, long version, AdminUser actor, String alt,
            String sourceRef) {
        return transactions.metadata(id, role, version, actor, alt, sourceRef);
    }

    public BookDetail remove(long id, MediaRole role, long version, AdminUser actor) {
        return transactions.remove(id, role, version, actor);
    }

    public InputStream content(long id, MediaRole role, AdminUser actor) {
        return gateway.openPreview(timings.measure("authorization", () -> transactions.activeKey(id, role)));
    }
}
