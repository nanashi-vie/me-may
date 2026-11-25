package vn.memay.catalogue;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import vn.memay.auth.AdminUser;
import vn.memay.audit.AuditService;
import vn.memay.common.AdminApiException;
import java.time.Clock;
import java.sql.Timestamp;
import java.util.*;
@Service
public class BookStockService {
 private final JdbcTemplate jdbc;private final BookVariantStore variants;private final AuditService audit;private final Clock clock;
 public BookStockService(JdbcTemplate jdbc,BookVariantStore variants,AuditService audit,Clock clock){this.jdbc=jdbc;this.variants=variants;this.audit=audit;this.clock=clock;}
 @Transactional(propagation=org.springframework.transaction.annotation.Propagation.MANDATORY)
 public void lockAll(List<Long> ids){for(long id:new TreeSet<>(ids)){if(jdbc.queryForList("select id from book_copy where id=? for update",Long.class,id).isEmpty())throw new AdminApiException(404,"not_found");}}
 @Transactional
 public long adjust(long id,long delta,AdminUser actor){
  requireActiveOwner(actor);
  lockAll(List.of(id));var book=jdbc.queryForMap("select version,availability,deleted_at from book_copy where id=?",id);
  if(delta<0&&book.get("deleted_at")!=null)throw new AdminApiException(409,"book_trashed");
  long current=variants.read(id).stream().mapToLong(BookDtos.VariantView::stock).sum();
  long next;try{next=Math.addExact(current,delta);}catch(ArithmeticException e){throw new AdminApiException(409,"stock_capacity_conflict");}
  if(next<0)throw new AdminApiException(409,"stock_conflict");if(next>variants.stockLimit(id))throw new AdminApiException(409,"stock_capacity_conflict");if(delta==0)return current;
  write(id,current,next,book,actor,"ORDER_STOCK");
  return next;
 }
 /** Zeroes sellable stock all-or-nothing; copies already kept in orders stay reserved. */
 @Transactional
 public List<SoldOut> soldOut(List<BookTrashService.Selection> items,AdminUser actor){
  requireActiveOwner(actor);var ordered=BookTrashService.ordered(items,true);lockAll(List.copyOf(ordered.keySet()));
  var result=new ArrayList<SoldOut>();
  for(var item:ordered.entrySet()){
   long id=item.getKey();var book=jdbc.queryForMap("select version,availability,deleted_at,updated_at from book_copy where id=?",id);
   long version=((Number)book.get("version")).longValue();
   if(version!=item.getValue())throw AdminApiException.conflict(version);
   if(book.get("deleted_at")!=null)throw new AdminApiException(409,"book_trashed");
   long current=variants.read(id).stream().mapToLong(BookDtos.VariantView::stock).sum();
   if(current==0)result.add(new SoldOut(Long.toString(id),version,0,BookDtos.Availability.valueOf(book.get("availability").toString()),((Timestamp)book.get("updated_at")).toInstant()));
   else result.add(new SoldOut(Long.toString(id),version+1,0,BookDtos.Availability.SOLD,write(id,current,0,book,actor,"SOLD_OUT")));
  }
  return result;
 }
 public record SoldOut(String id,long version,long totalStock,BookDtos.Availability availability,java.time.Instant updatedAt){}
 private void requireActiveOwner(AdminUser actor){
  if(actor==null||actor.getId()==null||jdbc.queryForList("select id from admin_user where id=? and active=true and role='OWNER' for share",Long.class,actor.getId()).isEmpty())throw new AdminApiException(403,"forbidden");
 }
 private java.time.Instant write(long id,long current,long next,Map<String,Object> book,AdminUser actor,String action){
  for(var row:variants.pooledRows(id,next))jdbc.update("update book_variant set stock=? where id=? and book_copy_id=?",row.stock(),UUID.fromString(row.id()),id);
  String availability=next>0?"AVAILABLE":"SOLD";var now=clock.instant().truncatedTo(java.time.temporal.ChronoUnit.MICROS);var timestamp=Timestamp.from(now);
  jdbc.update("update book_copy set availability=?,version=version+1,updated_at=? where id=?",availability,timestamp,id);
  jdbc.update("update listing set updated_at=? where book_copy_id=?",timestamp,id);
  audit.record(actor,"BOOK",id,action,Map.of("totalStock",current,"availability",book.get("availability")),Map.of("totalStock",next,"availability",availability),((Number)book.get("version")).longValue()+1);
  return now;
 }
}
