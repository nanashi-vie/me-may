package vn.memay.media;
import org.junit.jupiter.api.Test;
import vn.memay.common.AdminApiException;
import java.time.*;
import static org.assertj.core.api.Assertions.*;
class UploadLimiterTest {
 static class MutableClock extends Clock {Instant now=Instant.parse("2026-01-01T00:00:00Z");public ZoneId getZone(){return ZoneOffset.UTC;}public Clock withZone(ZoneId z){return this;}public Instant instant(){return now;}}
 @Test void thirtyFirstUploadIs429AndWindowExpires()throws Exception{var clock=new MutableClock();var limiter=new UploadLimiter(clock);for(int i=0;i<30;i++)try(var ignored=limiter.acquire(1)){}assertThatThrownBy(()->limiter.acquire(1)).isInstanceOfSatisfying(AdminApiException.class,e->assertThat(e.status).isEqualTo(429));clock.now=clock.now.plusSeconds(600);try(var ignored=limiter.acquire(1)){}assertThat(limiter.trackedActors()).isEqualTo(1);}
 @Test void fifthConcurrentUploadIsBlockedAndCloseIsIdempotent()throws Exception{var limiter=new UploadLimiter(Clock.systemUTC());var leases=new java.util.ArrayList<UploadLimiter.Lease>();for(int i=0;i<4;i++)leases.add(limiter.acquire(i));assertThatThrownBy(()->limiter.acquire(8)).isInstanceOf(AdminApiException.class);leases.getFirst().close();leases.getFirst().close();try(var ignored=limiter.acquire(9)){assertThatThrownBy(()->limiter.acquire(10)).isInstanceOf(AdminApiException.class);}for(var lease:leases)lease.close();}
 @Test void exceptionDoesNotLeakPermit(){var limiter=new UploadLimiter(Clock.systemUTC());assertThatThrownBy(()->{try(var ignored=limiter.acquire(1)){throw new IllegalStateException();}}).isInstanceOf(IllegalStateException.class);assertThatCode(()->{try(var ignored=limiter.acquire(1)){}}).doesNotThrowAnyException();}
}
