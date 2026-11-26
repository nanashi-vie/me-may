package vn.memay.order;

import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Deletes receipt files a crash or a failed delete left behind, after a one-hour grace. */
@Component
public class PaymentProofSweep {
    static final Duration GRACE = Duration.ofHours(1);
    private final JdbcTemplate jdbc;
    private final PaymentProofStore proofs;

    public PaymentProofSweep(JdbcTemplate jdbc, PaymentProofStore proofs) {
        this.jdbc = jdbc;
        this.proofs = proofs;
    }

    @Scheduled(fixedDelayString = "${memay.payment-proofs.sweep-delay-ms:3600000}",
            initialDelayString = "${memay.payment-proofs.sweep-delay-ms:3600000}")
    public void scheduled() {
        run(Instant.now());
    }

    /** Keys are read before listing files, so a receipt committed meanwhile is younger than the cutoff. */
    public int run(Instant now) {
        var referenced = new HashSet<>(jdbc.queryForList("select proof_key from order_payments where proof_key is not null", String.class));
        return proofs.sweep(now.minus(GRACE), referenced);
    }
}
