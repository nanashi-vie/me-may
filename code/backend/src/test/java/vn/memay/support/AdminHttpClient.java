package vn.memay.support;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import tools.jackson.databind.*;
import tools.jackson.databind.json.JsonMapper;
public final class AdminHttpClient {
 public static final ObjectMapper JSON=JsonMapper.builder().build();
 private final int port;private final HttpClient client=HttpClient.newBuilder().cookieHandler(new CookieManager(null,CookiePolicy.ACCEPT_ALL)).build();
 public AdminHttpClient(int port){this.port=port;}
 public static String json(Object value){return JSON.writeValueAsString(value);}
 public static JsonNode tree(HttpResponse<String> response){return JSON.readTree(response.body());}
 public void login(String email)throws Exception{
  String token=tree(send("GET","/api/v1/auth/csrf",null,false)).path("token").asString();
  var req=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/v1/auth/login")).header("Content-Type","application/x-www-form-urlencoded").header("X-CSRF-TOKEN",token).POST(HttpRequest.BodyPublishers.ofString("username="+URLEncoder.encode(email,StandardCharsets.UTF_8)+"&password=test-password-123")).build();
  if(client.send(req,HttpResponse.BodyHandlers.ofString()).statusCode()!=200)throw new IllegalStateException("Test login failed");
 }
 public HttpResponse<String> send(String method,String path,String body,boolean csrf)throws Exception{
  var b=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+path));
  if(csrf)b.header("X-CSRF-TOKEN",tree(send("GET","/api/v1/auth/csrf",null,false)).path("token").asString());
  if(body!=null)b.header("Content-Type","application/json");
  return client.send(b.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(body)).build(),HttpResponse.BodyHandlers.ofString());
 }
 public HttpResponse<String> upload(String path,long version,byte[] file,boolean csrf)throws Exception{
  String boundary="test"+java.util.UUID.randomUUID();var bytes=new java.io.ByteArrayOutputStream();
  bytes.write(("--"+boundary+"\r\nContent-Disposition: form-data; name=\"version\"\r\n\r\n"+version+"\r\n--"+boundary+"\r\nContent-Disposition: form-data; name=\"file\"; filename=\"cover.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n").getBytes(StandardCharsets.UTF_8));bytes.write(file);bytes.write(("\r\n--"+boundary+"--\r\n").getBytes(StandardCharsets.UTF_8));
  var b=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+path)).header("Content-Type","multipart/form-data; boundary="+boundary);
  if(csrf)b.header("X-CSRF-TOKEN",tree(send("GET","/api/v1/auth/csrf",null,false)).path("token").asString());
  return client.send(b.POST(HttpRequest.BodyPublishers.ofByteArray(bytes.toByteArray())).build(),HttpResponse.BodyHandlers.ofString());
 }
}
