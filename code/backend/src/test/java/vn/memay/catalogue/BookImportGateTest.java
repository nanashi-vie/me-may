package vn.memay.catalogue;

import org.junit.jupiter.api.Test;
import java.time.*;
import static org.assertj.core.api.Assertions.*;

class BookImportGateTest {
    static final class Time extends Clock {
        Instant now=Instant.parse("2026-10-31T00:00:00Z");
        public Instant instant(){return now;}public ZoneId getZone(){return ZoneOffset.UTC;}public Clock withZone(ZoneId zone){return this;}
    }
    @Test void allowsOnlyOneInflightAndClosesPermitOnce() {
        var gate=new BookImportGate(new Time());var first=gate.acquire(1);
        assertThatThrownBy(()->gate.acquire(1)).isInstanceOf(BookImportGate.Limited.class);
        try(var other=gate.acquire(2)){gate.charge(2);}
        first.close();var second=gate.acquire(1);first.close();
        assertThatThrownBy(()->gate.acquire(1)).isInstanceOf(BookImportGate.Limited.class);second.close();
    }
    @Test void limitsTenStartsUntilExactWindowBoundaryButPermitDoesNotConsumeAttempt() {
        var time=new Time();var gate=new BookImportGate(time);
        for(int i=0;i<10;i++)try(var permit=gate.acquire(1)){gate.charge(1);}
        try(var receiptPermit=gate.acquire(1)) {
            assertThatThrownBy(()->gate.charge(1)).isInstanceOfSatisfying(BookImportGate.Limited.class,e->assertThat(e.retryAfter).isEqualTo(600));
        }
        time.now=time.now.plusSeconds(600);
        try(var permit=gate.acquire(1)){gate.charge(1);}
    }
}
