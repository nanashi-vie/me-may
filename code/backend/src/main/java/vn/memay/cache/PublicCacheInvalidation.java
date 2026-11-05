package vn.memay.cache;

import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import tools.jackson.databind.ObjectMapper;

@Component
public class PublicCacheInvalidation {
    private final String zone;
    private final String token;
    private final ObjectMapper mapper;
    private final HttpClient client;
    private final AtomicLong revision = new AtomicLong();
    private volatile long cleared;
    private long nextAttempt = System.nanoTime();

    @org.springframework.beans.factory.annotation.Autowired
    public PublicCacheInvalidation(@Value("${MEMAY_CACHE_ZONE_ID:}") String zone,
            @Value("${MEMAY_CACHE_PURGE_TOKEN:}") String token, ObjectMapper mapper) {
        this(zone, token, mapper, HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build());
    }

    PublicCacheInvalidation(String zone, String token, ObjectMapper mapper, HttpClient client) {
        this.client = client;
        if (!zone.isEmpty() && !zone.matches("[a-fA-F0-9]{32}"))
            throw new IllegalArgumentException("MEMAY_CACHE_ZONE_ID must be a Cloudflare zone ID");
        this.zone = zone;
        this.token = token;
        this.mapper = mapper;
    }

    @jakarta.annotation.PostConstruct
    void startup() {
        if (enabled()) revision.incrementAndGet();
    }

    public boolean enabled() {
        return !zone.isBlank() && !token.isBlank();
    }

    public void changed() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    revision.incrementAndGet();
                }
            });
        } else {
            revision.incrementAndGet();
        }
    }

    long revision() { return revision.get(); }
    boolean pending() { return cleared < revision.get(); }
    void purged(long version) { cleared = version; }

    // One zone purge coalesces a batch of imports/edits. TTL bounds stale data if it fails.
    @Scheduled(fixedDelay = 1000)
    public synchronized void flush() {
        if (!enabled() || !pending() || System.nanoTime() < nextAttempt) return;
        nextAttempt = System.nanoTime() + Duration.ofSeconds(12).toNanos();
        long version = revision.get();
        try {
            var request = HttpRequest.newBuilder(
                    URI.create("https://api.cloudflare.com/client/v4/zones/" + zone + "/purge_cache"))
                    .timeout(Duration.ofSeconds(5))
                    .header("Authorization", "Bearer " + token)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString("{\"purge_everything\":true}")).build();
            var response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200
                    && Boolean.TRUE.equals(mapper.readValue(response.body(), Map.class).get("success"))) {
                purged(version);
            } else {
                LoggerFactory.getLogger(getClass()).warn("Public cache purge failed (HTTP {}), will retry",
                        response.statusCode());
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (Exception e) {
            LoggerFactory.getLogger(getClass()).warn("Public cache purge unavailable, will retry");
        }
    }
}
