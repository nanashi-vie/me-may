package vn.memay.order;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.memay.auth.AdminUser;
import vn.memay.audit.AuditService;
import vn.memay.common.AdminApiException;
import java.util.*;
import java.util.function.LongSupplier;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import static vn.memay.order.OrderDtos.*;
@Service
public class OrderMutations {
 private final OrderRepository db;private final AuditService audit;
 public OrderMutations(OrderRepository db,AuditService audit){this.db=db;this.audit=audit;}
 public void requireOwner(AdminUser actor){requireOwner(actor,true);}
 public void requireOwner(AdminUser actor,boolean lock){
  if(actor==null||actor.getId()==null||db.jdbc.queryForList("select id from admin_user where id=? and active=true and role='OWNER'"+(lock?" for share":""),Long.class,actor.getId()).isEmpty())throw new AdminApiException(403,"forbidden");
 }
 @Transactional
 public MutationResult run(AdminUser actor,String operation,Long orderId,MutationMeta meta,Object payload,LongSupplier write){
  requireOwner(actor);
  if(meta==null||meta.requestId()==null||orderId!=null&&(meta.version()==null||meta.version()<0))throw new AdminApiException(400,"invalid_request");
  Object fields=db.json.convertValue(payload,Object.class);
  if (payload instanceof OrderDtos.ShippingRequest request && request.customerPaymentMode()==null && fields instanceof Map<?,?> map)
   map.remove("customerPaymentMode"); // Retain fingerprints of pre-V37 requests.
  if (payload instanceof OrderDtos.ItemRequest && fields instanceof Map<?,?> map){ // Retain fingerprints of pre-V41 requests.
   if(map.get("soldOn")==null)map.remove("soldOn");if(map.get("lotLabel")==null)map.remove("lotLabel");
  }
  String fingerprint=hash(Arrays.asList(orderId,meta.version(),canonical(fields)));
  db.jdbc.update("insert into order_mutation_receipt(actor_id,operation,request_id,fingerprint) values(?,?,?,?) on conflict do nothing",actor.getId(),operation,meta.requestId(),fingerprint);
  var receipt=db.jdbc.queryForMap("select fingerprint,result_json::text as result from order_mutation_receipt where actor_id=? and operation=? and request_id=? for update",actor.getId(),operation,meta.requestId());
  if(!fingerprint.equals(receipt.get("fingerprint")))throw new AdminApiException(409,"idempotency_conflict");
  if(receipt.get("result")!=null)return db.json.readValue(receipt.get("result").toString(),MutationResult.class);
  var before=orderId==null?null:db.require(orderId,true);
  if(before!=null&&before.version()!=meta.version())throw AdminApiException.conflict(before.version());
  long changedId=write.getAsLong();
  if(orderId!=null&&changedId!=orderId)throw new IllegalStateException("Command changed wrong order");
  if(orderId!=null)db.jdbc.update("update orders set version=version+1,updated_at=? where id=?",java.sql.Timestamp.from(db.clock.instant()),orderId);
  var after=db.require(changedId,false);var old=snapshot(before);var fresh=snapshot(after);
  for(String field:List.of("recipientName","recipientPhone","shippingAddress")){
   Object a=before==null?null:switch(field){case "recipientName"->before.recipientName();case "recipientPhone"->before.recipientPhone();default->before.shippingAddress();};
   Object b=switch(field){case "recipientName"->after.recipientName();case "recipientPhone"->after.recipientPhone();default->after.shippingAddress();};
   if(!Objects.equals(a,b))fresh.put(field+"Changed",true);
  }
  audit.recordOrder(actor,changedId,operation,old,fresh,after.version());
  var result=new MutationResult(after.id(),after.orderCode(),after.version(),after.status());
  db.jdbc.update("update order_mutation_receipt set order_id=?,result_json=cast(? as jsonb) where actor_id=? and operation=? and request_id=?",changedId,db.json.writeValueAsString(result),actor.getId(),operation,meta.requestId());
  return result;
 }
 public String hash(Object value){
  try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(db.json.writeValueAsString(value).getBytes(StandardCharsets.UTF_8)));}
  catch(java.security.NoSuchAlgorithmException e){throw new IllegalStateException(e);}
 }
 private Object canonical(Object v){
  if(v instanceof Map<?,?> m){var result=new TreeMap<String,Object>();m.forEach((k,x)->result.put(k.toString(),canonical(x)));return result;}
  if(v instanceof List<?> list)return list.stream().map(this::canonical).toList();return v;
 }
 private Map<String,Object> snapshot(OrderDetail d){
  var m=new LinkedHashMap<String,Object>();if(d==null)return m;
  m.put("status",d.status());m.put("fulfillmentType",d.fulfillmentType());m.put("customerId",d.customerId());m.put("keepUntil",d.keepUntil());
  m.put("discountAmount",d.discountAmount());m.put("shippingFee",d.shippingFee());m.put("parcelWeightGrams",d.parcelWeightGrams());m.put("codAmount",d.codAmount());m.put("declaredValue",d.declaredValue());m.put("customerPaymentMode",d.customerPaymentMode());m.put("shippingPaymentType",d.shippingPaymentType());
  m.put("orderItems",d.items().stream().map(i->Arrays.asList(i.id(),i.bookCopyId(),i.listingId(),i.unitPriceVnd(),i.quantity(),i.unitWeightGrams(),hash(i.titleSnapshot()),String.valueOf(i.soldOn()),String.valueOf(i.lotLabel()))).toList());
  m.put("orderPayments",d.payments().stream().map(p->Arrays.asList(p.id(),p.transactionType(),p.amount(),p.voidedAt())).toList());
  m.put("orderReturns",d.returns().stream().map(r->List.of(r.id(),r.itemId(),r.quantityReceived(),r.quantityRestocked())).toList());
  m.put("orderNotes",d.notes().stream().map(n->List.of(n.id(),n.operation(),n.version())).toList());
  m.put("orderShipments",d.shipments().stream().map(s->Arrays.asList(s.id(),s.attemptNo(),s.state(),s.trackingCode())).toList());
  return m;
 }
}
