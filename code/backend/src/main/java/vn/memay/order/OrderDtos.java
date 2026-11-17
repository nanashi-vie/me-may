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
  List<OrderItem> items,List<OrderPayment> payments,List<Shipment> shipments,Totals totals,long totalQuantity,Instant serverNow){}
 public record OrderSummary(String id,String orderCode,String customerId,String customerNameSnapshot,String customerPhoneSnapshot,Status status,String fulfillmentType,
  Instant createdAt,Instant keepUntil,long totalQuantity,Totals totals,long version,String keepWarning){}
 public record OrderFilter(String q,String status,String customerId,String createdFrom,String createdTo,String keepWarning,int page,int size){}
 public record OrderStats(long keeping,long soon,long due,long overdue,long readyToShip,long completed,long unsuccessful){}
 public record Page<T>(List<T> items,int page,int size,long totalElements,long totalPages){}
 public record CatalogCandidate(String id,String listingId,String bookCode,String title,Long weightG,Long priceMinVnd,Long priceMaxVnd,long stock,String publication,long version,String coverUrl){}
 public record MatchResult(String normalizedTitle,String fingerprint,List<CatalogCandidate> items){}
 public record MatchConfirmation(String normalizedTitle,String fingerprint,String reason){}
}
