package vn.memay.media;
import org.junit.jupiter.api.Test;
import vn.memay.common.AdminApiException;
import java.awt.image.BufferedImage;
import java.io.*;
import javax.imageio.ImageIO;
import static org.assertj.core.api.Assertions.*;
class ImageValidatorTest {
 final ImageValidator validator=new ImageValidator();
 static byte[] image(String format)throws Exception{var out=new ByteArrayOutputStream();ImageIO.write(new BufferedImage(3,2,BufferedImage.TYPE_INT_RGB),format,out);return out.toByteArray();}
 @Test void acceptsRealJpegAndPng()throws Exception{for(var f:new String[]{"jpeg","png"}){var info=validator.validate(image(f));assertThat(info.width()).isEqualTo(3);assertThat(info.height()).isEqualTo(2);}}
 @Test void rejectsSpoofedAndTruncatedImages()throws Exception{
  for(var bytes:new byte[][]{"<svg/>".getBytes(),"%PDF".getBytes(),"RIFF0000WEBP".getBytes(),"0000ftypheic".getBytes(),new byte[]{(byte)255,(byte)216,(byte)255},java.util.Arrays.copyOf(image("png"),30)})assertThatThrownBy(()->validator.validate(bytes)).isInstanceOf(AdminApiException.class);
 }
 @Test void rejectsOversizeBytes(){assertThatThrownBy(()->validator.validate(new byte[10*1024*1024+1])).isInstanceOfSatisfying(AdminApiException.class,e->assertThat(e.status).isEqualTo(413));}
 @Test void hugeHeaderFailsBeforeDecode()throws Exception{
  byte[] png=image("png");java.nio.ByteBuffer.wrap(png).putInt(16,100000).putInt(20,100000);var crc=new java.util.zip.CRC32();crc.update(png,12,17);java.nio.ByteBuffer.wrap(png).putInt(29,(int)crc.getValue());
  assertThatThrownBy(()->validator.validate(png)).isInstanceOfSatisfying(AdminApiException.class,e->assertThat(e.status).isEqualTo(413));
 }
 @Test void pixelBoundaryIsInclusive(){assertThatCode(()->ImageValidator.checkDimensions(5000,5000)).doesNotThrowAnyException();assertThatThrownBy(()->ImageValidator.checkDimensions(5001,5000)).isInstanceOf(AdminApiException.class);}
}
