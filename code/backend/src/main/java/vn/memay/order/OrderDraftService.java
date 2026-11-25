package vn.memay.order;
import org.springframework.stereotype.Service;
import vn.memay.auth.AdminUser;
import vn.memay.catalogue.BookStockService;
import vn.memay.customer.CustomerValidation;
import vn.memay.common.AdminApiException;
import java.util.*;
import java.sql.Timestamp;
import static vn.memay.order.OrderDtos.*;
import static vn.memay.order.OrderValidation.*;
@Service
public class OrderDraftService {
 private final OrderRepository db;private final OrderMutations mutations;private final BookStockService stock;private final OrderInventory inventory;private final CatalogMatchService match;
 public OrderDraftService(OrderRepository db,OrderMutations mutations,BookStockService stock,OrderInventory inventory,CatalogMatchService match){this.db=db;this.mutations=mutations;this.stock=stock;this.inventory=inventory;this.match=match;}
 public MutationResult create(CreateRequest r,AdminUser actor){return mutations.run(actor,"CREATE",null,r.meta(),r,()->{
  var c=customer(id(r.customerId(),"customerId"));String type=type(r.fulfillmentType(),"IMMEDIATE");
  return db.jdbc.queryForObject("insert into orders(customer_id,customer_code_snapshot,customer_name_snapshot,customer_phone_snapshot,fulfillment_type,recipient_name,recipient_phone,shipping_address,created_by,created_at,updated_at) values(?,?,?,?,?,?,?,?,?,?,?) returning id",Long.class,c.get("id"),c.get("customer_code"),c.get("full_name"),c.get("phone"),type,c.get("full_name"),c.get("phone"),c.get("default_address"),actor.getId(),Timestamp.from(db.clock.instant()),Timestamp.from(db.clock.instant()));
 });}
 public MutationResult update(long id,UpdateRequest r,AdminUser actor){return mutations.run(actor,"UPDATE",id,r.meta(),r,()->{
  var old=db.require(id,false);editable(old);long customerId=r.customerId()==null?Long.parseLong(old.customerId()):id(r.customerId(),"customerId");
  if(customerId!=Long.parseLong(old.customerId())){
   transition(old.status()==Status.DRAFT&&old.payments().isEmpty());var c=customer(customerId);
   db.jdbc.update("update orders set customer_id=?,customer_code_snapshot=?,customer_name_snapshot=?,customer_phone_snapshot=? where id=?",customerId,c.get("customer_code"),c.get("full_name"),c.get("phone"),id);
  }
  String type=type(r.fulfillmentType(),old.fulfillmentType());if(old.status()!=Status.DRAFT&&!type.equals(old.fulfillmentType()))throw new AdminApiException(409,"transition_conflict");
  long discount=old.discountAmount();
  if(r.discountAmount()!=null && r.discountAmount()!=discount)throw AdminApiException.field("discountAmount","Điều chỉnh giá trên từng cuốn sách");
  if(r.shippingFee()!=null)number(r.shippingFee(),"shippingFee",0,MAX);
  boolean overridden=Boolean.TRUE.equals(r.parcelWeightOverridden());Long weight=overridden?number(r.parcelWeightGrams(),"parcelWeightGrams",1,MAX):null;
  db.jdbc.update("update orders set fulfillment_type=?,discount_amount=?,recipient_name=?,recipient_phone=?,shipping_address=?,shipping_fee=?,parcel_weight_grams=?,parcel_weight_overridden=?,parcel_weight_needs_review=false where id=?",type,discount,text(r.recipientName(),"recipientName",150,false),CustomerValidation.normalizePhone(r.recipientPhone()),text(r.shippingAddress(),"shippingAddress",500,false),r.shippingFee(),weight,overridden,id);
  refresh(id,false,discount!=old.discountAmount()||!Objects.equals(r.shippingFee(),old.shippingFee()));return id;
 });}
 public MutationResult addItem(long id,ItemRequest r,AdminUser actor){return mutations.run(actor,"ITEM_ADD",id,r.meta(),r,()->{writeItem(id,null,r,actor);return id;});}
 public MutationResult updateItem(long id,long itemId,ItemRequest r,AdminUser actor){return mutations.run(actor,"ITEM_UPDATE",id,r.meta(),Arrays.asList(itemId,r),()->{writeItem(id,itemId,r,actor);return id;});}
 public MutationResult removeItem(long id,long itemId,ReasonRequest r,AdminUser actor){return mutations.run(actor,"ITEM_REMOVE",id,r.meta(),Arrays.asList(itemId,r),()->{
  var d=db.require(id,false);editable(d);var item=d.items().stream().filter(i->i.id().equals(Long.toString(itemId))).findFirst().orElseThrow(()->new AdminApiException(404,"not_found"));
  String reason=text(r.reason(),"reason",1000,d.status()==Status.KEEPING);if(reason!=null)db.noteItem(id,"ITEM_REMOVE",reason,r.meta(),actor,item,item.quantity());
  db.jdbc.update("delete from order_items where id=? and order_id=?",itemId,id);if(d.status()==Status.KEEPING)inventory.sync(id,actor);else inventory.checkDraft(id);refresh(id,true,true);return id;
 });}
 private void writeItem(long id,Long itemId,ItemRequest r,AdminUser actor){
  var d=db.require(id,false);editable(d);OrderItem old=itemId==null?null:d.items().stream().filter(i->i.id().equals(itemId.toString())).findFirst().orElseThrow(()->new AdminApiException(404,"not_found"));
  String source=text(r.sourceType()==null&&old!=null?old.sourceType():r.sourceType(),"sourceType",16,true);if(!Set.of("CATALOG","MANUAL").contains(source))throw AdminApiException.field("sourceType","Chọn nguồn sách");
  if(old!=null&&!source.equals(old.sourceType()))throw AdminApiException.field("sourceType","Không đổi nguồn của dòng đã thêm");
  long price=number(r.unitPriceVnd(),"unitPriceVnd",0,MAX_PRICE),quantity=number(r.quantity(),"quantity",1,999999);Long weight=r.unitWeightGrams();
  boolean reduced=old!=null&&quantity<old.quantity();String reductionReason=text(r.reason(),"reason",1000,reduced&&d.status()==Status.KEEPING);
  if(reduced&&reductionReason!=null)db.noteItem(id,"ITEM_QUANTITY_REDUCED",reductionReason,r.meta(),actor,old,old.quantity()-quantity);
  Long book=null,listing=null;String code=null,title,reason=null,evidence=null;
  if(source.equals("CATALOG")){
   book=id(r.bookCopyId()==null&&old!=null?old.bookCopyId():r.bookCopyId(),"bookCopyId");
   if(old!=null&&!book.toString().equals(old.bookCopyId()))throw AdminApiException.field("bookCopyId","Không đổi sách của dòng đã thêm");
   var locks=new ArrayList<>(inventory.desired(id).keySet());locks.add(book);stock.lockAll(locks);
   var candidate=match.catalog(book);listing=Long.parseLong(candidate.listingId());code=old==null?candidate.bookCode():old.bookCodeSnapshot();title=text(old==null?candidate.title():old.titleSnapshot(),"title",300,true);
   if(old==null&&weight==null)weight=candidate.weightG();
  }else{
   if(r.bookCopyId()!=null&&!r.bookCopyId().isBlank())throw AdminApiException.field("bookCopyId","Sách ngoài không tham chiếu catalogue");
   title=text(r.title(),"title",300,true);number(weight,"unitWeightGrams",1,MAX);var confirmation=r.matchConfirmation();
   if(confirmation==null&&old!=null&&title.equals(old.titleSnapshot())&&old.manualMatchOverrideReason()!=null){
    var oldEvidence=db.jdbc.queryForObject("select manual_match_evidence from order_items where id=?",String.class,itemId);
    confirmation=new MatchConfirmation(normalizeTitle(title),oldEvidence,old.manualMatchOverrideReason());
   }
   reason=match.confirm(title,confirmation);if(reason!=null)evidence=confirmation.fingerprint();
  }
  if(weight!=null)number(weight,"unitWeightGrams",1,MAX);
  if(d.status()==Status.KEEPING&&weight==null)throw AdminApiException.field("unitWeightGrams","Bổ sung trọng lượng trước khi giữ");
  if(old==null)db.jdbc.update("insert into order_items(order_id,source_type,book_copy_id,listing_id,book_code_snapshot,title_snapshot,unit_price_vnd,quantity,unit_weight_grams,manual_match_override_reason,manual_match_evidence,created_by,added_at) values(?,?,?,?,?,?,?,?,?,?,?,?,?)",id,source,book,listing,code,title,price,quantity,weight,reason,evidence,actor.getId(),Timestamp.from(db.clock.instant()));
  else db.jdbc.update("update order_items set title_snapshot=?,unit_price_vnd=?,quantity=?,unit_weight_grams=?,manual_match_override_reason=?,manual_match_evidence=? where id=? and order_id=?",title,price,quantity,weight,reason,evidence,itemId,id);
  if(d.status()==Status.KEEPING)inventory.sync(id,actor);else inventory.checkDraft(id);
  refresh(id,old==null||old.quantity()!=quantity||!Objects.equals(old.unitWeightGrams(),weight),old==null||old.quantity()!=quantity||old.unitPriceVnd()!=price);
 }
 void refresh(long id,boolean weightChanged,boolean moneyChanged){var d=db.require(id,false);
  if(!d.parcelWeightOverridden())db.jdbc.update("update orders set parcel_weight_grams=?,parcel_weight_needs_review=false where id=?",d.totals().totalBookWeightGrams()==null||d.totals().totalBookWeightGrams()==0?null:d.totals().totalBookWeightGrams(),id);
  else if(weightChanged)db.jdbc.update("update orders set parcel_weight_needs_review=true where id=?",id);
  if(moneyChanged)db.jdbc.update("update orders set cod_needs_review=true where id=?",id);
 }
 private Map<String,Object> customer(long id){var rows=db.jdbc.queryForList("select * from customer where id=? and deleted_at is null for update",id);if(rows.isEmpty())throw new AdminApiException(404,"not_found");var c=rows.getFirst();if(!"ACTIVE".equals(c.get("status")))throw new AdminApiException(409,"customer_archived");return c;}
 private static String type(String value,String fallback){String t=value==null?fallback:value;if(!Set.of("IMMEDIATE","KEEP").contains(t))throw AdminApiException.field("fulfillmentType","Chọn loại đơn");return t;}
 private static void editable(OrderDetail d){transition(d.status()==Status.DRAFT||d.status()==Status.KEEPING);}
}
