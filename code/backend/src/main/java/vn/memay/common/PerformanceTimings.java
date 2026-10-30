package vn.memay.common;

import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.*;
import java.io.IOException;
import java.util.*;
import java.util.function.*;

/** Opt-in, metadata-only timings; never accepts URLs, SQL or payload values. */
@Component
@org.springframework.context.annotation.Role(org.springframework.beans.factory.config.BeanDefinition.ROLE_INFRASTRUCTURE)
public class PerformanceTimings {
    private static final Set<String> PHASES = Set.of("request", "validation", "fingerprint", "begin", "ready",
            "publish", "mapping", "provider", "authorization", "provider_open", "stream", "query", "connection");
    private final boolean enabled;
    private final Consumer<Event> sink;
    private final ThreadLocal<Trace> current = new ThreadLocal<>();
    public record Event(String requestId, String operation, String phase, double durationMs, String status, long count) {}
    @FunctionalInterface public interface IoAction { void run() throws IOException; }
    @Autowired public PerformanceTimings(@Value("${memay.performance.enabled:false}") boolean enabled) {
        this(enabled, event -> org.slf4j.LoggerFactory.getLogger(PerformanceTimings.class).info(
                "perf request_id={} operation={} phase={} duration_ms={} status={} count={}",
                event.requestId(), event.operation(), event.phase(), event.durationMs(), event.status(), event.count()));
    }
    PerformanceTimings(boolean enabled, Consumer<Event> sink) { this.enabled=enabled; this.sink=sink; }
    public boolean enabled() { return enabled; }
    public Trace start(String operation) {
        var trace = new Trace(Set.of("admin","publish","upload","content").contains(operation) ? operation : "admin");
        if(enabled) current.set(trace);
        return trace;
    }
    public Trace capture() { return current.get(); }
    public void detach() { current.remove(); }
    public <T> T measure(String phase, Supplier<T> action) {
        return measured(current.get(),phase,action);
    }
    private <T> T measured(Trace trace,String phase,Supplier<T> action) {
        if(trace==null)return action.get();
        long start=System.nanoTime();String status="ok";
        try { return action.get(); } catch(RuntimeException | Error e) { status="error";throw e; }
        finally { if(trace!=null) trace.add(phase,start,status); }
    }
    public void record(String phase,long start,String status) { var trace=current.get();if(trace!=null)trace.add(phase,start,status); }
    public final class Trace implements AutoCloseable {
        private final String id=UUID.randomUUID().toString(), operation;
        private final long start=System.nanoTime();
        private boolean closed;
        private Trace(String operation) { this.operation=operation; }
        private synchronized void add(String phase,long start,String status) {
            if(enabled && !closed && PHASES.contains(phase))
                sink.accept(new Event(id,operation,phase,(System.nanoTime()-start)/1_000_000.0,status,1));
        }
        public void measureIo(String phase,IoAction action) throws IOException {
            long start=System.nanoTime();String status="ok";
            try { action.run(); } catch(IOException | RuntimeException | Error e){status="error";throw e;}
            finally{add(phase,start,status);}
        }
        public void close() { finish("ok"); }
        public synchronized void finish(String status) {
            if(!closed) {add("request",start,status);closed=true;}
            if(current.get()==this) current.remove();
        }
    }
}
