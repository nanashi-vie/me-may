package vn.memay.media;
import org.springframework.stereotype.Component;
import vn.memay.common.AdminApiException;
import javax.imageio.ImageIO;
import javax.imageio.stream.MemoryCacheImageInputStream;
import java.io.*;
import java.util.Locale;
@Component
public class ImageValidator {
 public static final int MAX_BYTES=10*1024*1024;
 public record ImageInfo(String format,int width,int height){}
 public static void checkDimensions(int width,int height){if(width<=0||height<=0)throw new AdminApiException(415,"invalid_image");if((long)width*height>25000000L)throw new AdminApiException(413,"image_too_large");}
 public ImageInfo validate(byte[] bytes){
  if(bytes==null||bytes.length==0)throw new AdminApiException(415,"invalid_image");if(bytes.length>MAX_BYTES)throw new AdminApiException(413,"image_too_large");
  try(var input=new MemoryCacheImageInputStream(new ByteArrayInputStream(bytes))){
   var readers=ImageIO.getImageReaders(input);if(!readers.hasNext())throw new AdminApiException(415,"unsupported_image");var reader=readers.next();
   try{reader.setInput(input,true,true);String format=reader.getFormatName().toLowerCase(Locale.ROOT);if(!format.equals("jpeg")&&!format.equals("png"))throw new AdminApiException(415,"unsupported_image");int width=reader.getWidth(0),height=reader.getHeight(0);checkDimensions(width,height);
    if(format.equals("jpeg")&&(bytes.length<2||bytes[bytes.length-2]!=(byte)255||bytes[bytes.length-1]!=(byte)217))throw new AdminApiException(415,"invalid_image");
    var decoded=reader.read(0);if(decoded==null||decoded.getWidth()!=width||decoded.getHeight()!=height)throw new AdminApiException(415,"invalid_image");decoded.flush();return new ImageInfo(format,width,height);
   }finally{reader.dispose();}
  }catch(IOException|IllegalArgumentException e){throw new AdminApiException(415,"invalid_image");}
 }
}
