import { Pagination } from '../../../../shared/pagination/pagination';
import {
  Component,
  DestroyRef,
  ElementRef,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, of, switchMap, timer } from 'rxjs';
import { VndInput } from '../../books/vnd-input';
import { OrderApi } from '../order-api';
import {
  CatalogCandidate,
  ItemWrite,
  MatchResult,
  OrderDetail,
  OrderItem,
  Page,
} from '../order-models';
import { integer, product, vnd } from '../order-values';
type ItemDraft = Omit<ItemWrite, 'version' | 'requestId'>;
@Component({
  selector: 'app-order-item-form',
  imports: [Pagination, FormsModule, VndInput],
  templateUrl: './order-item-form.html',
  styleUrl: '../orders.scss',
})
export class OrderItemForm {
  private readonly api = inject(OrderApi);
  private readonly destroy = inject(DestroyRef);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private opener: HTMLElement | null = null;
  readonly refreshRequested = output<void>();
  readonly conflict = signal(false);
  readonly refreshing = signal(false);
  readonly retry = output<void>();
  readonly saved = output<ItemDraft>();
  readonly visible = signal(false);
  readonly locked = signal(false);
  readonly error = signal('');
  readonly searching = signal(false);
  readonly money = vnd;
  private readonly titles = new Subject<string>();
  private readonly queries = new Subject<{ q: string; page: number }>();
  private order: OrderDetail | null = null;
  item: OrderItem | null = null;
  q = '';
  page = 0;
  catalog: Page<CatalogCandidate> | null = null;
  match: MatchResult | null = null;
  model = {
    sourceType: 'CATALOG' as 'CATALOG' | 'MANUAL',
    bookCopyId: null as string | null,
    title: '',
    unitPriceVnd: null as number | null,
    quantity: 1 as number | null,
    unitWeightGrams: null as number | null,
    reason: '',
    overrideReason: '',
    confirmed: false,
  };
  private initial = '';
  constructor() {
    this.titles
      .pipe(
        switchMap((title) =>
          !title
            ? of(null)
            : timer(350).pipe(
                switchMap(() => this.api.matches(title)),
                catchError(() => {
                  this.error.set('Chưa kiểm tra được sách tương tự. Thử lại tên sách.');
                  return of(null);
                }),
              ),
        ),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((r) => {
        this.match = r;
      });
    this.queries
      .pipe(
        debounceTime(300),
        switchMap((f) =>
          this.api.catalog(f.q, f.page).pipe(
            catchError(() => {
              this.error.set('Chưa tải được sách. Thử tìm lại.');
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((r) => {
        this.catalog = r;
        this.searching.set(false);
      });
  }
  open(order: OrderDetail, item: OrderItem | null = null) {
    this.order = order;
    this.item = item;
    this.error.set('');
    this.conflict.set(false);
    this.refreshing.set(false);
    this.match = null;
    this.model = {
      sourceType: item?.sourceType ?? 'CATALOG',
      bookCopyId: item?.bookCopyId ?? null,
      title: item?.titleSnapshot ?? '',
      unitPriceVnd: item?.unitPriceVnd ?? null,
      quantity: item?.quantity ?? 1,
      unitWeightGrams: item?.unitWeightGrams ?? null,
      reason: '',
      overrideReason: '',
      confirmed: false,
    };
    this.initial = JSON.stringify(this.model);
    this.visible.set(true);
    this.opener = document.activeElement as HTMLElement;
    this.dialog()?.nativeElement.showModal?.();
    if (item?.sourceType === 'MANUAL') {
      this.match = { normalizedTitle: '', fingerprint: '', items: [] };
      this.titles.next(this.model.title);
    } else this.search();
  }
  sourceChanged() {
    this.model.bookCopyId = null;
    this.model.unitPriceVnd = null;
    this.match = null;
    if (this.model.sourceType === 'MANUAL') this.titleChanged(this.model.title);
    else this.search();
  }
  search(page = 0) {
    this.page = page;
    this.searching.set(true);
    this.queries.next({ q: this.q, page });
  }
  choose(book: CatalogCandidate) {
    this.model.bookCopyId = book.id;
    this.model.title = book.title;
    this.model.unitWeightGrams = book.weightG;
    this.model.unitPriceVnd = null;
  }
  titleChanged(title: string) {
    this.model.title = title;
    this.match = null;
    this.model.confirmed = false;
    this.model.overrideReason = '';
    this.titles.next(title.trim());
  }
  rebase(order: OrderDetail) {
    this.order = order;
    this.conflict.set(false);
    this.error.set('');
    if (this.item) {
      const current = order.items.find((i) => i.id === this.item!.id);
      if (current) this.item = current;
      else
        this.error.set(
          'Dòng sách đã bị xóa. Nội dung nhập được giữ để bạn kiểm tra trước khi đóng.',
        );
    }
    if (!['DRAFT', 'KEEPING'].includes(order.status))
      this.error.set('Đơn đã khóa sửa sách. Nội dung nhập vẫn được giữ để kiểm tra.');
  }
  totalPrice() {
    return product(this.model.unitPriceVnd, this.model.quantity);
  }
  totalWeight() {
    return product(this.model.unitWeightGrams, this.model.quantity);
  }
  requiresReason() {
    return (
      this.order?.status === 'KEEPING' &&
      !!this.item &&
      Number(this.model.quantity) < this.item.quantity
    );
  }
  valid() {
    if (
      !this.order ||
      !['DRAFT', 'KEEPING'].includes(this.order.status) ||
      (this.item && !this.order.items.some((i) => i.id === this.item!.id))
    )
      return false;
    const m = this.model;
    return (
      integer(m.unitPriceVnd, 0, 999999999999) &&
      integer(m.quantity, 1, 999999) &&
      this.totalPrice() !== null &&
      (m.unitWeightGrams === null
        ? m.sourceType === 'CATALOG' && this.order?.status === 'DRAFT'
        : integer(m.unitWeightGrams, 1)) &&
      (!this.requiresReason() || !!m.reason.trim()) &&
      (m.sourceType === 'CATALOG'
        ? !!m.bookCopyId
        : !!m.title.trim() &&
          !!this.match &&
          (!this.match.items.length || (m.confirmed && !!m.overrideReason.trim())))
    );
  }
  submit() {
    if (!this.valid() || this.locked()) return;
    const m = this.model;
    this.saved.emit({
      sourceType: m.sourceType,
      bookCopyId: m.sourceType === 'CATALOG' ? m.bookCopyId : null,
      title: m.sourceType === 'MANUAL' ? m.title.trim() : null,
      unitPriceVnd: m.unitPriceVnd!,
      quantity: m.quantity!,
      unitWeightGrams: m.unitWeightGrams,
      reason: m.reason.trim() || null,
      matchConfirmation:
        m.sourceType === 'MANUAL' && this.match?.items.length
          ? {
              normalizedTitle: this.match.normalizedTitle,
              fingerprint: this.match.fingerprint,
              reason: m.overrideReason.trim(),
            }
          : null,
    });
  }
  setMatches(result: MatchResult) {
    this.match = result;
    this.model.confirmed = false;
    this.model.overrideReason = '';
  }
  close() {
    this.visible.set(false);
    this.dialog()?.nativeElement.close?.();
    this.opener?.focus();
  }
  dirty() {
    return this.visible() && JSON.stringify(this.model) !== this.initial;
  }
  requestClose() {
    if (this.locked() || this.refreshing()) return false;
    if (this.dirty() && !window.confirm('Bỏ thay đổi dòng sách chưa lưu?')) return false;
    this.close();
    return true;
  }
  escape(event: Event) {
    event.preventDefault();
    this.requestClose();
  }
}
