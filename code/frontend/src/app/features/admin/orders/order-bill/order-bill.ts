import { Component, ElementRef, computed, input, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { OrderDetail } from '../order-models';
import { vnd } from '../order-values';
/** Lines that fit one screenshot on a 1440×800 screen together with the totals. */
const LINES_PER_PAGE = 12;
/** What the shop screenshots for the customer: nothing internal or about delivery belongs here. */
@Component({
  selector: 'app-order-bill',
  imports: [DatePipe],
  templateUrl: './order-bill.html',
  styleUrl: './order-bill.scss',
})
export class OrderBill {
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private opener: HTMLElement | null = null;
  readonly order = input.required<OrderDetail>();
  /** False until a bill is saved, or after it is reopened: shipping may still change. */
  readonly billed = input.required<boolean>();
  readonly visible = signal(false);
  private readonly index = signal(0);
  readonly money = vnd;
  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.order().items.length / LINES_PER_PAGE)),
  );
  readonly page = computed(() => Math.min(this.index(), this.pageCount() - 1));
  readonly lines = computed(() =>
    this.order().items.slice(this.page() * LINES_PER_PAGE, (this.page() + 1) * LINES_PER_PAGE),
  );
  readonly isLast = computed(() => this.page() === this.pageCount() - 1);
  readonly total = computed(() => {
    const t = this.order().totals;
    return this.billed() ? t.orderTotal : t.goodsTotal;
  });
  readonly balance = computed(() => {
    const t = this.order().totals;
    return this.billed() ? t.balance : t.goodsTotal - t.paidAmount;
  });
  open() {
    this.opener = document.activeElement as HTMLElement;
    this.index.set(0);
    this.visible.set(true);
    this.dialog()?.nativeElement.showModal?.();
  }
  go(step: 1 | -1) {
    this.index.set(this.page() + step);
  }
  close(event?: Event) {
    event?.preventDefault();
    this.visible.set(false);
    this.dialog()?.nativeElement.close?.();
    this.opener?.focus();
  }
}
