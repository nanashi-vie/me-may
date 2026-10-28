package vn.memay.media;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import vn.memay.support.AdminHttpClient;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
class PublicMediaApiTest extends MediaTestSupport {
 @Value("${local.server.port}") int port;
 @Test void publicMediaRequiresPublishedAndActiveAtEveryRequest()throws Exception{
  var b=ready();var client=new AdminHttpClient(port);String path="/api/v1/books/"+b.slug()+"/media/FRONT";
  assertThat(client.download(path).statusCode()).isEqualTo(404);
  String key=jdbc.queryForObject("select storage_public_id from book_media where book_copy_id=? and role='FRONT'",String.class,Long.parseLong(b.id()));byte[] bytes=ImageValidatorTest.image("jpeg");fake.assets.put(key,bytes);
  jdbc.update("update listing set publication_status='PUBLISHED' where book_copy_id=?",Long.parseLong(b.id()));var publicImage=client.download(path);assertThat(publicImage.statusCode()).isEqualTo(200);assertThat(publicImage.body()).isEqualTo(bytes);assertThat(fake.publicOpens.get()).isEqualTo(1);assertThat(publicImage.headers().firstValue("location")).isEmpty();assertThat(publicImage.headers().firstValue("cache-control").orElse("")).contains("no-store");
  jdbc.update("update book_media set state='DELETE_PENDING' where book_copy_id=? and role='FRONT'",Long.parseLong(b.id()));assertThat(client.download(path).statusCode()).isEqualTo(404);
  jdbc.update("update book_media set state='ACTIVE' where book_copy_id=? and role='FRONT'",Long.parseLong(b.id()));jdbc.update("update listing set publication_status='ARCHIVED' where book_copy_id=?",Long.parseLong(b.id()));assertThat(client.download(path).statusCode()).isEqualTo(404);
 }
}
