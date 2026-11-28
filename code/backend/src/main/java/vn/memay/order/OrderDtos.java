package vn.memay.order;
import java.time.Instant;
import java.util.*;
public final class OrderDtos {
 private OrderDtos(){}
 public enum Status {DRAFT,KEEPING,READY_TO_SHIP,COMPLETED,CANCELLED}
 public enum PaymentType {DEPOSIT,REFUND}
 /** Admin list tabs: which orders they hold and what comes first. The id tie-break keeps paging stable. */
 public enum Group {
  ALL("","o.created_at desc,o.id desc"),
  ACTION("o.status='DRAFT'","o.created_at,o.id"),
  PACKING("o.status='READY_TO_SHIP'","o.created_at,o.id"),
  KEEPING("o.status='KEEPING'","o.keep_until nulls last,o.id"),
  COMPLETED("o.status='COMPLETED'","o.completed_at desc nulls last,o.id desc"),
  CLOSED("o.status='CANCELLED'","o.cancelled_at desc nulls last,o.id desc");
  final String condition,order;
  Group(String condition,String order){this.condition=condition;this.order=order;}
 }
 public record MutationMeta(Long version,UUID requestId){}
 public record MutationResult(String id,String orderCode,long version,Status status){}
 public record ItemValue(Long unitPriceVnd,long quantity,Long unitWeightGrams){}
 public record PaymentValue(PaymentType type,long amount,boolean voided){}
 public record Totals(long subtotal,long goodsTotal,Long orderTotal,long paidAmount,Long balance,Long totalBookWeightGrams,boolean provisional,String paymentStatus){}
 public record OrderItem(String id,String sourceType,String bookCopyId,String listingId,String bookCodeSnapshot,String titleSnapshot,long unitPriceVnd,long quantity,Long unitWeightGrams,String manualMatchOverrideReason,Instant addedAt,String coverUrl,java.time.LocalDate soldOn,String lotLabel){
  public OrderItem(String id,String sourceType,String bookCopyId,String listingId,String bookCodeSnapshot,String titleSnapshot,long unitPriceVnd,long quantity,Long unitWeightGrams,String manualMatchOverrideReason,Instant addedAt,String coverUrl){this(id,sourceType,bookCopyId,listingId,bookCodeSnapshot,titleSnapshot,unitPriceVnd,quantity,unitWeightGrams,manualMatchOverrideReason,addedAt,coverUrl,addedAt==null?null:addedAt.atZone(OrderValidation.ZONE).toLocalDate(),null);}
  public ItemValue value(){return new ItemValue(unitPriceVnd,quantity,unitWeightGrams);}
 }
 public record OrderPayment(String id,PaymentType transactionType,long amount,Instant occurredAt,String note,String createdBy,Instant createdAt,Instant voidedAt,String voidReason,boolean hasProof){
  public PaymentValue value(){return new PaymentValue(transactionType,amount,voidedAt!=null);}
 }
 public record Shipment(String id,int attemptNo,String state,Map<String,Object> shippingSnapshot,String trackingCode,Instant handedOverAt,Instant failedAt,String failureReason,Instant createdAt){}
 public record OrderDetail(String id,String orderCode,String customerId,String customerCodeSnapshot,String customerNameSnapshot,String customerPhoneSnapshot,
  Status status,String fulfillmentType,long version,Instant createdAt,Instant updatedAt,Instant keepStartedAt,Instant keepUntil,int keepExtensionCount,
  long requiredDepositVnd,long discountAmount,String recipientName,String recipientPhone,String shippingAddress,Long shippingFee,Long parcelWeightGrams,
  boolean parcelWeightOverridden,boolean parcelWeightNeedsReview,long codAmount,boolean codNeedsReview,Long declaredValue,String shippingPaymentType,String customerPaymentMode,String trackingCode,String shippingProvider,
  List<OrderItem> items,List<OrderPayment> payments,List<Shipment> shipments,List<ActionNote> notes,List<OrderReturn> returns,Totals totals,long totalQuantity,Instant serverNow,Instant completedAt,Instant cancelledAt,CustomerChannel customerChannel){}
 public record OrderSummary(String id,String orderCode,String customerId,String customerNameSnapshot,String customerPhoneSnapshot,Status status,String fulfillmentType,
  Instant createdAt,Instant keepUntil,long totalQuantity,Totals totals,long version,String keepWarning,boolean trashable,boolean returned,Instant completedAt,Instant cancelledAt,CustomerChannel customerChannel){}
 /** One contact handle for the list, TikTok first, then Threads, then Zalo; read from the live profile. */
 public record CustomerChannel(String type,String value){}
 public record OrderFilter(String q,String status,String customerId,String createdFrom,String createdTo,String keepWarning,int page,int size,String group){}
 public record OrderStats(long keeping,long soon,long due,long overdue,long readyToShip,long completed,long draft,long cancelled,long returned){}
 public record Page<T>(List<T> items,int page,int size,long totalElements,long totalPages){}
 public record CatalogCandidate(String id,String listingId,String bookCode,String title,Long weightG,Long priceMinVnd,Long priceMaxVnd,long stock,String publication,long version,String coverUrl,Long salePriceVnd,long reservedQuantity,long totalStock,boolean exact){
  public CatalogCandidate asExact(){return new CatalogCandidate(id,listingId,bookCode,title,weightG,priceMinVnd,priceMaxVnd,stock,publication,version,coverUrl,salePriceVnd,reservedQuantity,totalStock,true);}
 }
 public record MatchResult(String normalizedTitle,String fingerprint,List<CatalogCandidate> items){}
 public record MatchConfirmation(String normalizedTitle,String fingerprint,String reason){}
 public record CreateRequest(String customerId,String fulfillmentType,UUID requestId){public MutationMeta meta(){return new MutationMeta(null,requestId);}}
 public record UpdateRequest(Long version,UUID requestId,String customerId,String fulfillmentType,Long discountAmount,String recipientName,String recipientPhone,String shippingAddress,Long shippingFee,Long parcelWeightGrams,Boolean parcelWeightOverridden){public MutationMeta meta(){return new MutationMeta(version,requestId);}}
 public record ItemRequest(Long version,UUID requestId,String sourceType,String bookCopyId,String title,Long unitPriceVnd,Long quantity,Long unitWeightGrams,MatchConfirmation matchConfirmation,String reason,String soldOn,String lotLabel){
  public ItemRequest(Long version,UUID requestId,String sourceType,String bookCopyId,String title,Long unitPriceVnd,Long quantity,Long unitWeightGrams,MatchConfirmation matchConfirmation){this(version,requestId,sourceType,bookCopyId,title,unitPriceVnd,quantity,unitWeightGrams,matchConfirmation,null,null,null);}
  public ItemRequest(Long version,UUID requestId,String sourceType,String bookCopyId,String title,Long unitPriceVnd,Long quantity,Long unitWeightGrams,MatchConfirmation matchConfirmation,String reason){this(version,requestId,sourceType,bookCopyId,title,unitPriceVnd,quantity,unitWeightGrams,matchConfirmation,reason,null,null);}
  public ItemRequest(Long version,UUID requestId,String sourceType,String bookCopyId,String title,Long unitPriceVnd,Long quantity,Long unitWeightGrams,MatchConfirmation matchConfirmation,String reason,String soldOn){this(version,requestId,sourceType,bookCopyId,title,unitPriceVnd,quantity,unitWeightGrams,matchConfirmation,reason,soldOn,null);}
  public MutationMeta meta(){return new MutationMeta(version,requestId);}
 }

