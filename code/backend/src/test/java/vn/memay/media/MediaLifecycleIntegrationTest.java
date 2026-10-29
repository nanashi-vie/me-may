package vn.memay.media;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import vn.memay.catalogue.*;
import vn.memay.common.AdminApiException;
import vn.memay.support.BookFixtures;
import java.util.concurrent.*;
import static vn.memay.media.MediaDtos.*;
import static org.assertj.core.api.Assertions.*;
class MediaLifecycleIntegrationTest extends MediaTestSupport {
 @Autowired BookStatusService status;
 @Test void failedReplacementKeepsOldImage()throws Exception{
  var b=seed(owner,BookFixtures.draft("A"));var first=media.upload(Long.parseLong(b.id()),MediaRole.FRONT,b.version(),owner,ImageValidatorTest.image("png"),null,null);String old=first.media().getFirst().id();
  fake.failUpload=true;assertThatThrownBy(()->media.upload(Long.parseLong(b.id()),MediaRole.FRONT,first.version(),owner,ImageValidatorTest.image("png"),null,null)).isInstanceOf(AdminApiException.class);
  assertThat(jdbc.queryForObject("select id::text from book_media where state='ACTIVE'",String.class)).isEqualTo(old);assertThat(jdbc.queryForObject("select version from book_copy where id=?",Long.class,Long.parseLong(b.id()))).isEqualTo(first.version());assertThat(jdbc.queryForObject("select count(*) from book_media where state='UPLOADING'",Integer.class)).isEqualTo(1);
 }
 @Test void dbFailureAfterUploadLeavesRecoverableIntent()throws Exception{
  var b=seed(owner,BookFixtures.draft("A"));jdbc.execute("alter table audit_event add constraint reject_media_test check(action <> 'MEDIA_ATTACHED')");
  try{assertThatThrownBy(()->media.upload(Long.parseLong(b.id()),MediaRole.FRONT,b.version(),owner,ImageValidatorTest.image("png"),null,null)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);}finally{jdbc.execute("alter table audit_event drop constraint reject_media_test");}
  assertThat(fake.assets).hasSize(1);assertThat(jdbc.queryForObject("select count(*) from book_media where state in ('UPLOADING','DELETE_PENDING')",Integer.class)).isEqualTo(1);assertThat(jdbc.queryForObject("select count(*) from book_media where state='ACTIVE'",Integer.class)).isZero();cleanup.runOnce();assertThat(fake.assets).isEmpty();
 }
 @Test void uploadFinishesAfterPublishReturns409()throws Exception{
  var b=ready();fake.entered=new CountDownLatch(1);fake.release=new CountDownLatch(1);
  try(var pool=Executors.newSingleThreadExecutor()){
   var upload=pool.submit(()->media.upload(Long.parseLong(b.id()),MediaRole.FRONT,b.version(),owner,ImageValidatorTest.image("png"),null,null));assertThat(fake.entered.await(3,TimeUnit.SECONDS)).isTrue();status.publication(Long.parseLong(b.id()),b.version(),owner,BookDtos.Publication.PUBLISHED,true);fake.release.countDown();
   assertThatThrownBy(()->upload.get(4,TimeUnit.SECONDS)).hasCauseInstanceOf(AdminApiException.class);
  }finally{fake.release.countDown();}
  assertThat(jdbc.queryForObject("select count(*) from book_media where state='ACTIVE'",Integer.class)).isEqualTo(3);
 }
 @Test void twoUploadsSameSlotOnlyOneActive()throws Exception{
  var b=seed(owner,BookFixtures.draft("A"));fake.entered=new CountDownLatch(2);fake.release=new CountDownLatch(1);
  try(var pool=Executors.newFixedThreadPool(2)){
   Callable<Boolean> work=()->{try{media.upload(Long.parseLong(b.id()),MediaRole.FRONT,b.version(),owner,ImageValidatorTest.image("png"),null,null);return true;}catch(AdminApiException|jakarta.persistence.OptimisticLockException|org.springframework.orm.ObjectOptimisticLockingFailureException e){return false;}};
   var a=pool.submit(work);var c=pool.submit(work);assertThat(fake.entered.await(3,TimeUnit.SECONDS)).isTrue();fake.release.countDown();assertThat(java.util.List.of(a.get(4,TimeUnit.SECONDS),c.get(4,TimeUnit.SECONDS))).containsExactlyInAnyOrder(true,false);
  }finally{fake.release.countDown();}
  assertThat(jdbc.queryForObject("select count(*) from book_media where state='ACTIVE'",Integer.class)).isEqualTo(1);assertThat(jdbc.queryForObject("select count(*) from audit_event",Integer.class)).isEqualTo(2);
 }
 @Test void deactivatedActorCannotAttachAfterProviderReturns()throws Exception{
  var b=seed(owner,BookFixtures.draft("A"));fake.entered=new CountDownLatch(1);fake.release=new CountDownLatch(1);
  try(var pool=Executors.newSingleThreadExecutor()){
   var upload=pool.submit(()->media.upload(Long.parseLong(b.id()),MediaRole.FRONT,b.version(),owner,ImageValidatorTest.image("png"),null,null));assertThat(fake.entered.await(3,TimeUnit.SECONDS)).isTrue();jdbc.update("update admin_user set active=false where id=?",owner.getId());fake.release.countDown();
   assertThatThrownBy(()->upload.get(4,TimeUnit.SECONDS)).hasCauseInstanceOf(AdminApiException.class);
  }finally{fake.release.countDown();}
  assertThat(jdbc.queryForObject("select count(*) from book_media where state='ACTIVE'",Integer.class)).isZero();
 }
 @Test void ambiguousProviderTimeoutWaitsForRecoveryGrace()throws Exception{
  var b=seed(owner,BookFixtures.draft("A"));fake.failUpload=true;assertThatThrownBy(()->media.upload(Long.parseLong(b.id()),MediaRole.FRONT,b.version(),owner,ImageValidatorTest.image("png"),null,null)).isInstanceOf(AdminApiException.class);
  String key=jdbc.queryForObject("select storage_public_id from book_media where book_copy_id=?",String.class,Long.parseLong(b.id()));assertThat(jdbc.queryForObject("select state from book_media where book_copy_id=?",String.class,Long.parseLong(b.id()))).isEqualTo("UPLOADING");cleanup.runOnce();fake.assets.put(key,new byte[]{1});assertThat(jdbc.queryForObject("select count(*) from book_media",Integer.class)).isEqualTo(1);jdbc.update("update book_media set updated_at=current_timestamp-interval '2 hours'");cleanup.runOnce();assertThat(fake.assets).isEmpty();
 }
 @Test void mediaAuditUsesContractActions()throws Exception{
  var b=seed(owner,BookFixtures.draft("A"));long id=Long.parseLong(b.id());b=media.upload(id,MediaRole.FRONT,b.version(),owner,ImageValidatorTest.image("png"),null,null);b=media.upload(id,MediaRole.FRONT,b.version(),owner,ImageValidatorTest.image("png"),null,null);b=media.updateMetadata(id,MediaRole.FRONT,b.version(),owner,"New alt",null);media.remove(id,MediaRole.FRONT,b.version(),owner);
  assertThat(jdbc.queryForList("select action from audit_event where target_type='BOOK' and target_id=? order by id",String.class,id)).containsExactly("CREATE","MEDIA_ATTACHED","MEDIA_REPLACED","MEDIA_UPDATED","MEDIA_REMOVED");
 }
}
