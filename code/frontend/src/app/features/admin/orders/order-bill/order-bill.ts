import { Component, computed, input, linkedSignal } from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { OrderDetail } from '../order-models';
import { vnd } from '../order-values';
import type { ShippingDraft } from '../order-shipping-form/order-shipping-form';
/** Lines that fit one screenshot on a 1440×800 screen together with the totals. */
const LINES_PER_PAGE = 12;
export type BillDraft = Pick<ShippingDraft, 'recipientName' | 'recipientPhone' | 'shippingAddress' | 'shippingFee'>;
/** What the shop screenshots for the customer: contact and money only, nothing internal. */
@Component({
  selector: 'app-order-bill',
  imports: [DatePipe, NgTemplateOutlet],
  templateUrl: './order-bill.html',
  styleUrl: './order-bill.scss',
})
export class OrderBill {
  readonly order = input.required<OrderDetail>();
  /** What the bill form holds right now, saved or not; null before the form loads. */
  readonly draft = input.required<BillDraft | null>();
  readonly dirty = input(false);
  readonly money = vnd;
  /** Back to the first page whenever the number of books changes. */
  private readonly index = linkedSignal({ source: () => this.order().items.length, computation: () => 0 });
  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.order().items.length / LINES_PER_PAGE)),
  );
  readonly page = computed(() => Math.min(this.index(), this.pageCount() - 1));
  readonly lines = computed(() =>
    this.order().items.slice(this.page() * LINES_PER_PAGE, (this.page() + 1) * LINES_PER_PAGE),
  );
  /** STT keeps counting across pages. */
  readonly firstNumber = computed(() => this.page() * LINES_PER_PAGE + 1);
  readonly isLast = computed(() => this.page() === this.pageCount() - 1);
  readonly fee = computed(() => this.draft()?.shippingFee ?? null);
  /** A fee is entered: the bill shows shipping; otherwise it is provisional on the books. */
  readonly billed = computed(() => this.fee() !== null);
  readonly total = computed(() => this.order().totals.goodsTotal + (this.fee() ?? 0));
  readonly balance = computed(() => this.total() - this.order().totals.paidAmount);
  readonly name = computed(
    () => this.draft()?.recipientName?.trim() || this.order().recipientName || this.order().customerNameSnapshot,
  );
  readonly phone = computed(
    () => this.draft()?.recipientPhone.trim() || this.order().customerPhoneSnapshot || '',
  );
  readonly address = computed(
    () => this.draft()?.shippingAddress.trim() || this.order().shippingAddress || '',
  );
  go(step: 1 | -1) {
    this.index.set(this.page() + step);
  }
}
