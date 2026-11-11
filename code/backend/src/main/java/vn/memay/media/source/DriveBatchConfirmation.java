package vn.memay.media.source;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import vn.memay.auth.AdminUser;
import vn.memay.common.AdminApiException;

@Service
@ConditionalOnProperty(prefix="memay.media.local",name="enabled",havingValue="true")
public class DriveBatchConfirmation {
    private final DriveBatchService batches;
    private final DriveSourceClient drive;
    public DriveBatchConfirmation(DriveBatchService batches,DriveSourceClient drive) {
        this.batches=batches; this.drive=drive;
    }
    // Both short transactions are on the proxied service; provider I/O is between them.
    public DriveBatchDtos.View confirm(java.util.UUID id,DriveBatchDtos.Confirm input,AdminUser actor) {
        var expected=batches.prepareConfirmation(id,input,actor);
        try {
            var observed=expected.stream().map(source->drive.inspect(source.fileId())).toList();
            return batches.confirmChecked(id,input,actor,observed);
        } catch (SourceAccessException error) {
            throw new AdminApiException(409,error.code());
        }
    }
}
