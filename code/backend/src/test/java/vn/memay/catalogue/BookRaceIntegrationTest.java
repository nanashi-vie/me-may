package vn.memay.catalogue;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import vn.memay.support.*;
import vn.memay.catalogue.BookDtos.*;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;
class BookRaceIntegrationTest extends CatalogueTestSupport {
 @Autowired BookStatusService statuses;
 private int race(Runnable a,Runnable b)throws Exception{
  var barrier=new CyclicBarrier(2);
  try(var pool=Executors.newFixedThreadPool(2)){
   var results=pool.invokeAll(List.<Callable<Boolean>>of(()->{barrier.await();try{a.run();return true;}catch(RuntimeException e){if(e instanceof org.springframework.orm.ObjectOptimisticLockingFailureException || e instanceof jakarta.persistence.OptimisticLockException || (e instanceof vn.memay.common.AdminApiException aex && (aex.status==403||aex.status==409)))return false;throw e;}},()->{barrier.await();try{b.run();return true;}catch(RuntimeException e){if(e instanceof org.springframework.orm.ObjectOptimisticLockingFailureException || e instanceof jakarta.persistence.OptimisticLockException || (e instanceof vn.memay.common.AdminApiException aex && (aex.status==403||aex.status==409)))return false;throw e;}}));
   int count=0;for(var r:results)if(r.get())count++;return count;
  }
 }
 @Test void twoVersionsHaveOneWinner()throws Exception{
  var b=commands.create(owner,BookFixtures.draft("Start"));long id=Long.parseLong(b.id());
  assertThat(race(()->commands.update(id,b.version(),owner,BookFixtures.draft("First")),()->commands.update(id,b.version(),owner,BookFixtures.draft("Second")))).isEqualTo(1);
  assertThat(jdbc.queryForObject("select count(*) from audit_event where target_id=?",Integer.class,id)).isEqualTo(2);
 }
 @Test void staffSaveRacingOwnerPublish()throws Exception{
  var b=ready();long id=Long.parseLong(b.id());
  assertThat(race(()->statuses.publication(id,b.version(),owner,Publication.PUBLISHED,true),()->commands.update(id,b.version(),staff,BookFixtures.write("Staff edit","PICTURE_BOOK","HARDCOVER",10000L,null,null,List.of("AGE_4_6"),List.of())))).isEqualTo(1);
  assertThat(jdbc.queryForObject("select count(*) from audit_event where target_id=?",Integer.class,id)).isEqualTo(2);
 }
}
