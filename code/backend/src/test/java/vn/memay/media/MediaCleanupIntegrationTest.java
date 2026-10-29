package vn.memay.media;
import org.junit.jupiter.api.Test;
import vn.memay.support.BookFixtures;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
class MediaCleanupIntegrationTest extends MediaTestSupport {
 UUID intent(String book,String state,boolean stale){UUID id=UUID.randomUUID();jdbc.update("insert into book_media(id,book_copy_id,role,state,storage_public_id,updated_at) values (?,?,'FRONT',?,?,current_timestamp - cast(? as interval))",id,Long.parseLong(book),state,"memay/test/"+id,stale?"2 hours":"0 seconds");return id;}
 @Test void restartRecoversStaleUploadingAndNotFoundIsSuccess(){var b=seed(owner,BookFixtures.draft("A"));var stale=intent(b.id(),"UPLOADING",true);var fresh=intent(b.id(),"UPLOADING",false);cleanup.runOnce();assertThat(jdbc.queryForList("select id from book_media",UUID.class)).containsExactly(fresh);}
 @Test void retryDoesNotDeleteWinner(){var b=seed(owner,BookFixtures.draft("A"));var loser=intent(b.id(),"DELETE_PENDING",true);var winner=intent(b.id(),"ACTIVE",true);fake.assets.put("memay/test/"+winner,new byte[]{1});fake.failDelete=true;cleanup.runOnce();assertThat(jdbc.queryForObject("select count(*) from book_media",Integer.class)).isEqualTo(2);fake.failDelete=false;cleanup.runOnce();assertThat(jdbc.queryForList("select id from book_media",UUID.class)).containsExactly(winner);assertThat(fake.assets).containsKey("memay/test/"+winner);}
 @Test void cleanupBatchIsBounded(){var b=seed(owner,BookFixtures.draft("A"));for(int i=0;i<105;i++)intent(b.id(),"DELETE_PENDING",true);cleanup.runOnce();assertThat(jdbc.queryForObject("select count(*) from book_media",Integer.class)).isEqualTo(5);}
 @org.springframework.beans.factory.annotation.Autowired MediaTransactions transactions;
 @Test void cleanupClaimCannotRaceAttach()throws Exception{
  var b=seed(owner,BookFixtures.draft("A"));var intent=transactions.begin(Long.parseLong(b.id()),MediaDtos.MediaRole.FRONT,b.version(),owner,null,null,"memay/test");var uploaded=fake.upload(intent.publicId(),ImageValidatorTest.image("png"));jdbc.update("update book_media set updated_at=current_timestamp-interval '2 hours' where id=?",intent.id());
  fake.deleteEntered=new java.util.concurrent.CountDownLatch(1);fake.deleteRelease=new java.util.concurrent.CountDownLatch(1);
  try(var pool=java.util.concurrent.Executors.newSingleThreadExecutor()){
   var job=pool.submit(cleanup::runOnce);assertThat(fake.deleteEntered.await(3,java.util.concurrent.TimeUnit.SECONDS)).isTrue();
   assertThatThrownBy(()->transactions.attach(intent,Long.parseLong(b.id()),b.version(),owner,uploaded)).isInstanceOf(vn.memay.common.AdminApiException.class);fake.deleteRelease.countDown();job.get(4,java.util.concurrent.TimeUnit.SECONDS);
  }finally{fake.deleteRelease.countDown();}
  assertThat(jdbc.queryForObject("select version from book_copy where id=?",Long.class,Long.parseLong(b.id()))).isEqualTo(b.version());assertThat(fake.assets).isEmpty();
 }
}
