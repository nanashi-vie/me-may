package vn.memay.order;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import vn.memay.catalogue.*;
import vn.memay.support.*;
import vn.memay.common.AdminApiException;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;
class OrderStockConcurrencyTest extends OrderTestSupport {
 @Autowired BookStockService stock;
 @Test void stockOneHasOneWinner()throws Exception{
  long id=Long.parseLong(ready().id());var barrier=new CyclicBarrier(2);
  try(var pool=Executors.newFixedThreadPool(2)){
   Callable<Object> c=()->{barrier.await();try{return stock.adjust(id,-1,owner);}catch(AdminApiException e){return e;}};
   var results=pool.invokeAll(List.of(c,c));var values=List.of(results.get(0).get(),results.get(1).get());
   assertThat(values.stream().filter(Long.class::isInstance).count()).isEqualTo(1);
   assertThat(queries.detail(id,owner).totalStock()).isZero();assertThat(queries.detail(id,owner).availability()).isEqualTo(BookDtos.Availability.SOLD);
   assertThat(((AdminApiException)values.stream().filter(AdminApiException.class::isInstance).findFirst().orElseThrow()).error).isEqualTo("stock_conflict");
  }
 }
 @Test void staleEditorCannotResurrectStock(){
  var b=ready();long id=Long.parseLong(b.id());stock.adjust(id,-1,owner);
  assertThatThrownBy(()->update(id,b.version(),owner,BookFixtures.write("Changed","PICTURE_BOOK","HARDCOVER",10000L,null,null,List.of("AGE_4_6"),List.of())))
   .isInstanceOfSatisfying(AdminApiException.class,e->assertThat(e.status).isEqualTo(409));
  assertThat(queries.detail(id,owner).totalStock()).isZero();
 }
 @Test void returnOverflowRollsBackAndMetadataPreservesRows(){
  var b=ready();long id=Long.parseLong(b.id());
  assertThatThrownBy(()->stock.adjust(id,999999,owner)).isInstanceOf(AdminApiException.class);
  assertThat(queries.detail(id,owner).totalStock()).isEqualTo(1);assertThat(queries.detail(id,owner).version()).isEqualTo(b.version());
  jdbc.update("update book_variant set name='A',stock=2 where book_copy_id=?",id);
  jdbc.update("insert into book_variant(book_copy_id,name,stock,sort_order) values(?,'B',3,1)",id);
  var before=queries.detail(id,owner).variants();stock.adjust(id,-1,owner);var fresh=queries.detail(id,owner);
  update(id,fresh.version(),owner,BookFixtures.write("Metadata only","PICTURE_BOOK","HARDCOVER",10000L,null,null,List.of("AGE_4_6"),List.of()));
  var after=queries.detail(id,owner).variants();assertThat(after).extracting(BookDtos.VariantView::id).containsExactlyElementsOf(before.stream().map(BookDtos.VariantView::id).toList());
  assertThat(after).extracting(BookDtos.VariantView::name).containsExactly("A","B");assertThat(after).extracting(BookDtos.VariantView::stock).containsExactly(2L,2L);
 }
}
