package vn.memay.catalogue;
import org.junit.jupiter.api.Test;
import java.util.*;
import java.security.MessageDigest;
import static org.assertj.core.api.Assertions.*;
import static vn.memay.support.AdminHttpClient.JSON;
class BookLegacyFingerprintTest {
 @Test void legacyCreateAndImportSerializationRemainByteCompatible() throws Exception {
  var w=new BookDtos.BookWrite("Golden",null,null,null,null,null,null,"private",10000L,10000L,250L,null,"BOARD_BOOK",List.of(),null,null,List.of(),List.of(new BookDtos.VariantWrite(null,null,1L)));
  var c=new BookDtos.BookCreate(w,UUID.fromString("00000000-0000-0000-0000-000000000001"),List.of(),true);
  assertThat(HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(JSON.writeValueAsBytes(c)))).isEqualTo("a23cae9b1c50b347f91b5bd2c1306aeedd18f6a18259f434a41fd8ac9d3d9039");
  var groups=List.of(new BookImportDtos.ImportGroup("A",w,List.of(),List.of(2)));
  assertThat(BookImportFingerprint.digest(groups,1)).isEqualTo("af84244c4d534eebc1d3d87fb34ca1e424d6f14f47595da9dfca04d792812adb");
  assertThat(BookImportFingerprint.digest(groups,2)).isEqualTo("b4d4a4969765ca17059bcd9fba668d497129e9185ae103587d11da2d6820949e");
 }
}
