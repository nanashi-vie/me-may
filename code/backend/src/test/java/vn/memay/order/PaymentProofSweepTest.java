package vn.memay.order;

import java.nio.file.Files;
import java.nio.file.attribute.FileTime;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import vn.memay.support.OrderTestSupport;
import static org.assertj.core.api.Assertions.*;

class PaymentProofSweepTest extends OrderTestSupport {
    @Autowired PaymentProofSweep sweep;

    private java.nio.file.Path file(String name, Instant modified) throws Exception {
        Files.createDirectories(proofDir());
        var path = Files.write(proofDir().resolve(name), PNG);
        Files.setLastModifiedTime(path, FileTime.from(modified));
        return path;
    }

    @Test void removesOnlyOldFilesNoPaymentPointsAt() throws Exception {
        Instant now = Instant.now(), old = now.minus(2, ChronoUnit.HOURS);
        long id = draft();
        manual(id, 500000, 1, 250);
        deposit(id, 0, 100000);
        String kept = jdbc.queryForObject("select proof_key from order_payments where order_id=?", String.class, id);
        Files.setLastModifiedTime(proofDir().resolve(kept), FileTime.from(old));
        var orphan = file(UUID.randomUUID() + ".png", old);
        var fresh = file(UUID.randomUUID() + ".jpg", now);
        var temp = file(".upload-123.tmp", old);
        var stranger = file("notes.txt", old);
        sweep.run(now);
        assertThat(proofDir().resolve(kept)).exists();
        assertThat(orphan).doesNotExist();
        assertThat(temp).doesNotExist();
        assertThat(fresh).exists();
        assertThat(stranger).exists();
    }
}
