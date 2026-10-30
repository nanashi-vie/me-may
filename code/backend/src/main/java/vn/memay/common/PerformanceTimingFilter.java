package vn.memay.common;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

@Component
public class PerformanceTimingFilter extends OncePerRequestFilter {
    private final PerformanceTimings timings;
    public PerformanceTimingFilter(PerformanceTimings timings) { this.timings=timings; }
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !timings.enabled() || !request.getRequestURI().startsWith("/api/v1/admin/");
    }
    protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain)
            throws ServletException,IOException {
        String path=req.getRequestURI();
        String operation=path.endsWith("/content") || (req.getMethod().equals("GET") && path.contains("/media/")) ? "content"
                : req.getMethod().equals("POST") && path.endsWith("/books") ? "publish"
                : req.getMethod().equals("POST") && path.endsWith("/media") ? "upload" : "admin";
        var trace=timings.start(operation);
        boolean failed=false;
        try { chain.doFilter(req,res); }
        catch(IOException | ServletException | RuntimeException | Error e) { failed=true;throw e; }
        finally {
            timings.detach();
            if(req.isAsyncStarted()) {
                try {req.getAsyncContext().addListener(new AsyncListener() {
                    public void onComplete(AsyncEvent event){trace.finish(res.getStatus()>=400 ? "error":"ok");}
                    public void onError(AsyncEvent event){trace.finish("error");}
                    public void onTimeout(AsyncEvent event){trace.finish("error");}
                    public void onStartAsync(AsyncEvent event){event.getAsyncContext().addListener(this);}
                });} catch(IllegalStateException completed){trace.finish("ok");}
            } else trace.finish(failed || res.getStatus()>=400 ? "error":"ok");
        }
    }
}
