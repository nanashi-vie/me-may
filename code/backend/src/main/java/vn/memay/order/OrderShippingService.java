package vn.memay.order;
import org.springframework.stereotype.Service;
import vn.memay.auth.AdminUser;
import vn.memay.catalogue.BookStockService;
import vn.memay.customer.CustomerValidation;
import vn.memay.common.AdminApiException;
import java.sql.Timestamp;
import java.util.*;
import static vn.memay.order.OrderDtos.*;
import static vn.memay.order.OrderValidation.*;
@Service
public class OrderShippingService {
 private final OrderRepository db;private final OrderMutations mutations;private final OrderInventory inventory;private final BookStockService stock;
 public OrderShippingService(OrderRepository db,OrderMutations mutations,OrderInventory inventory,BookStockService stock){this.db=db;this.mutations=mutations;this.inventory=inventory;this.stock=stock;}
 public MutationResult finalizeOrder(long id,ShippingRequest r,AdminUser actor){return mutations.run(actor,"FINALIZE",id,r.meta(),r,()->{
  var d=db.require(id,false);transition((d.status()==Status.DRAFT||d.status()==Status.KEEPING)&&!OrderKeepService.everShipped(d));OrderKeepService.requireItems(d);
  apply(id,d,r);if(d.status()==Status.DRAFT)inventory.sync(id,actor);else inventory.verify(id,"ACTIVE");
  db.jdbc.update("update orders set status='READY_TO_SHIP' where id=?",id);newPlan(id,0);return id;
 });}
 public MutationResult updateShipping(long id,ShippingRequest r,AdminUser actor){return mutations.run(actor,"SHIPPING_UPDATE",id,r.meta(),r,()->{
  var d=db.require(id,false);
  if(d.status()==Status.COMPLETED){
   if(r.recipientName()!=null||r.recipientPhone()!=null||r.shippingAddress()!=null||r.shippingFee()!=null||r.parcelWeightGrams()!=null||r.parcelWeightOverridden()!=null||r.parcelWeightConfirmed()!=null||r.codAmount()!=null||r.codConfirmed()!=null||r.shippingPaymentType()!=null||r.customerPaymentMode()!=null||r.additionalShippingFee()!=null)throw AdminApiException.field("shipping","Sau bàn giao chỉ sửa mã vận đơn");
   if(PICKUP.equals(d.shippingProvider()))throw AdminApiException.field("shippingProvider","Khách tự lấy không có mã vận đơn");
   String provider=carrier(r.shippingProvider(),d.shippingProvider());if(PICKUP.equals(provider))throw AdminApiException.field("shippingProvider","Chỉ đổi giữa J&T và Shopee Express");
   String reason=text(r.reason(),"reason",1000,true),code=tracking(r.trackingCode());var current=latestHanded(d);uniqueTracking(d,code,current.id());
   db.jdbc.update("update order_shipments set tracking_code=?,shipping_snapshot=jsonb_set(shipping_snapshot,'{shippingProvider}',to_jsonb(?::text)) where id=?",code,provider,Long.parseLong(current.id()));db.jdbc.update("update orders set tracking_code=?,shipping_provider=? where id=?",code,provider,id);db.note(id,"TRACKING_CORRECTED",reason,r.meta(),actor);
  }else{
   transition(d.status()==Status.READY_TO_SHIP);var current=planned(d);apply(id,d,r);
   updatePlan(id,current.id(),OrderRepository.nullableLong(current.shippingSnapshot(),"additionalShippingFee"));
  }return id;
 });}
 public MutationResult ship(long id,ShipRequest r,AdminUser actor){return mutations.run(actor,"SHIP",id,r.meta(),r,()->{
  var d=db.require(id,false);transition(d.status()==Status.READY_TO_SHIP);OrderKeepService.requireItems(d);var current=planned(d);
  String provider=carrier(r.shippingProvider(),d.shippingProvider());
  if(!provider.equals(d.shippingProvider())&&(PICKUP.equals(provider)||PICKUP.equals(d.shippingProvider())))throw AdminApiException.field("shippingProvider","Đổi Khách tự lấy ở tab Xuất bill rồi lưu lại");
  String code=null;
  if(PICKUP.equals(provider)){
   text(d.recipientName(),"recipientName",150,true);phone(d.recipientPhone());
   if(d.totals().paidAmount()<d.totals().orderTotal())throw AdminApiException.field("balance","Khách tự lấy cần thanh toán đủ trước khi giao");
  }else{
   if(d.codNeedsReview())throw new AdminApiException(409,"cod_review_required");if(d.parcelWeightNeedsReview())throw new AdminApiException(409,"parcel_weight_review_required");
   requireAddress(d.recipientName(),d.recipientPhone(),d.shippingAddress());number(d.shippingFee(),"shippingFee",0,MAX);number(d.parcelWeightGrams(),"parcelWeightGrams",1,MAX);
   validateMonthly(d.customerPaymentMode(),d.codAmount(),d.totals().orderTotal(),d.totals().paidAmount());
   code=tracking(r.trackingCode()==null?d.trackingCode():r.trackingCode());uniqueTracking(d,code,current.id());
  }
  if(!provider.equals(d.shippingProvider())){db.jdbc.update("update orders set shipping_provider=? where id=?",provider,id);updatePlan(id,current.id(),OrderRepository.nullableLong(current.shippingSnapshot(),"additionalShippingFee"));}
  boolean resend=OrderKeepService.everShipped(d);inventory.verify(id,resend?"CONSUMED":"ACTIVE");
  if(!resend)db.jdbc.update("update order_reservation set state='CONSUMED',updated_at=? where order_id=? and state='ACTIVE'",now(),id);
  db.jdbc.update("update order_shipments set state='HANDED_OVER',tracking_code=?,handed_over_at=?,handed_over_by=? where id=?",code,now(),actor.getId(),Long.parseLong(current.id()));
  db.jdbc.update("update orders set status='COMPLETED',tracking_code=?,completed_at=?,completed_by=? where id=?",code,now(),actor.getId(),id);return id;
 });}
 public MutationResult returnOrder(long id,ReturnRequest r,AdminUser actor){return mutations.run(actor,"RETURN",id,r.meta(),r,()->{
  var d=db.require(id,false);transition(d.status()==Status.COMPLETED&&OrderKeepService.everShipped(d));inventory.verify(id,"CONSUMED");
  String reason=text(r.reason(),"reason",1000,true);if(!Boolean.TRUE.equals(r.actualConfirmed()))throw AdminApiException.field("actualConfirmed","Xác nhận hàng thực tế đã nhận");
  if(r.items()==null||r.items().size()!=d.items().size())throw AdminApiException.field("items","Xác nhận đủ từng dòng trong đơn");
  var seen=new HashSet<String>();var received=new TreeMap<Long,Long>();var restocked=new TreeMap<Long,Long>();
  for(var line:r.items()){
   if(line==null||!seen.add(line.itemId()))throw AdminApiException.field("items","Dòng sách bị trùng hoặc không hợp lệ");
   var item=d.items().stream().filter(i->i.id().equals(line.itemId())).findFirst().orElseThrow(()->new AdminApiException(404,"not_found"));
   long count=number(line.quantityReceived(),"quantityReceived",0,item.quantity()),putBack=number(line.quantityRestocked(),"quantityRestocked",0,count);text(line.reason(),"reason",1000,false);
   if(item.bookCopyId()==null&&putBack!=0)throw AdminApiException.field("quantityRestocked","Sách ngoài không nhập tồn website");
   if(item.bookCopyId()!=null){long book=Long.parseLong(item.bookCopyId());received.merge(book,count,Math::addExact);restocked.merge(book,putBack,Math::addExact);}
  }
  stock.lockAll(new ArrayList<>(restocked.keySet()));
  for(var entry:restocked.entrySet())stock.adjust(entry.getKey(),entry.getValue(),actor);
  for(var entry:received.entrySet())db.jdbc.update("update order_reservation set returned_quantity=?,restocked_quantity=?,updated_at=? where order_id=? and book_copy_id=? and state='CONSUMED'",entry.getValue(),restocked.get(entry.getKey()),now(),id,entry.getKey());
  for(var line:r.items()){String why=text(line.reason(),"reason",1000,false);db.jdbc.update("insert into order_returns(order_id,item_id,quantity_received,quantity_restocked,reason,created_by,created_at,request_id) values(?,?,?,?,?,?,?,?)",id,OrderValidation.id(line.itemId(),"itemId"),line.quantityReceived(),line.quantityRestocked(),why==null?reason:why,actor.getId(),now(),r.requestId());}
  var shipment=latestHanded(d);db.jdbc.update("update order_shipments set state='FAILED',failed_at=?,failed_by=?,failure_reason=? where id=? and state='HANDED_OVER'",now(),actor.getId(),reason,Long.parseLong(shipment.id()));
  db.jdbc.update("update orders set status='CANCELLED',cancelled_at=?,cancelled_by=?,cancellation_reason=? where id=?",now(),actor.getId(),reason,id);db.note(id,"RETURN",reason,r.meta(),actor);return id;
 });}
 private void apply(long id,OrderDetail d,ShippingRequest r){
  OrderKeepService.requireItems(d);String name=text(r.recipientName()==null?d.recipientName():r.recipientName(),"recipientName",150,true);
  String phone=phone(r.recipientPhone()==null?d.recipientPhone():r.recipientPhone());String provider=carrier(r.shippingProvider(),d.shippingProvider());
  String tracking=r.trackingCode()==null||r.trackingCode().equals(d.trackingCode())?d.trackingCode():r.trackingCode().isBlank()?null:tracking(r.trackingCode());
  if(PICKUP.equals(provider)){
   // The customer collects at the shop: no address, parcel, shipping fee or COD.
   String address=text(r.shippingAddress()==null?d.shippingAddress():r.shippingAddress(),"shippingAddress",500,false);
   db.jdbc.update("update orders set recipient_name=?,recipient_phone=?,shipping_address=?,shipping_fee=0,parcel_weight_grams=null,parcel_weight_overridden=false,parcel_weight_needs_review=false,cod_amount=0,cod_needs_review=false,declared_value=?,customer_payment_mode=null,shipping_provider=?,tracking_code=null where id=?",name,phone,address,d.totals().goodsTotal(),provider,id);
   return;
  }
  String address=text(r.shippingAddress()==null?d.shippingAddress():r.shippingAddress(),"shippingAddress",500,true);
  Long fee;
  if(r.additionalShippingFee()!=null&&r.additionalShippingFee()!=0)throw AdminApiException.field("additionalShippingFee","Không còn phí gửi lại");fee=r.shippingFee();number(fee,"shippingFee",0,MAX);
  long weight=number(r.parcelWeightGrams(),"parcelWeightGrams",1,MAX);
  if (!Boolean.TRUE.equals(r.parcelWeightConfirmed()))
   throw AdminApiException.field("parcelWeightConfirmed","Xác nhận lại trọng lượng kiện");
  long cod=r.codAmount()==null?d.codAmount():number(r.codAmount(),"codAmount",0,MAX);
  if((d.codNeedsReview()||cod!=d.codAmount()||!Objects.equals(fee,d.shippingFee()))&&!Boolean.TRUE.equals(r.codConfirmed()))throw AdminApiException.field("codConfirmed","Xác nhận lại số tiền COD");
  String mode=r.customerPaymentMode();
  if (!"RECIPIENT".equals(mode) && !"MONTHLY".equals(mode))
   throw AdminApiException.field("customerPaymentMode","Chọn phương thức thanh toán bill");
  validateMonthly(mode,cod,add(d.totals().goodsTotal(),fee,"shippingFee"),d.totals().paidAmount());
  String payment=r.shippingPaymentType()==null?d.shippingPaymentType():r.shippingPaymentType();if(!Set.of("PP_CASH","CC_CASH","PP_PM").contains(payment))throw AdminApiException.field("shippingPaymentType","Chọn phương thức trả phí");
  db.jdbc.update("update orders set recipient_name=?,recipient_phone=?,shipping_address=?,shipping_fee=?,parcel_weight_grams=?,parcel_weight_overridden=?,parcel_weight_needs_review=false,cod_amount=?,cod_needs_review=false,declared_value=?,shipping_payment_type=?,customer_payment_mode=?,shipping_provider=?,tracking_code=? where id=?",name,phone,address,fee,weight,true,cod,d.totals().goodsTotal(),payment,mode,provider,tracking,id);
 }
 private static void validateMonthly(String mode,long cod,long total,long received){
  if ("MONTHLY".equals(mode) && (cod!=0 || received<total))
   throw AdminApiException.field("customerPaymentMode","Thanh toán cuối tháng cần nhận đủ tổng bill và COD bằng 0");
 }
 private void newPlan(long id,long additional){var d=db.require(id,false);int next=d.shipments().stream().mapToInt(Shipment::attemptNo).max().orElse(0)+1;
  db.jdbc.update("insert into order_shipments(order_id,attempt_no,state,shipping_snapshot,tracking_code,created_at) values(?,?,'PLANNED',cast(? as jsonb),?,?)",id,next,db.json.writeValueAsString(snapshot(d,additional)),d.trackingCode(),now());}
 private void updatePlan(long id,String shipmentId,Long additional){var d=db.require(id,false);db.jdbc.update("update order_shipments set shipping_snapshot=cast(? as jsonb),tracking_code=? where id=? and state='PLANNED'",db.json.writeValueAsString(snapshot(d,additional==null?0:additional)),d.trackingCode(),Long.parseLong(shipmentId));}
 private Map<String,Object> snapshot(OrderDetail d,long additional){var m=new LinkedHashMap<String,Object>();m.put("recipientName",d.recipientName());m.put("recipientPhone",d.recipientPhone());m.put("shippingAddress",d.shippingAddress());m.put("customerPaymentMode",d.customerPaymentMode());m.put("shippingProvider",d.shippingProvider());m.put("shippingService",PICKUP.equals(d.shippingProvider())?null:"EXPRESS");m.put("shippingPaymentType",d.shippingPaymentType());m.put("shippingFee",d.shippingFee());m.put("additionalShippingFee",additional);m.put("parcelWeightGrams",d.parcelWeightGrams());m.put("parcelCount",1);m.put("codAmount",d.codAmount());m.put("declaredValue",d.declaredValue());return m;}
 private static Shipment planned(OrderDetail d){return d.shipments().stream().filter(s->s.state().equals("PLANNED")).findFirst().orElseThrow(()->new AdminApiException(409,"shipment_missing"));}
 private static Shipment latestHanded(OrderDetail d){return d.shipments().stream().filter(s->s.handedOverAt()!=null).max(Comparator.comparingInt(Shipment::attemptNo)).orElseThrow(()->new AdminApiException(409,"shipment_missing"));}
 private void uniqueTracking(OrderDetail d,String code,String currentId){
  if(d.shipments().stream().anyMatch(s->s.handedOverAt()!=null&&!s.id().equals(currentId)&&code.equals(s.trackingCode())))throw AdminApiException.field("trackingCode","Nhập mã vận đơn mới cho lần gửi lại");
  var other=db.jdbc.queryForList("select o.order_code from order_shipments s join orders o on o.id=s.order_id where s.tracking_code=? and s.order_id<>? and s.handed_over_at is not null limit 1",String.class,code,Long.parseLong(d.id()));
  if(!other.isEmpty())throw AdminApiException.field("trackingCode","Mã vận đơn đã dùng cho đơn "+other.getFirst());
 }
 static final String PICKUP="PICKUP";
 private static final Set<String> CARRIERS=Set.of("JNT","SPX",PICKUP);
 private static final java.util.regex.Pattern TRACKING=java.util.regex.Pattern.compile("[A-Z0-9]{8,30}");
 /** The requested carrier, or the order's when none is sent. */
 private static String carrier(String requested,String current){
  String value=requested==null?current:requested;
  if(value==null||!CARRIERS.contains(value))throw AdminApiException.field("shippingProvider","Chọn J&T, Shopee Express hoặc Khách tự lấy");
  return value;
 }
 /** Spaces dropped and upper-cased; 8–30 letters or digits. */
 static String tracking(String input){
  String code=input==null?"":input.replaceAll("\\s+","").toUpperCase(Locale.ROOT);
  if(code.isEmpty())throw AdminApiException.field("trackingCode","Nhập mã vận đơn");
  if(!TRACKING.matcher(code).matches())throw AdminApiException.field("trackingCode","Mã vận đơn gồm 8–30 chữ hoặc số");
  return code;
 }
 private static String phone(String input){try{String value=CustomerValidation.normalizePhone(input);if(value==null)throw AdminApiException.field("recipientPhone","Nhập số điện thoại nhận hàng");return value;}catch(AdminApiException e){throw AdminApiException.field("recipientPhone","Số điện thoại nhận hàng không hợp lệ");}}
 private static void requireAddress(String name,String phone,String address){text(name,"recipientName",150,true);phone(phone);text(address,"shippingAddress",500,true);}
 private Timestamp now(){return Timestamp.from(db.clock.instant());}
}
