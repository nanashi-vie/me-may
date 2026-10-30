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
}
