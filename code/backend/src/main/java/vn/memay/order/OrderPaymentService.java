package vn.memay.order;
import org.springframework.stereotype.Service;
import vn.memay.auth.AdminUser;
import vn.memay.common.AdminApiException;
import java.sql.Timestamp;
import java.util.*;
import static vn.memay.order.OrderDtos.*;
import static vn.memay.order.OrderValidation.*;
@Service
public class OrderPaymentService {
 private final OrderRepository db;private final OrderMutations mutations;
 public OrderPaymentService(OrderRepository db,OrderMutations mutations){this.db=db;this.mutations=mutations;}
 public MutationResult record(long id,PaymentRequest r,AdminUser actor){return mutations.run(actor,"PAYMENT_RECORD",id,r.meta(),r,()->{
  var d=db.require(id,false);if(r.transactionType()==null)throw AdminApiException.field("transactionType","Chọn loại giao dịch");
  transition(d.status()!=Status.CANCELLED||r.transactionType()==PaymentType.REFUND);
  long amount=number(r.amount(),"amount",1,MAX);String method=text(r.paymentMethod(),"paymentMethod",24,true);
  if(!Set.of("CASH","BANK_TRANSFER","OTHER").contains(method))throw AdminApiException.field("paymentMethod","Chọn phương thức thanh toán");
  if(r.transactionType()==PaymentType.REFUND&&!Boolean.TRUE.equals(r.actualConfirmed()))throw AdminApiException.field("actualConfirmed","Xác nhận đã hoàn tiền thực tế");
  var when=r.occurredAt()==null?db.clock.instant():r.occurredAt();
  db.jdbc.update("insert into order_payments(order_id,transaction_type,amount,payment_method,occurred_at,note,created_by,created_at) values(?,?,?,?,?,?,?,?)",id,r.transactionType().name(),amount,method,Timestamp.from(when),text(r.note(),"note",1000,false),actor.getId(),Timestamp.from(db.clock.instant()));
  reviewCod(id);return id;
 });}
 public MutationResult voidPayment(long id,long paymentId,ReasonRequest r,AdminUser actor){return mutations.run(actor,"PAYMENT_VOID",id,r.meta(),Arrays.asList(paymentId,r),()->{
  var d=db.require(id,false);var payment=d.payments().stream().filter(p->p.id().equals(Long.toString(paymentId))).findFirst().orElseThrow(()->new AdminApiException(404,"not_found"));
  transition(payment.voidedAt()==null);String reason=text(r.reason(),"reason",1000,true);
  db.jdbc.update("update order_payments set voided_at=?,voided_by=?,void_reason=? where id=? and order_id=?",Timestamp.from(db.clock.instant()),actor.getId(),reason,paymentId,id);
  reviewCod(id);return id;
 });}
 private void reviewCod(long id){db.jdbc.update("update orders set cod_needs_review=true where id=? and status in ('DRAFT','KEEPING','READY_TO_SHIP','UNSUCCESSFUL')",id);}
}
