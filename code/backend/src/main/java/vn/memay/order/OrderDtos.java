package vn.memay.order;
import java.time.Instant;
import java.util.*;
public final class OrderDtos {
 private OrderDtos(){}
 public enum Status {DRAFT,KEEPING,READY_TO_SHIP,COMPLETED,UNSUCCESSFUL,CANCELLED}
 public enum PaymentType {DEPOSIT,PAYMENT,REFUND}
 public record MutationMeta(Long version,UUID requestId){}
 public record MutationResult(String id,String orderCode,long version,Status status){}
 public record ItemValue(Long unitPriceVnd,long quantity,Long unitWeightGrams){}
 public record PaymentValue(PaymentType type,long amount,boolean voided){}
 public record Totals(long subtotal,long goodsTotal,Long orderTotal,long paidAmount,Long balance,Long totalBookWeightGrams,boolean provisional,String paymentStatus){}
 public record OrderItem(String id,String sourceType,String bookCopyId,String listingId,String bookCodeSnapshot,String titleSnapshot,long unitPriceVnd,long quantity,Long unitWeightGrams,String manualMatchOverrideReason,Instant addedAt){
  public ItemValue value(){return new ItemValue(unitPriceVnd,quantity,unitWeightGrams);}
 }
 public record OrderPayment(String id,PaymentType transactionType,long amount,String paymentMethod,Instant occurredAt,String note,String createdBy,Instant createdAt,Instant voidedAt,String voidReason){
  public PaymentValue value(){return new PaymentValue(transactionType,amount,voidedAt!=null);}
 }
 public record Shipment(String id,int attemptNo,String state,Map<String,Object> shippingSnapshot,String trackingCode,Instant handedOverAt,Instant failedAt,String failureReason){}
 public record OrderDetail(String id,String orderCode,String customerId,String customerCodeSnapshot,String customerNameSnapshot,String customerPhoneSnapshot,
  Status status,String fulfillmentType,long version,Instant createdAt,Instant updatedAt,Instant keepStartedAt,Instant keepUntil,int keepExtensionCount,
  long requiredDepositVnd,long discountAmount,String recipientName,String recipientPhone,String shippingAddress,Long shippingFee,Long parcelWeightGrams,
  boolean parcelWeightOverridden,boolean parcelWeightNeedsReview,long codAmount,boolean codNeedsReview,Long declaredValue,String shippingPaymentType,String trackingCode,
  List<OrderItem> items,List<OrderPayment> payments,List<Shipment> shipments,List<ActionNote> notes,List<OrderReturn> returns,Totals totals,long totalQuantity,Instant serverNow){}
 public record OrderSummary(String id,String orderCode,String customerId,String customerNameSnapshot,String customerPhoneSnapshot,Status status,String fulfillmentType,
  Instant createdAt,Instant keepUntil,long totalQuantity,Totals totals,long version,String keepWarning){}
 public record OrderFilter(String q,String status,String customerId,String createdFrom,String createdTo,String keepWarning,int page,int size){}
 public record OrderStats(long keeping,long soon,long due,long overdue,long readyToShip,long completed,long unsuccessful){}
 public record Page<T>(List<T> items,int page,int size,long totalElements,long totalPages){}
 public record CatalogCandidate(String id,String listingId,String bookCode,String title,Long weightG,Long priceMinVnd,Long priceMaxVnd,long stock,String publication,long version,String coverUrl,Long salePriceVnd,long reservedQuantity,long totalStock){}
 public record MatchResult(String normalizedTitle,String fingerprint,List<CatalogCandidate> items){}
 public record MatchConfirmation(String normalizedTitle,String fingerprint,String reason){}
 public record CreateRequest(String customerId,String fulfillmentType,UUID requestId){public MutationMeta meta(){return new MutationMeta(null,requestId);}}
 public record UpdateRequest(Long version,UUID requestId,String customerId,String fulfillmentType,Long discountAmount,String recipientName,String recipientPhone,String shippingAddress,Long shippingFee,Long parcelWeightGrams,Boolean parcelWeightOverridden){public MutationMeta meta(){return new MutationMeta(version,requestId);}}
 public record ItemRequest(Long version,UUID requestId,String sourceType,String bookCopyId,String title,Long unitPriceVnd,Long quantity,Long unitWeightGrams,MatchConfirmation matchConfirmation,String reason){
  public ItemRequest(Long version,UUID requestId,String sourceType,String bookCopyId,String title,Long unitPriceVnd,Long quantity,Long unitWeightGrams,MatchConfirmation matchConfirmation){this(version,requestId,sourceType,bookCopyId,title,unitPriceVnd,quantity,unitWeightGrams,matchConfirmation,null);}
  public MutationMeta meta(){return new MutationMeta(version,requestId);}
 }

 public record ActionNote(String id,String operation,String reason,long version,String actorId,Instant createdAt,String itemId,String bookCodeSnapshot,String titleSnapshot,Long quantityRemoved){}
 public record KeepRequest(Long version,UUID requestId,Boolean allowInsufficientDeposit,String reason){public MutationMeta meta(){return new MutationMeta(version,requestId);}}
 public record ExtendRequest(Long version,UUID requestId,String keepUntilDate,String reason){public MutationMeta meta(){return new MutationMeta(version,requestId);}}
 public record ReasonRequest(Long version,UUID requestId,String reason){public MutationMeta meta(){return new MutationMeta(version,requestId);}}

 public record PaymentRequest(Long version,UUID requestId,PaymentType transactionType,Long amount,String paymentMethod,Instant occurredAt,String note,Boolean actualConfirmed){public MutationMeta meta(){return new MutationMeta(version,requestId);}}

 public record ShippingRequest(Long version,UUID requestId,String recipientName,String recipientPhone,String shippingAddress,Long shippingFee,Long parcelWeightGrams,Boolean parcelWeightOverridden,Boolean parcelWeightConfirmed,Long codAmount,Boolean codConfirmed,String shippingPaymentType,String trackingCode,Long additionalShippingFee,String reason){public MutationMeta meta(){return new MutationMeta(version,requestId);}}
 public record ShipRequest(Long version,UUID requestId,String trackingCode){public MutationMeta meta(){return new MutationMeta(version,requestId);}}
 public record ReturnItem(String itemId,Long quantityReceived,Long quantityRestocked,String reason){}
 public record ReturnRequest(Long version,UUID requestId,String reason,Boolean actualConfirmed,List<ReturnItem> items){public MutationMeta meta(){return new MutationMeta(version,requestId);}}
 public record OrderReturn(String id,String itemId,long quantityReceived,long quantityRestocked,String reason,String createdBy,Instant createdAt){}

}
