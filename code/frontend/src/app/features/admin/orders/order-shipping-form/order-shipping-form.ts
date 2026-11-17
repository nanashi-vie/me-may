import { Component, ElementRef, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VndInput } from '../../books/vnd-input';
import { OrderDetail, ShippingPaymentType } from '../order-models';
import { integer, vnd } from '../order-values';
export interface ShippingDraft {
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
@Component({
  selector: 'app-order-shipping-form',
  imports: [FormsModule, VndInput],
  templateUrl: './order-shipping-form.html',
  styleUrl: '../orders.scss',
})
export class OrderShippingForm {
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private opener: HTMLElement | null = null;
  private order: OrderDetail | null = null;
  private initial = '';
  readonly refreshRequested = output<void>();
  readonly conflict = signal(false);
  readonly refreshing = signal(false);
  readonly retry = output<void>();
  readonly saved = output<ShippingDraft>();
  readonly visible = signal(false);
  readonly locked = signal(false);
  readonly error = signal('');
  readonly money = vnd;
  mode: 'finalize' | 'shipping' | 'resend' = 'finalize';
  model: ShippingDraft = {
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
  open(order: OrderDetail, mode: typeof this.mode) {
    this.order = order;
    this.mode = mode;
    this.model = {
      recipientName: order.recipientName ?? '',
      recipientPhone: order.recipientPhone ?? '',
      shippingAddress: order.shippingAddress ?? '',
      shippingFee: order.shippingFee,
      parcelWeightGrams: order.parcelWeightOverridden
        ? order.parcelWeightGrams
        : order.totals.totalBookWeightGrams,
      parcelWeightOverridden: order.parcelWeightOverridden,
      parcelWeightConfirmed: false,
      codAmount: order.codAmount,
      codConfirmed: false,
      shippingPaymentType: order.shippingPaymentType ?? 'PP_CASH',
      trackingCode: mode === 'resend' ? null : order.trackingCode,
      additionalShippingFee: 0,
      reason: null,
    };
    this.error.set('');
    this.conflict.set(false);
    this.refreshing.set(false);
    this.initial = JSON.stringify(this.model);
    this.opener = document.activeElement as HTMLElement;
    this.visible.set(true);
    this.dialog()?.nativeElement.showModal?.();
  }
  rebase(order: OrderDetail) {
    this.order = order;
    this.conflict.set(false);
    this.error.set('');
    this.model.codConfirmed = false;
    this.model.parcelWeightConfirmed = false;
    if (!this.model.parcelWeightOverridden)
      this.model.parcelWeightGrams = order.totals.totalBookWeightGrams;
    if (!this.allowed())
      this.error.set(
        'Trạng thái đơn đã đổi. Thông tin đang nhập được giữ để kiểm tra trước khi đóng.',
      );
  }
  private allowed() {
    const s = this.order?.status;
    return this.mode === 'resend'
      ? s === 'UNSUCCESSFUL'
      : this.mode === 'shipping'
        ? s === 'READY_TO_SHIP'
        : s === 'DRAFT' || s === 'KEEPING';
  }
  declaredValue() {
    return this.order?.totals.goodsTotal ?? 0;
  }
  billTotal() {
    const fee =
      this.mode === 'resend'
        ? (this.order?.shippingFee ?? 0) + (this.model.additionalShippingFee ?? 0)
        : this.model.shippingFee;
    const n = fee === null ? NaN : this.declaredValue() + fee;
    return Number.isSafeInteger(n) ? n : null;
  }
  balance() {
    const total = this.billTotal();
    return total === null ? null : total - (this.order?.totals.paidAmount ?? 0);
  }
  weightChanged() {
    if (
      !this.model.parcelWeightOverridden &&
      !window.confirm('Bỏ trọng lượng nhập tay và dùng lại tổng trọng lượng sách?')
    ) {
      this.model.parcelWeightOverridden = true;
      return;
    }
    this.model.parcelWeightConfirmed = false;
    if (!this.model.parcelWeightOverridden)
      this.model.parcelWeightGrams = this.order?.totals.totalBookWeightGrams ?? null;
  }
  valid() {
    if (!this.allowed()) return false;
    const m = this.model;
    return (
      !!m.recipientName.trim() &&
      !!m.recipientPhone.trim() &&
      !!m.shippingAddress.trim() &&
      integer(this.mode === 'resend' ? m.additionalShippingFee : m.shippingFee) &&
      integer(m.parcelWeightGrams, 1) &&
      integer(m.codAmount) &&
      m.codConfirmed &&
      (!m.parcelWeightOverridden || m.parcelWeightConfirmed) &&
      (!this.order?.parcelWeightNeedsReview || m.parcelWeightConfirmed) &&
      (this.mode !== 'resend' || !!m.reason?.trim()) &&
      this.billTotal() !== null
    );
  }
  submit() {
    if (!this.valid() || this.locked()) return;
    this.saved.emit({
      ...this.model,
      recipientName: this.model.recipientName.trim(),
      recipientPhone: this.model.recipientPhone.trim(),
      shippingAddress: this.model.shippingAddress.trim(),
      shippingFee: this.mode === 'resend' ? null : this.model.shippingFee,
      additionalShippingFee: this.mode === 'resend' ? this.model.additionalShippingFee : null,
    });
  }
  close() {
    this.visible.set(false);
    this.dialog()?.nativeElement.close?.();
    this.opener?.focus();
  }
  dirty() {
    return this.visible() && this.initial !== JSON.stringify(this.model);
  }
  requestClose() {
    if (this.locked() || this.refreshing()) return false;
    if (this.dirty() && !window.confirm('Bỏ thông tin giao hàng chưa lưu?')) return false;
    this.close();
    return true;
  }
  escape(e: Event) {
    e.preventDefault();
    this.requestClose();
  }
}
