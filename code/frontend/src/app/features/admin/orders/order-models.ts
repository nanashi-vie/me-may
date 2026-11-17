export type OrderStatus =
  'DRAFT' | 'KEEPING' | 'READY_TO_SHIP' | 'COMPLETED' | 'UNSUCCESSFUL' | 'CANCELLED';
export type FulfillmentType = 'IMMEDIATE' | 'KEEP';
export type PaymentType = 'DEPOSIT' | 'PAYMENT' | 'REFUND';
export type ShippingPaymentType = 'PP_CASH' | 'CC_CASH' | 'PP_PM';
export interface Page<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
export interface OrderFilter {
  q: string;
  status: OrderStatus | 'ALL';
  customerId?: string;
  createdFrom: string;
  createdTo: string;
  keepWarning: 'ALL' | 'SOON' | 'DUE' | 'OVERDUE';
  page: number;
  size: number;
}
export interface OrderStats {
  keeping: number;
  soon: number;
  due: number;
  overdue: number;
  readyToShip: number;
  completed: number;
  unsuccessful: number;
}
export interface Totals {
  subtotal: number;
  goodsTotal: number;
  orderTotal: number | null;
  paidAmount: number;
  balance: number | null;
  totalBookWeightGrams: number | null;
  provisional: boolean;
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERPAID' | 'PROVISIONAL';
}
export interface OrderSummary {
  id: string;
  orderCode: string;
  customerId: string;
  customerNameSnapshot: string;
  customerPhoneSnapshot: string | null;
  status: OrderStatus;
  fulfillmentType: FulfillmentType;
  createdAt: string;
  keepUntil: string | null;
  totalQuantity: number;
  totals: Totals;
  version: number;
  keepWarning: string;
}
export interface OrderItem {
  id: string;
  sourceType: 'CATALOG' | 'MANUAL';
  bookCopyId: string | null;
  listingId: string | null;
  bookCodeSnapshot: string | null;
  titleSnapshot: string;
  unitPriceVnd: number;
  quantity: number;
  unitWeightGrams: number | null;
  manualMatchOverrideReason: string | null;
  addedAt: string;
}
export interface OrderPayment {
  id: string;
  transactionType: PaymentType;
  amount: number;
  paymentMethod: string;
  occurredAt: string;
  note: string | null;
  createdBy: string;
  createdAt: string;
  voidedAt: string | null;
  voidReason: string | null;
}
export interface Shipment {
  id: string;
  attemptNo: number;
  state: 'PLANNED' | 'HANDED_OVER' | 'FAILED' | 'ABORTED';
  shippingSnapshot: {
    recipientName: string;
    recipientPhone: string;
    shippingAddress: string;
    shippingProvider: string;
    shippingService: string;
    shippingPaymentType: ShippingPaymentType;
    shippingFee: number;
    additionalShippingFee: number;
    parcelWeightGrams: number;
    parcelCount: number;
    codAmount: number;
    declaredValue: number;
  };
  trackingCode: string | null;
  handedOverAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
}
export interface ActionNote {
  id: string;
  operation: string;
  reason: string;
  version: number;
  actorId: string;
  createdAt: string;
  itemId: string | null;
  bookCodeSnapshot: string | null;
  titleSnapshot: string | null;
  quantityRemoved: number | null;
}
export interface OrderReturn {
  id: string;
  itemId: string;
  quantityReceived: number;
  quantityRestocked: number;
  reason: string;
  createdBy: string;
  createdAt: string;
}
export interface OrderDetail extends Omit<OrderSummary, 'keepWarning'> {
  updatedAt: string;
  keepStartedAt: string | null;
  keepExtensionCount: number;
  requiredDepositVnd: number;
  discountAmount: number;
  recipientName: string | null;
  recipientPhone: string | null;
  shippingAddress: string | null;
  shippingFee: number | null;
  parcelWeightGrams: number | null;
  parcelWeightOverridden: boolean;
  parcelWeightNeedsReview: boolean;
  codAmount: number;
  codNeedsReview: boolean;
  declaredValue: number | null;
  shippingPaymentType: ShippingPaymentType;
  trackingCode: string | null;
  items: OrderItem[];
  payments: OrderPayment[];
  shipments: Shipment[];
  notes: ActionNote[];
  returns: OrderReturn[];
  serverNow: string;
  customerCodeSnapshot: string;
}
export interface CatalogCandidate {
  id: string;
  listingId: string;
  bookCode: string;
  title: string;
  weightG: number | null;
  priceMinVnd: number | null;
  priceMaxVnd: number | null;
  stock: number;
  publication: string;
  version: number;
  coverUrl: string | null;
  salePriceVnd: number | null;
  reservedQuantity: number;
  totalStock: number;
}
export interface MatchResult {
  normalizedTitle: string;
  fingerprint: string;
  items: CatalogCandidate[];
}
export interface MatchConfirmation {
  normalizedTitle: string;
  fingerprint: string;
  reason: string;
}
export interface MutationMeta {
  version: number;
  requestId: string;
}
export interface ReasonRequest extends MutationMeta {
  reason: string | null;
}
export interface MutationResult {
  id: string;
  orderCode: string;
  version: number;
  status: OrderStatus;
}
export interface ItemWrite extends MutationMeta {
  sourceType: 'CATALOG' | 'MANUAL';
  bookCopyId: string | null;
  title: string | null;
  unitPriceVnd: number;
  quantity: number;
  unitWeightGrams: number | null;
  matchConfirmation: MatchConfirmation | null;
  reason?: string | null;
}
export type OrderAction =
  | 'keep'
  | 'extend-keep'
  | 'reopen'
  | 'cancel'
  | 'payments'
  | 'finalize'
  | 'shipping'
  | 'ship'
  | 'fail'
  | 'resend'
  | 'abort-resend'
  | 'return';
export const STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: 'Nháp',
  KEEPING: 'Đang keep',
  READY_TO_SHIP: 'Chờ giao',
  COMPLETED: 'Hoàn tất',
  UNSUCCESSFUL: 'Không thành công',
  CANCELLED: 'Đã hủy / hoàn đơn',
};
export const WARNING_LABELS: Record<string, string> = {
  SOON: 'Sắp hết hạn',
  DUE: 'Đến hạn hôm nay',
  OVERDUE: 'Đã quá hạn',
};
export const defaultOrderFilter = (): OrderFilter => ({
  q: '',
  status: 'ALL',
  createdFrom: '',
  createdTo: '',
  keepWarning: 'ALL',
  page: 0,
  size: 20,
});
