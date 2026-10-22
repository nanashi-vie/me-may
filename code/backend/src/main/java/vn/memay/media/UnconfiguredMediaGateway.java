package vn.memay.media;
import java.io.InputStream;
import vn.memay.common.AdminApiException;
public class UnconfiguredMediaGateway implements MediaGateway {
 private AdminApiException missing(){return new AdminApiException(503,"media_unconfigured");}
 public UploadedMedia upload(String publicId,byte[] bytes){throw missing();}
 public InputStream openPreview(String publicId){throw missing();}
 public DeleteResult delete(String publicId){throw missing();}
}
