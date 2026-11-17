package vn.memay.order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.*;
import vn.memay.catalogue.BookStockService;
import vn.memay.auth.AdminUser;
import vn.memay.common.AdminApiException;
import java.util.*;
import static vn.memay.order.OrderDtos.*;
@Component
@Transactional(propagation=Propagation.MANDATORY)
public class OrderInventory {
 private final OrderRepository db;private final BookStockService stock;
 public OrderInventory(OrderRepository db,BookStockService stock){this.db=db;this.stock=stock;}
 public Map<Long,Long> desired(long id){var result=new TreeMap<Long,Long>();for(var i:db.items(id))if(i.bookCopyId()!=null)result.merge(Long.parseLong(i.bookCopyId()),i.quantity(),Math::addExact);return result;}
 public void checkDraft(long id){var amounts=desired(id);stock.lockAll(new ArrayList<>(amounts.keySet()));
  for(var a:amounts.entrySet()){
   if(Boolean.TRUE.equals(db.jdbc.queryForObject("select deleted_at is not null from book_copy where id=?",Boolean.class,a.getKey())))throw new AdminApiException(409,"book_trashed");
   long available=db.jdbc.queryForObject("select coalesce(sum(stock),0) from book_variant where book_copy_id=?",Long.class,a.getKey());
   if(a.getValue()>available)throw new AdminApiException(409,"stock_conflict");
  }
 }
 public void sync(long id,AdminUser actor){
  var amounts=desired(id);var current=db.jdbc.queryForList("select * from order_reservation where order_id=? order by book_copy_id",id);var all=new TreeSet<>(amounts.keySet());
  for(var row:current){if("CONSUMED".equals(row.get("state")))throw new AdminApiException(409,"transition_conflict");all.add(((Number)row.get("book_copy_id")).longValue());}
  stock.lockAll(new ArrayList<>(all));
  for(long book:all){var row=current.stream().filter(r->((Number)r.get("book_copy_id")).longValue()==book).findFirst().orElse(null);
   long held=row!=null&&"ACTIVE".equals(row.get("state"))?((Number)row.get("quantity")).longValue():0,desired=amounts.getOrDefault(book,0L);
   if(desired!=held)stock.adjust(book,held-desired,actor);
   if(row!=null||desired>0)db.jdbc.update("insert into order_reservation(order_id,book_copy_id,quantity,state) values(?,?,?,?) on conflict(order_id,book_copy_id) do update set quantity=excluded.quantity,state=excluded.state,updated_at=current_timestamp",id,book,desired,desired>0?"ACTIVE":"RELEASED");
  }
 }
 public void release(long id,AdminUser actor){var rows=db.jdbc.queryForList("select * from order_reservation where order_id=? and state='ACTIVE' order by book_copy_id",id);stock.lockAll(rows.stream().map(r->((Number)r.get("book_copy_id")).longValue()).toList());
  for(var r:rows)stock.adjust(((Number)r.get("book_copy_id")).longValue(),((Number)r.get("quantity")).longValue(),actor);
  db.jdbc.update("update order_reservation set state='RELEASED',updated_at=current_timestamp where order_id=? and state='ACTIVE'",id);
 }
 public void verify(long id,String state){var amounts=desired(id);var rows=db.jdbc.queryForList("select book_copy_id,quantity,state,returned_quantity from order_reservation where order_id=?",id);var actual=new TreeMap<Long,Long>();
  for(var row:rows)if(state.equals(row.get("state"))){if(((Number)row.get("returned_quantity")).longValue()!=0)throw new AdminApiException(409,"reservation_conflict");actual.put(((Number)row.get("book_copy_id")).longValue(),((Number)row.get("quantity")).longValue());}
  if(!actual.equals(amounts))throw new AdminApiException(409,"reservation_conflict");
 }
}
