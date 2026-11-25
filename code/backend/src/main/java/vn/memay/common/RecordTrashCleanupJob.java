package vn.memay.common;

import java.time.Clock;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class RecordTrashCleanupJob {
    private static final Logger log = LoggerFactory.getLogger(RecordTrashCleanupJob.class);
    private final List<RecordTrash> trashes;
    private final Clock clock;

    public RecordTrashCleanupJob(List<RecordTrash> trashes, Clock clock) {
        this.trashes = trashes;
        this.clock = clock;
    }

    @Scheduled(fixedDelayString = "${memay.trash.cleanup-delay-ms:600000}",
            initialDelayString = "${memay.trash.cleanup-delay-ms:600000}")
    public void runOnce() {
        for (var trash : trashes) {
            try {
                trash.purgeExpired(clock.instant());
            } catch (RuntimeException e) {
                // One kind failing must not keep the others past their retention.
                log.error("Trash cleanup failed type={} cause={}", trash.getClass().getSimpleName(), e.getClass().getSimpleName());
            }
        }
    }
}
