package vn.memay.catalogue;

import java.time.Clock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class BookTrashCleanupJob {
    private final BookTrashService trash;
    private final Clock clock;

    public BookTrashCleanupJob(BookTrashService trash, Clock clock) {
        this.trash = trash;
        this.clock = clock;
    }

    @Scheduled(fixedDelayString = "${memay.trash.cleanup-delay-ms:600000}",
            initialDelayString = "${memay.trash.cleanup-delay-ms:600000}")
    public void runOnce() {
        trash.purgeExpired(clock.instant());
    }
}