 public record ActionNote(String id,String operation,String reason,long version,String actorId,Instant createdAt,String itemId,String bookCodeSnapshot,String titleSnapshot,Long quantityRemoved){}
 public record KeepRequest(Long version,UUID requestId,Boolean allowInsufficientDeposit,String reason){public MutationMeta meta(){return new MutationMeta(version,requestId);}}
 public record ExtendRequest(Long version,UUID requestId,String keepUntilDate,String reason){public MutationMeta meta(){return new MutationMeta(version,requestId);}}
 public record ReasonRequest(Long version,UUID requestId,String reason){public MutationMeta meta(){return new MutationMeta(version,requestId);}}

 /** Without a receipt image the note must say why (owner 27/11/2026). */
 public record PaymentRequest(Long version,UUID requestId,PaymentType transactionType,Long amount,String note,Boolean actualConfirmed){public MutationMeta meta(){return new MutationMeta(version,requestId);}}

 /** shippingProvider JNT, SPX or PICKUP; null keeps the order's carrier. */
 public record ShippingRequest(Long version,UUID requestId,String recipientName,String recipientPhone,String shippingAddress,Long shippingFee,Long parcelWeightGrams,Boolean parcelWeightOverridden,Boolean parcelWeightConfirmed,Long codAmount,Boolean codConfirmed,String shippingPaymentType,String customerPaymentMode,String trackingCode,Long additionalShippingFee,String reason,String shippingProvider){
  public ShippingRequest(Long version,UUID requestId,String recipientName,String recipientPhone,String shippingAddress,Long shippingFee,Long parcelWeightGrams,Boolean parcelWeightOverridden,Boolean parcelWeightConfirmed,Long codAmount,Boolean codConfirmed,String shippingPaymentType,String customerPaymentMode,String trackingCode,Long additionalShippingFee,String reason){this(version,requestId,recipientName,recipientPhone,shippingAddress,shippingFee,parcelWeightGrams,parcelWeightOverridden,parcelWeightConfirmed,codAmount,codConfirmed,shippingPaymentType,customerPaymentMode,trackingCode,additionalShippingFee,reason,null);}
  public MutationMeta meta(){return new MutationMeta(version,requestId);}
 }
 /** shippingProvider may switch between JNT and SPX at handover; null keeps the order's carrier. */
 public record ShipRequest(Long version,UUID requestId,String trackingCode,String shippingProvider){
  public ShipRequest(Long version,UUID requestId,String trackingCode){this(version,requestId,trackingCode,null);}
  public MutationMeta meta(){return new MutationMeta(version,requestId);}
 }
 public record ReturnItem(String itemId,Long quantityReceived,Long quantityRestocked,String reason){}
 public record ReturnRequest(Long version,UUID requestId,String reason,Boolean actualConfirmed,List<ReturnItem> items){public MutationMeta meta(){return new MutationMeta(version,requestId);}}
 public record OrderReturn(String id,String itemId,long quantityReceived,long quantityRestocked,String reason,String createdBy,Instant createdAt){}

}
