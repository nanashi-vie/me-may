package vn.memay.media;
import com.cloudinary.*;
import com.cloudinary.strategies.AbstractUploaderStrategy;
import java.io.*;
import java.net.URI;
import java.util.*;
import vn.memay.common.AdminApiException;
public class CloudinaryMediaGateway implements MediaGateway {
 static final String PREVIEW="a_auto/c_limit,w_1280/fl_strip_profile,f_jpg";
 private final Cloudinary cloud;private final Uploader uploader;private final CloudinaryTransport transport;private final String namespace;
 public CloudinaryMediaGateway(String cloudName,String apiKey,String apiSecret,String namespace,CloudinaryTransport transport){
  if(!cloudName.matches("[a-zA-Z0-9_-]+")||!namespace.matches("memay/(dev|test|online-test)"))throw new IllegalArgumentException("Invalid media configuration");
  this.namespace=namespace;this.transport=transport;this.cloud=new Cloudinary(Map.of("cloud_name",cloudName,"api_key",apiKey,"api_secret",apiSecret,"secure",true,"load_strategies",false));
  this.uploader=new Uploader(cloud,new AbstractUploaderStrategy(){
   public Map callApi(String action,Map<String,Object> params,Map options,Object file,ProgressCallback callback)throws IOException{
    uploader.signRequestParams(params,options);return transport.post(URI.create(buildUploadUrl(action,options)),params,(byte[])file);
   }
  });
 }
 static Map<String,Object> uploadOptions(String id){return Map.of("public_id",id,"resource_type","image","type","authenticated","overwrite",false,"unique_filename",false,"eager",List.of(new Transformation<>().rawTransformation(PREVIEW)));}
 static void validatePublicId(String id,String namespace){if(id==null||!id.matches(java.util.regex.Pattern.quote(namespace)+"/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"))throw new IllegalArgumentException("Invalid media key");}
 public UploadedMedia upload(String publicId,byte[] bytes){validatePublicId(publicId,namespace);try{
  Map result=uploader.upload(bytes,uploadOptions(publicId));if(!publicId.equals(result.get("public_id"))||!"authenticated".equals(result.get("type")))throw new IOException();
  return new UploadedMedia((String)result.get("asset_id"),publicId,(String)result.get("format"),((Number)result.get("bytes")).longValue(),((Number)result.get("width")).intValue(),((Number)result.get("height")).intValue());
 }catch(Exception e){throw failure();}}
 public InputStream openPreview(String publicId){validatePublicId(publicId,namespace);try{
  String url=cloud.url().secure(true).signed(true).resourceType("image").type("authenticated").transformation(new Transformation<>().rawTransformation(PREVIEW)).format("jpg").generate(publicId);return transport.open(URI.create(url));
 }catch(Exception e){throw failure();}}
 public DeleteResult delete(String publicId){validatePublicId(publicId,namespace);try{var result=uploader.destroy(publicId,Map.of("resource_type","image","type","authenticated","invalidate",true));return switch(String.valueOf(result.get("result"))){case "ok"->DeleteResult.DELETED;case "not found"->DeleteResult.NOT_FOUND;default->throw new IOException();};}catch(Exception e){throw failure();}}
 private AdminApiException failure(){return new AdminApiException(502,"media_provider_error");}
}
