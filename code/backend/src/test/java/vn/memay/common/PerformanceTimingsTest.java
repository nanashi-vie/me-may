package vn.memay.common;

import org.junit.jupiter.api.Test;
import java.io.IOException;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class PerformanceTimingsTest {
 @Test void disabledDoesNotRecord() {
  var events=new ArrayList<PerformanceTimings.Event>(); var t=new PerformanceTimings(false,events::add);
  try(var trace=t.start("admin")){assertEquals(42,t.measure("validation",()->42));}
  assertTrue(events.isEmpty());
 }
 @Test void recordsFailureAndClearsThreadContext() {
  var events=new ArrayList<PerformanceTimings.Event>(); var t=new PerformanceTimings(true,events::add);
  try(var trace=t.start("publish")) {
   assertThrows(IllegalStateException.class,()->t.measure("validation",()->{throw new IllegalStateException("SECRET");}));
  }
  t.measure("validation",()->1);
  assertEquals(2,events.size()); assertEquals("error",events.getFirst().status());
  assertFalse(events.toString().contains("SECRET"));
  assertEquals(events.getFirst().requestId(),events.getLast().requestId());
 }
 @Test void streamUsesCapturedTraceWithoutLeakingNextRequest() throws Exception {
  var events=Collections.synchronizedList(new ArrayList<PerformanceTimings.Event>());var t=new PerformanceTimings(true,events::add);
  var trace=t.start("content");t.detach();
  Thread worker=new Thread(()->{try{trace.measureIo("stream",()->{throw new IOException("SECRET");});}catch(IOException expected){} finally{trace.close();}});
  worker.start();worker.join();
  try(var next=t.start("publish")){t.measure("validation",()->1);}
  assertEquals(4,events.size()); assertNotEquals(events.get(0).requestId(),events.get(2).requestId());
  assertEquals("error",events.get(0).status());assertFalse(events.toString().contains("SECRET"));
 }
}
