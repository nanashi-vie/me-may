package vn.memay.order;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import vn.memay.catalogue.*;
import vn.memay.common.AdminApiException;
import vn.memay.support.OrderTestSupport;
import java.time.Instant;
import java.sql.Timestamp;
import java.util.List;
import static org.assertj.core.api.Assertions.*;
class OrderPurgeTest extends OrderTestSupport {
 @Autowired BookTrashService trash;
 private long reference(long id){long order=draft();long listing=jdbc.queryForObject("select id from listing where book_copy_id=?",Long.class,id);
  jdbc.update("insert into order_items(order_id,source_type,book_copy_id,listing_id,title_snapshot,unit_price_vnd,quantity,unit_weight_grams,created_by) values(?,'CATALOG',?,?,'Synthetic item',10000,1,250,?)",order,id,listing,owner.getId());return order;
 }
 @Test void activeReservationBlocksTrash(){
  var b=ready();long id=Long.parseLong(b.id()),order=reference(id);
  jdbc.update("insert into order_reservation(order_id,book_copy_id,quantity,state) values(?,?,1,'ACTIVE')",order,id);
  assertThatThrownBy(()->trash.change(owner,id,b.version(),true)).isInstanceOfSatisfying(AdminApiException.class,e->assertThat(e.error).isEqualTo("book_reserved"));
  assertThat(jdbc.queryForObject("select deleted_at is null from book_copy where id=?",Boolean.class,id)).isTrue();
 }
 @Test void referencedBookPurgeDoesNotBlockOtherExpiredBooks(){
  var kept=ready();var free=ready();long id=Long.parseLong(kept.id());reference(id);
  jdbc.update("update book_copy set deleted_at=?",Timestamp.from(Instant.now().minusSeconds(9*86400)));
  trash.purgeExpired(Instant.now());
  assertThat(jdbc.queryForList("select id::text from book_copy",String.class)).containsExactly(kept.id());
  assertThat(jdbc.queryForObject("select count(*) from order_items",Integer.class)).isEqualTo(1);
  assertThatThrownBy(()->trash.bulk(owner,List.of(new vn.memay.common.VersionedItem(kept.id(),kept.version())),true)).isInstanceOfSatisfying(AdminApiException.class,e->assertThat(e.error).isEqualTo("book_order_reference"));
 }
}
