import { Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VndInput } from '../../books/vnd-input';
import { CustomerPaymentMode, OrderDetail, ShippingPaymentType } from '../order-models';
import { integer, vnd } from '../order-values';
export interface ShippingDraft {
  customerPaymentMode: CustomerPaymentMode | null;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  shippingFee: number | null;
  parcelWeightGrams: number | null;
  parcelWeightOverridden: boolean;
  parcelWeightConfirmed: boolean;
  codAmount: number | null;
  codConfirmed: boolean;
  shippingPaymentType: ShippingPaymentType;
  trackingCode: string | null;
  additionalShippingFee: number | null;
  reason: string | null;
}
/** Completed or returned: the bill can be read but not changed. */
const finished = (o: OrderDetail) =>
  o.status === 'COMPLETED' || (o.status === 'CANCELLED' && o.returns?.length > 0);
/** Packaging allowance on top of the books; the owner can still type the real weight. */
const PACKAGING_GRAMS = 1000;
const grams = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + ' g';
@Component({
  selector: 'app-order-shipping-form',
  imports: [FormsModule, VndInput],
  templateUrl: './order-shipping-form.html',
  styleUrl: '../orders.scss',
})
export class OrderShippingForm {
  private order: OrderDetail | null = null;
  private initial = '';
  readonly refreshRequested = output<void>();
  readonly conflict = signal(false);
  readonly refreshing = signal(false);
  readonly retry = output<void>();
  readonly saved = output<ShippingDraft>();
  /** Everything typed so far, saved or not, so the bill beside the form can follow it. */
  readonly changed = output<ShippingDraft>();
  /** A completed or returned order: the bill can be read but not changed. */
  readonly readOnly = signal(false);
  /** The form renders only once it holds an order, so its first paint shows real values. */
  readonly loaded = signal(false);
  readonly locked = signal(false);
  readonly error = signal('');
  readonly money = vnd;
  mode: 'finalize' | 'shipping' = 'finalize';
  model: ShippingDraft = {
    customerPaymentMode: 'RECIPIENT',
    recipientName: '',
    recipientPhone: '',
    shippingAddress: '',
    shippingFee: null,
    parcelWeightGrams: null,
    parcelWeightOverridden: false,
    parcelWeightConfirmed: false,
    codAmount: 0,
    codConfirmed: false,
    shippingPaymentType: 'PP_CASH',
    trackingCode: null,
    additionalShippingFee: 0,
    reason: null,
  };
  /** Fills the form from the saved order; the mode follows the order's state. */
  load(order: OrderDetail) {
    this.readOnly.set(finished(order));
    const mode = order.status === 'DRAFT' || order.status === 'KEEPING' ? 'finalize' : 'shipping';
    this.order = order;
    this.mode = mode;
    this.model = {
      customerPaymentMode: order.customerPaymentMode ?? (mode === 'finalize' ? 'RECIPIENT' : null),
      recipientName: order.recipientName ?? '',
      recipientPhone: order.recipientPhone ?? '',
      shippingAddress: order.shippingAddress ?? '',
      shippingFee: order.shippingFee,
      parcelWeightGrams: mode === 'shipping' ? order.parcelWeightGrams : this.suggestedWeight(),
      parcelWeightOverridden: true,
      parcelWeightConfirmed: false,
      codAmount: order.codAmount,
      codConfirmed: false,
      shippingPaymentType: order.shippingPaymentType ?? 'PP_CASH',
      trackingCode: order.trackingCode,
      additionalShippingFee: 0,
      reason: null,
    };
    this.error.set('');
    this.conflict.set(false);
    this.refreshing.set(false);
    this.reviewRequired = false;
    this.manualWeight = mode === 'shipping';
    this.manualCod = mode !== 'finalize';
    this.suggestCod();
    this.initial = JSON.stringify(this.model);
    this.loaded.set(true);
    this.emitChange();
  }
  emitChange() {
    this.changed.emit({ ...this.model });
  }
  /** Back to what is saved on the order, dropping what was typed. */
  undo() {
    if (this.order) this.load(this.order);
  }
  rebase(order: OrderDetail) {
    if (finished(order)) {
      // Finished elsewhere: nothing typed can be saved any more, so show what was saved.
      this.load(order);
      return;
    }
    this.reviewRequired = true;
    this.order = order;
    this.conflict.set(false);
    this.error.set('');
    this.model.codConfirmed = false;
    this.model.parcelWeightConfirmed = false;
    if (!this.manualWeight) this.model.parcelWeightGrams = this.suggestedWeight();
    this.suggestCod();
    if (!this.allowed())
      this.error.set(
        'Trạng thái đơn đã đổi. Thông tin đang nhập được giữ để kiểm tra.',
      );
    this.emitChange();
  }
  private allowed() {
    const s = this.order?.status;
    return this.mode === 'shipping' ? s === 'READY_TO_SHIP' : s === 'DRAFT' || s === 'KEEPING';
  }
  declaredValue() {
    return this.order?.totals.goodsTotal ?? 0;
  }
  billTotal() {
    const fee = this.model.shippingFee;
    const n = fee === null ? NaN : this.declaredValue() + fee;
    return Number.isSafeInteger(n) ? n : null;
  }
  received() {
    return this.order?.totals.paidAmount ?? 0;
  }
  balance() {
    const total = this.billTotal();
    return total === null ? null : total - (this.order?.totals.paidAmount ?? 0);
  }
  readonly paymentRequested = output<void>();
  reviewRequired = false;
  manualCod = false;
  manualWeight = false;
  private suggestedWeight() {
    const books = this.order?.totals.totalBookWeightGrams;
    return integer(books, 1) && integer(books + PACKAGING_GRAMS, 1) ? books + PACKAGING_GRAMS : null;
  }
  weightHint() {
    const suggested = this.suggestedWeight();
    if (this.mode === 'shipping') return '';
    return suggested === null
      ? 'Chưa đủ trọng lượng sách, nhập số cân thật'
      : `Sách ${grams(suggested - PACKAGING_GRAMS)} + ${grams(PACKAGING_GRAMS)} đóng gói`;
  }
  suggestCod() {
    if (this.model.customerPaymentMode === 'MONTHLY') this.model.codAmount = 0;
    else if (!this.manualCod) this.model.codAmount = Math.max(0, this.balance() ?? 0);
  }
  valid() {
    if (!this.allowed()) return false;
    const m = this.model;
    return (
      !!m.customerPaymentMode &&
      !this.reviewRequired &&
      !!m.recipientName.trim() &&
      !!m.recipientPhone.trim() &&
      !!m.shippingAddress.trim() &&
      integer(m.shippingFee) &&
      integer(m.parcelWeightGrams, 1) &&
      integer(m.codAmount) &&
      (m.customerPaymentMode !== 'MONTHLY' || (this.balance() ?? 1) <= 0) &&
      this.billTotal() !== null
    );
  }
  submit() {
    if (!this.valid() || this.locked()) return;
    this.saved.emit({
      ...this.model,
      codConfirmed: true,
      parcelWeightConfirmed: true,
      recipientName: this.model.recipientName.trim(),
      recipientPhone: this.model.recipientPhone.trim(),
      shippingAddress: this.model.shippingAddress.trim(),
      shippingFee: this.model.shippingFee,
      additionalShippingFee: null,
    });
  }
  dirty() {
    return !!this.order && !this.readOnly() && this.initial !== JSON.stringify(this.model);
  }
}
