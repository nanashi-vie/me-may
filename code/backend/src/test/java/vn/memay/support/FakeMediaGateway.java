package vn.memay.support;
import vn.memay.media.MediaGateway;
import java.io.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import vn.memay.common.AdminApiException;
/** Test-only provider; no production fallback. */
public class FakeMediaGateway implements MediaGateway {
 public final Map<String,byte[]> assets=new ConcurrentHashMap<>();public final AtomicInteger uploads=new AtomicInteger();
 public volatile boolean failUpload,failDelete;public volatile CountDownLatch entered,release;
 public UploadedMedia upload(String id,byte[] bytes){uploads.incrementAndGet();if(entered!=null)entered.countDown();if(release!=null)try{if(!release.await(5,TimeUnit.SECONDS))throw new IllegalStateException("Test latch timeout");}catch(InterruptedException e){Thread.currentThread().interrupt();throw new IllegalStateException(e);}if(failUpload)throw new AdminApiException(502,"media_provider_error");assets.put(id,bytes);return new UploadedMedia(UUID.randomUUID().toString(),id,"png",bytes.length,3,2);}
 public InputStream openPreview(String id){var bytes=assets.get(id);if(bytes==null)throw new AdminApiException(502,"media_provider_error");return new ByteArrayInputStream(bytes);}
 public DeleteResult delete(String id){if(failDelete)throw new AdminApiException(502,"media_provider_error");return assets.remove(id)==null?DeleteResult.NOT_FOUND:DeleteResult.DELETED;}
 public void reset(){assets.clear();uploads.set(0);failUpload=false;failDelete=false;entered=null;release=null;}
}
