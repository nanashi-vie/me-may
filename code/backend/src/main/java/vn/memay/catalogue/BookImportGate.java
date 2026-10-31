package vn.memay.catalogue;

import org.springframework.stereotype.Component;
import java.time.*;
import java.util.*;

@Component
public class BookImportGate {
    public static final class Limited extends RuntimeException {
        public final long retryAfter;
        Limited(long seconds){super("import_rate_limited");retryAfter=Math.max(1,seconds);}
    }
    private static final class State { boolean inFlight;int count;Instant start;State(Instant start){this.start=start;} }
    public final class Permit implements AutoCloseable {
        private final State state;private boolean closed;
        private Permit(State state){this.state=state;}
        @Override public void close(){synchronized(BookImportGate.this){if(!closed){state.inFlight=false;closed=true;}}}
    }
    private final Clock clock;private final Map<Long,State> states=new HashMap<>();
    public BookImportGate(Clock clock){this.clock=clock;}
    public synchronized Permit acquire(long ownerId) {
        Instant now=clock.instant();
        states.entrySet().removeIf(e->!e.getValue().inFlight && (e.getValue().count==0 || !now.isBefore(e.getValue().start.plusSeconds(600))));
        State state=states.computeIfAbsent(ownerId,k->new State(now));
        if(state.inFlight)throw new Limited(1);state.inFlight=true;return new Permit(state);
    }
    public synchronized void charge(long ownerId) {
        State state=states.get(ownerId);if(state==null || !state.inFlight)throw new IllegalStateException("import_permit_required");
        Instant now=clock.instant();if(!now.isBefore(state.start.plusSeconds(600))){state.count=0;state.start=now;}
        if(state.count>=10)throw new Limited((Duration.between(now,state.start.plusSeconds(600)).toMillis()+999)/1000);
        state.count++;
    }
}
