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
  if(actor==null||actor.getId()==null||jdbc.queryForList("select id from admin_user where id=? and active=true and role='OWNER' for share",Long.class,actor.getId()).isEmpty())throw new AdminApiException(403,"forbidden");
  lockAll(List.of(id));var book=jdbc.queryForMap("select version,availability,deleted_at from book_copy where id=?",id);
  if(delta<0&&book.get("deleted_at")!=null)throw new AdminApiException(409,"book_trashed");
  long current=variants.read(id).stream().mapToLong(BookDtos.VariantView::stock).sum();
  long next;try{next=Math.addExact(current,delta);}catch(ArithmeticException e){throw new AdminApiException(409,"stock_capacity_conflict");}
  if(next<0)throw new AdminApiException(409,"stock_conflict");if(next>variants.stockLimit(id))throw new AdminApiException(409,"stock_capacity_conflict");if(delta==0)return current;
  for(var row:variants.pooledRows(id,next))jdbc.update("update book_variant set stock=? where id=? and book_copy_id=?",row.stock(),UUID.fromString(row.id()),id);
  String availability=next>0?"AVAILABLE":"SOLD";var now=Timestamp.from(clock.instant());
  jdbc.update("update book_copy set availability=?,version=version+1,updated_at=? where id=?",availability,now,id);
  jdbc.update("update listing set updated_at=? where book_copy_id=?",now,id);
  audit.record(actor,"BOOK",id,"ORDER_STOCK",Map.of("totalStock",current,"availability",book.get("availability")),Map.of("totalStock",next,"availability",availability),((Number)book.get("version")).longValue()+1);
  return next;
 }
}
