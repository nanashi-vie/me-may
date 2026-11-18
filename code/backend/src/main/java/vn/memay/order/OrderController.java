package vn.memay.order;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import vn.memay.common.AdminActorResolver;
import vn.memay.common.AdminApiException;
import tools.jackson.databind.JsonNode;
import java.net.URI;
import java.util.*;
import static vn.memay.order.OrderDtos.*;
@RestController
@RequestMapping("/api/v1/admin/orders")
public class OrderController {
 private final OrderQueryService queries;private final OrderDraftService drafts;private final OrderKeepService keep;private final OrderPaymentService payments;private final OrderShippingService shipping;private final AdminActorResolver actors;private final OrderRepository db;
 public OrderController(OrderQueryService queries,OrderDraftService drafts,OrderKeepService keep,OrderPaymentService payments,OrderShippingService shipping,AdminActorResolver actors,OrderRepository db){this.queries=queries;this.drafts=drafts;this.keep=keep;this.payments=payments;this.shipping=shipping;this.actors=actors;this.db=db;}
 @GetMapping public Page<OrderSummary> list(Authentication a,@RequestParam Map<String,String> params){return queries.list(filter(params),actors.current(a));}
 @GetMapping("/stats") public OrderStats stats(Authentication a,@RequestParam Map<String,String> params){return queries.stats(filter(params),actors.current(a));}
 @GetMapping("/catalog") public Page<CatalogCandidate> catalog(Authentication a,@RequestParam(defaultValue="")String q,@RequestParam(defaultValue="0")int page,@RequestParam(defaultValue="20")int size){return queries.catalog(q,page,size,actors.current(a));}
 @GetMapping("/catalog-match") public MatchResult match(Authentication a,@RequestParam String title){return queries.matches(title,actors.current(a));}
 @GetMapping("/{id}") public OrderDetail detail(Authentication a,@PathVariable long id){return queries.detail(id,actors.current(a));}
 @PostMapping public ResponseEntity<MutationResult> create(Authentication a,@RequestBody JsonNode body){var result=drafts.create(decode(body,CreateRequest.class),actors.current(a));return ResponseEntity.created(URI.create("/api/v1/admin/orders/"+result.id())).body(result);}
 @PutMapping("/{id}") public MutationResult update(Authentication a,@PathVariable long id,@RequestBody JsonNode body){return drafts.update(id,decode(body,UpdateRequest.class),actors.current(a));}
 @PostMapping("/{id}/items") public MutationResult add(Authentication a,@PathVariable long id,@RequestBody JsonNode body){return drafts.addItem(id,decode(body,ItemRequest.class),actors.current(a));}
 @PatchMapping("/{id}/items/{itemId}") public MutationResult item(Authentication a,@PathVariable long id,@PathVariable long itemId,@RequestBody JsonNode body){return drafts.updateItem(id,itemId,decode(body,ItemRequest.class),actors.current(a));}
 @DeleteMapping("/{id}/items/{itemId}") public MutationResult remove(Authentication a,@PathVariable long id,@PathVariable long itemId,@RequestBody JsonNode body){return drafts.removeItem(id,itemId,decode(body,ReasonRequest.class),actors.current(a));}
 @PostMapping("/{id}/keep") public MutationResult keep(Authentication a,@PathVariable long id,@RequestBody JsonNode body){return keep.keep(id,decode(body,KeepRequest.class),actors.current(a));}
 @PostMapping("/{id}/extend-keep") public MutationResult extend(Authentication a,@PathVariable long id,@RequestBody JsonNode body){return keep.extend(id,decode(body,ExtendRequest.class),actors.current(a));}
 @PostMapping("/{id}/reopen") public MutationResult reopen(Authentication a,@PathVariable long id,@RequestBody JsonNode body){return keep.reopen(id,decode(body,ReasonRequest.class),actors.current(a));}
 @PostMapping("/{id}/cancel") public MutationResult cancel(Authentication a,@PathVariable long id,@RequestBody JsonNode body){return keep.cancel(id,decode(body,ReasonRequest.class),actors.current(a));}
 @PostMapping("/{id}/payments") public MutationResult pay(Authentication a,@PathVariable long id,@RequestBody JsonNode body){return payments.record(id,decode(body,PaymentRequest.class),actors.current(a));}
 @PostMapping("/{id}/payments/{paymentId}/void") public MutationResult voidPayment(Authentication a,@PathVariable long id,@PathVariable long paymentId,@RequestBody JsonNode body){return payments.voidPayment(id,paymentId,decode(body,ReasonRequest.class),actors.current(a));}
 @PostMapping("/{id}/finalize") public MutationResult finalizeOrder(Authentication a,@PathVariable long id,@RequestBody JsonNode body){return shipping.finalizeOrder(id,decode(body,ShippingRequest.class),actors.current(a));}
 @PatchMapping("/{id}/shipping") public MutationResult shipping(Authentication a,@PathVariable long id,@RequestBody JsonNode body){return shipping.updateShipping(id,decode(body,ShippingRequest.class),actors.current(a));}
 @PostMapping("/{id}/ship") public MutationResult ship(Authentication a,@PathVariable long id,@RequestBody JsonNode body){return shipping.ship(id,decode(body,ShipRequest.class),actors.current(a));}
 @PostMapping("/{id}/fail") public MutationResult fail(Authentication a,@PathVariable long id,@RequestBody JsonNode body){return shipping.fail(id,decode(body,ReasonRequest.class),actors.current(a));}
 @PostMapping("/{id}/resend") public MutationResult resend(Authentication a,@PathVariable long id,@RequestBody JsonNode body){return shipping.resend(id,decode(body,ShippingRequest.class),actors.current(a));}
 @PostMapping("/{id}/abort-resend") public MutationResult abortResend(Authentication a,@PathVariable long id,@RequestBody JsonNode body){return shipping.abortResend(id,decode(body,ReasonRequest.class),actors.current(a));}
 @PostMapping("/{id}/return") public MutationResult returnOrder(Authentication a,@PathVariable long id,@RequestBody JsonNode body){return shipping.returnOrder(id,decode(body,ReturnRequest.class),actors.current(a));}
 @ExceptionHandler(CatalogMatchService.ManualMatchException.class) public ResponseEntity<?> matches(CatalogMatchService.ManualMatchException e){return ResponseEntity.status(409).header("Cache-Control","no-store").body(Map.of("error",e.error,"message","Kiểm tra sách tương tự và xác nhận sách ngoài.","matches",e.matches));}
 private static OrderFilter filter(Map<String,String> p){try{return new OrderFilter(p.getOrDefault("q",""),p.getOrDefault("status","ALL"),p.get("customerId"),p.get("createdFrom"),p.get("createdTo"),p.getOrDefault("keepWarning","ALL"),Integer.parseInt(p.getOrDefault("page","0")),Integer.parseInt(p.getOrDefault("size","20")));}catch(NumberFormatException e){throw new AdminApiException(400,"invalid_request");}}
 private <T>T decode(JsonNode body,Class<T> type){strict(body);try{return db.json.readerFor(type).with(tools.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES).readValue(body.toString());}catch(tools.jackson.core.JacksonException e){throw new AdminApiException(400,"invalid_request");}}
 private static final Set<String> INTEGERS=Set.of("version","discountAmount","unitPriceVnd","quantity","unitWeightGrams","shippingFee","parcelWeightGrams","codAmount","amount","additionalShippingFee","quantityReceived","quantityRestocked");
 private static final Set<String> FLAGS=Set.of("actualConfirmed","codConfirmed","parcelWeightConfirmed","parcelWeightOverridden","allowInsufficientDeposit");
 private static final Set<String> TEXTS=Set.of("customerId","bookCopyId","itemId","requestId","transactionType","fulfillmentType","sourceType","paymentMethod","shippingPaymentType","customerPaymentMode","trackingCode","reason","recipientName","recipientPhone","shippingAddress","title","note","occurredAt","keepUntilDate","normalizedTitle","fingerprint");
 private static void strict(JsonNode n){
  if(n==null||!n.isObject())throw AdminApiException.field("body","Nội dung phải là object");
  for(String field:INTEGERS){var v=n.get(field);if(v!=null&&!v.isNull()&&(!v.isIntegralNumber()||!v.canConvertToLong()))throw AdminApiException.field(field,"Nhập số nguyên hợp lệ");}
  for(String field:FLAGS){var v=n.get(field);if(v!=null&&!v.isNull()&&!v.isBoolean())throw AdminApiException.field(field,"Giá trị xác nhận không hợp lệ");}
  for(String field:TEXTS){var v=n.get(field);if(v!=null&&!v.isNull()&&!v.isString())throw AdminApiException.field(field,"Nhập nội dung dạng chữ");}
  var items=n.get("items");if(items!=null&&!items.isNull()){if(!items.isArray()||items.size()>1000)throw AdminApiException.field("items","Tối đa1000 dòng");for(var item:items)strict(item);}
  var confirmation=n.get("matchConfirmation");if(confirmation!=null&&!confirmation.isNull())strict(confirmation);
 }
}
