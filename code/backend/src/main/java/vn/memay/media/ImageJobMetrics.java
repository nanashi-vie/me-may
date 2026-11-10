package vn.memay.media;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.binder.MeterBinder;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "memay.media.local", name = "enabled", havingValue = "true")
class ImageJobMetrics implements MeterBinder {
    private final JdbcTemplate jdbc;

    ImageJobMetrics(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override public void bindTo(MeterRegistry registry) {
        for (String status : new String[]{"PENDING", "PROCESSING", "RETRYING", "FAILED"}) {
            Gauge.builder("memay.image.jobs", jdbc,
                    db -> db.queryForObject("SELECT count(*) FROM image_job WHERE status=?", Long.class, status))
                    .tag("status", status).register(registry);
        }
        Gauge.builder("memay.image.jobs.oldest.pending.seconds", jdbc, db -> db.queryForObject("""
                SELECT coalesce(extract(epoch FROM clock_timestamp() - min(created_at)), 0)
                FROM image_job WHERE status IN ('PENDING','RETRYING')
                """, Double.class)).register(registry);
    }
}
