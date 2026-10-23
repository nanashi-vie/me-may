package vn.memay.media;
import org.springframework.stereotype.Component;
import java.time.*;
import java.util.*;
import vn.memay.common.AdminApiException;
@Component
public class UploadLimiter {
 private final Clock clock;private final Map<Long,ArrayDeque<Instant>> attempts=new HashMap<>();private int inFlight;
 public UploadLimiter(Clock clock){this.clock=clock;}
 public synchronized Lease acquire(long actorId){
  Instant cutoff=clock.instant().minusSeconds(600);attempts.values().forEach(q->{while(!q.isEmpty()&&!q.getFirst().isAfter(cutoff))q.removeFirst();});attempts.values().removeIf(Deque::isEmpty);
  var queue=attempts.computeIfAbsent(actorId,k->new ArrayDeque<>());if(queue.size()>=30||inFlight>=4)throw new AdminApiException(429,"upload_limit");queue.addLast(clock.instant());inFlight++;return new Lease();
 }
 synchronized int trackedActors(){return attempts.size();}
 public final class Lease implements AutoCloseable {
  private boolean closed;
  public void close(){synchronized(UploadLimiter.this){if(!closed){closed=true;inFlight--;}}}
 }
}
