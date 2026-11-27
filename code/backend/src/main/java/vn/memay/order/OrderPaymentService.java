package vn.memay.order;
import org.springframework.stereotype.Service;
import vn.memay.auth.AdminUser;
import vn.memay.common.AdminApiException;
import java.sql.Timestamp;
import java.util.*;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import static vn.memay.order.OrderDtos.*;
import static vn.memay.order.OrderValidation.*;
@Service
public class OrderPaymentService {
 private final OrderRepository db;private final OrderMutations mutations;private final PaymentProofStore proofs;
 public OrderPaymentService(OrderRepository db,OrderMutations mutations,PaymentProofStore proofs){this.db=db;this.mutations=mutations;this.proofs=proofs;}
 /** The receipt's hash is part of the request, so a retry with another image is a different request. */
 public MutationResult record(long id,PaymentRequest r,byte[] proof,AdminUser actor){
  if(proof==null&&(r.note()==null||r.note().isBlank()))throw AdminApiException.field("proof","Chọn ảnh bill chuyển khoản hoặc ghi chú vì sao không có ảnh");
  var payload=new LinkedHashMap<String,Object>();payload.put("payment",r);payload.put("proofSha256",proof==null?null:PaymentProofStore.sha256(proof));
  return mutations.run(actor,"PAYMENT_RECORD",id,r.meta(),payload,()->{
  var d=db.require(id,false);if(r.transactionType()==null)throw AdminApiException.field("transactionType","Chọn loại giao dịch");
  transition(d.status()!=Status.CANCELLED||r.transactionType()==PaymentType.REFUND);
  long amount=number(r.amount(),"amount",1,MAX);
  if(r.transactionType()==PaymentType.REFUND&&!Boolean.TRUE.equals(r.actualConfirmed()))throw AdminApiException.field("actualConfirmed","Xác nhận đã hoàn tiền thực tế");
  var when=db.clock.instant();
  String note=text(r.note(),"note",1000,false);
  var stored=proof==null?null:proofs.store(proof);
  if(stored!=null)TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization(){
   @Override public void afterCompletion(int status){if(status!=STATUS_COMMITTED)proofs.delete(stored.key());}
  });
  db.jdbc.update("insert into order_payments(order_id,transaction_type,amount,occurred_at,note,created_by,created_at,proof_key,proof_mime,proof_bytes,proof_sha256) values(?,?,?,?,?,?,?,?,?,?,?)",id,r.transactionType().name(),amount,Timestamp.from(when),note,actor.getId(),Timestamp.from(db.clock.instant()),stored==null?null:stored.key(),stored==null?null:stored.mime(),stored==null?null:stored.bytes(),stored==null?null:stored.sha256());
  reviewCod(id);return id;
 });
 }
 public MutationResult voidPayment(long id,long paymentId,ReasonRequest r,AdminUser actor){return mutations.run(actor,"PAYMENT_VOID",id,r.meta(),Arrays.asList(paymentId,r),()->{
  var d=db.require(id,false);var payment=d.payments().stream().filter(p->p.id().equals(Long.toString(paymentId))).findFirst().orElseThrow(()->new AdminApiException(404,"not_found"));
  transition(payment.voidedAt()==null);String reason=text(r.reason(),"reason",1000,true);
  db.jdbc.update("update order_payments set voided_at=?,voided_by=?,void_reason=? where id=? and order_id=?",Timestamp.from(db.clock.instant()),actor.getId(),reason,paymentId,id);
  reviewCod(id);return id;
 });}
 /** Owner-only read of one receipt that belongs to this order. */
 public PaymentProofStore.Proof proof(long id,long paymentId,AdminUser actor){
  mutations.requireOwner(actor,false);
  var rows=db.jdbc.query("select proof_key,proof_mime,proof_bytes,proof_sha256 from order_payments where id=? and order_id=? and proof_key is not null",(x,n)->new PaymentProofStore.Proof(x.getString(1),x.getString(2),x.getInt(3),x.getString(4)),paymentId,id);
  if(rows.isEmpty())throw new AdminApiException(404,"not_found");return rows.getFirst();
 }
 public byte[] proofBytes(PaymentProofStore.Proof proof){return proofs.read(proof.key());}
 private void reviewCod(long id){db.jdbc.update("update orders set cod_needs_review=true where id=? and status in ('DRAFT','KEEPING','READY_TO_SHIP')",id);}
}
