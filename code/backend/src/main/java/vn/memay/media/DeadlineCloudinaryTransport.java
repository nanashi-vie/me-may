package vn.memay.media;
import org.apache.hc.client5.http.classic.methods.*;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.entity.mime.MultipartEntityBuilder;
import org.apache.hc.client5.http.impl.classic.*;
import org.apache.hc.core5.http.ContentType;
import org.apache.hc.core5.util.Timeout;
import tools.jackson.databind.ObjectMapper;
import java.io.*;
import java.net.URI;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
public class DeadlineCloudinaryTransport implements CloudinaryTransport,AutoCloseable {
 private final CloseableHttpClient client=HttpClients.custom().disableRedirectHandling().setDefaultRequestConfig(RequestConfig.custom().setConnectTimeout(Timeout.ofSeconds(5)).setConnectionRequestTimeout(Timeout.ofSeconds(5)).setResponseTimeout(Timeout.ofSeconds(20)).build()).build();
 private final ScheduledExecutorService timer=Executors.newSingleThreadScheduledExecutor(r->{var t=new Thread(r,"media-io-deadline");t.setDaemon(true);return t;});
 private final ObjectMapper json;private final Duration deadline;
 public DeadlineCloudinaryTransport(ObjectMapper json){this(json,Duration.ofSeconds(60));}
 DeadlineCloudinaryTransport(ObjectMapper json,Duration deadline){this.json=json;this.deadline=deadline;}
 static void host(URI uri,String expected){if(!"https".equals(uri.getScheme())||!expected.equals(uri.getHost())||uri.getPort()!=-1||uri.getUserInfo()!=null)throw new IllegalArgumentException("Invalid media endpoint");}
 private ScheduledFuture<?> abortAtDeadline(HttpUriRequestBase request){return timer.schedule(()->request.cancel(),deadline.toMillis(),TimeUnit.MILLISECONDS);}
 <T>T bounded(HttpUriRequestBase request,Callable<T> action)throws Exception{var abort=abortAtDeadline(request);try{return action.call();}finally{abort.cancel(false);}}
 public Map<String,Object> post(URI uri,Map<String,Object> params,byte[] bytes)throws IOException{
  host(uri,"api.cloudinary.com");var request=new HttpPost(uri);var multipart=MultipartEntityBuilder.create();params.forEach((k,v)->{if(v!=null)multipart.addTextBody(k,v.toString(),ContentType.TEXT_PLAIN.withCharset(java.nio.charset.StandardCharsets.UTF_8));});if(bytes!=null)multipart.addBinaryBody("file",bytes,ContentType.APPLICATION_OCTET_STREAM,"image");request.setEntity(multipart.build());
  try{return bounded(request,()->client.execute(request,response->{if(response.getCode()!=200)throw new IOException("Provider error");try(var input=response.getEntity().getContent()){byte[] body=input.readNBytes(1024*1024+1);if(body.length>1024*1024)throw new IOException("Provider response too large");return json.readValue(body,Map.class);}}));}catch(Exception e){throw new IOException("Media request failed");}
 }
 public InputStream open(URI uri)throws IOException{
  host(uri,"res.cloudinary.com");var request=new HttpGet(uri);var abort=abortAtDeadline(request);
  try{var response=client.executeOpen(null,request,null);if(response.getCode()!=200){int status=response.getCode();response.close();if(status==404)throw new CloudinaryTransport.MissingVariantException();throw new IOException("Provider error");}return new FilterInputStream(response.getEntity().getContent()){
   private long received;
   private void count(int n)throws IOException{if(n>0&&(received+=n)>ImageValidator.MAX_BYTES){close();throw new IOException("Preview too large");}}
   public int read()throws IOException{int value=super.read();count(value<0?0:1);return value;}
   public int read(byte[] b,int off,int len)throws IOException{int n=super.read(b,off,len);count(n);return n;}
   public void close()throws IOException{try{super.close();}finally{abort.cancel(false);response.close();}}
  };}catch(CloudinaryTransport.MissingVariantException e){abort.cancel(false);request.cancel();throw e;}catch(Exception e){abort.cancel(false);request.cancel();throw new IOException("Media preview failed");}
 }
 public void close()throws IOException{timer.shutdownNow();client.close();}
}
