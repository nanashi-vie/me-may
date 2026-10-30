package vn.memay.common;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
class PerformanceTimingFilterTest {
 @Test void neverLogsSqlOrCredentials() throws Exception {
  var events=new ArrayList<PerformanceTimings.Event>();var timings=new PerformanceTimings(true,events::add);
  var request=new MockHttpServletRequest("POST","/api/v1/admin/books");request.addHeader("Authorization","SECRET");request.setQueryString("token=SECRET");
  new PerformanceTimingFilter(timings).doFilter(request,new MockHttpServletResponse(),(req,res)->timings.measure("validation",()->1));
  assertEquals("publish",events.getFirst().operation());assertFalse(events.toString().contains("SECRET"));
  assertEquals("request",events.getLast().phase());
 }

 @Test void committedStreamFailureCompletesAsExactlyOneFailedRequest() throws Exception {
  var events=Collections.synchronizedList(new ArrayList<PerformanceTimings.Event>());var timings=new PerformanceTimings(true,events::add);
  var request=new MockHttpServletRequest("GET","/api/v1/admin/books/1/media/FRONT/content");request.setAsyncSupported(true);
  var response=new MockHttpServletResponse();var captured=new java.util.concurrent.atomic.AtomicReference<PerformanceTimings.Trace>();
  new PerformanceTimingFilter(timings).doFilter(request,response,(req,res)->{captured.set(timings.capture());req.startAsync();res.flushBuffer();});
  var worker=new Thread(()->{try{captured.get().measureIo("stream",()->{throw new java.io.IOException("SECRET provider URL");});}catch(java.io.IOException expected){}});
  worker.start();worker.join();((MockAsyncContext)request.getAsyncContext()).complete();captured.get().finish("ok");
  assertTrue(response.isCommitted());assertEquals(200,response.getStatus());
  var terminal=events.stream().filter(e->e.phase().equals("request")).toList();assertEquals(1,terminal.size());assertEquals("error",terminal.getFirst().status());
  assertFalse(events.toString().contains("SECRET"));
 }
}
