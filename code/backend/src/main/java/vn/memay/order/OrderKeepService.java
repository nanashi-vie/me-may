package vn.memay.order;
import org.springframework.stereotype.Service;
import vn.memay.auth.AdminUser;
import vn.memay.common.AdminApiException;
import java.time.*;
import java.sql.Timestamp;
import static vn.memay.order.OrderDtos.*;
import static vn.memay.order.OrderValidation.*;
@Service
public class OrderKeepService {
 private final OrderRepository db;private final OrderMutations mutations;private final OrderInventory inventory;
 public OrderKeepService(OrderRepository db,OrderMutations mutations,OrderInventory inventory){this.db=db;this.mutations=mutations;this.inventory=inventory;}
 public MutationResult keep(long id,KeepRequest r,AdminUser actor){return mutations.run(actor,"KEEP",id,r.meta(),r,()->{
  var d=db.require(id,false);transition(d.status()==Status.DRAFT&&d.fulfillmentType().equals("KEEP"));requireItems(d);
  if(d.totals().paidAmount()<d.requiredDepositVnd()){
   if(!Boolean.TRUE.equals(r.allowInsufficientDeposit()))throw new AdminApiException(409,"deposit_required");
   String reason=text(r.reason(),"reason",1000,true);db.jdbc.update("update orders set deposit_override_reason=?,deposit_override_by=?,deposit_override_at=? where id=?",reason,actor.getId(),Timestamp.from(db.clock.instant()),id);db.note(id,"KEEP_OVERRIDE",reason,r.meta(),actor);
  }
  inventory.sync(id,actor);var started=db.clock.instant();db.jdbc.update("update orders set status='KEEPING',keep_started_at=?,keep_until=? where id=?",Timestamp.from(started),Timestamp.from(keepUntil(started,14)),id);return id;
 });}
 public MutationResult extend(long id,ExtendRequest r,AdminUser actor){return mutations.run(actor,"EXTEND_KEEP",id,r.meta(),r,()->{
  var d=db.require(id,false);transition(d.status()==Status.KEEPING&&d.keepStartedAt()!=null&&d.keepUntil()!=null);
  Instant until;try{until=LocalDate.parse(r.keepUntilDate()).plusDays(1).atStartOfDay(ZONE).toInstant();}catch(RuntimeException e){throw AdminApiException.field("keepUntilDate","Ngày gia hạn không hợp lệ");}
  if(!until.isAfter(d.keepUntil())||until.isAfter(keepUntil(d.keepStartedAt(),30)))throw AdminApiException.field("keepUntilDate","Hạn mới phải sau hạn cũ và không vượt 30 ngày từ đầu");
  String reason=text(r.reason(),"reason",1000,true);db.jdbc.update("update orders set keep_until=?,keep_extension_count=keep_extension_count+1 where id=?",Timestamp.from(until),id);db.note(id,"EXTEND_KEEP",reason,r.meta(),actor);return id;
 });}
 public MutationResult reopen(long id,ReasonRequest r,AdminUser actor){return mutations.run(actor,"REOPEN",id,r.meta(),r,()->{
  var d=db.require(id,false);transition(d.status()==Status.READY_TO_SHIP&&!everShipped(d));String reason=text(r.reason(),"reason",1000,true);
  if(d.fulfillmentType().equals("KEEP")&&d.keepStartedAt()!=null&&d.keepUntil()!=null){inventory.verify(id,"ACTIVE");db.jdbc.update("update orders set status='KEEPING',declared_value=null,cod_needs_review=true where id=?",id);}
  else{inventory.release(id,actor);db.jdbc.update("update orders set status='DRAFT',declared_value=null,cod_needs_review=true where id=?",id);}
  db.jdbc.update("update order_shipments set state='ABORTED' where order_id=? and state='PLANNED'",id);db.note(id,"REOPEN",reason,r.meta(),actor);return id;
 });}
 public MutationResult cancel(long id,ReasonRequest r,AdminUser actor){return mutations.run(actor,"CANCEL",id,r.meta(),r,()->{
  var d=db.require(id,false);transition((d.status()==Status.DRAFT||d.status()==Status.KEEPING||d.status()==Status.READY_TO_SHIP)&&!everShipped(d));
  String reason=text(r.reason(),"reason",1000,true);inventory.release(id,actor);db.jdbc.update("update orders set status='CANCELLED',cancelled_at=?,cancelled_by=?,cancellation_reason=? where id=?",Timestamp.from(db.clock.instant()),actor.getId(),reason,id);
  db.jdbc.update("update order_shipments set state='ABORTED' where order_id=? and state='PLANNED'",id);db.note(id,"CANCEL",reason,r.meta(),actor);return id;
 });}
 static boolean everShipped(OrderDetail d){return d.shipments().stream().anyMatch(s->s.handedOverAt()!=null);}
 static void requireItems(OrderDetail d){if(d.items().isEmpty())throw AdminApiException.field("items","Thêm ít nhất một cuốn");if(d.items().stream().anyMatch(i->i.unitWeightGrams()==null))throw AdminApiException.field("unitWeightGrams","Bổ sung trọng lượng từng cuốn");}
}
