import { Pagination } from '../../../../shared/pagination/pagination';
import { Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { DatePipe, DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  Subject,
  catchError,
  combineLatest,
  debounceTime,
  merge,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { TrashIcon } from '../../../../shared/trash-icon/trash-icon';
import { TrashDialog } from '../../trash/trash-dialog/trash-dialog';
import { OrderApi } from '../order-api';
import {
  defaultOrderFilter,
  OrderFilter,
  OrderStats,
  OrderSummary,
  Page,
  statusLabel,
  WARNING_LABELS,
} from '../order-models';
import { keepEnd, vnd } from '../order-values';
import { ORDER_TABS, OrderSub, OrderTab, orderQuery, parseOrderQuery, tabOf } from './order-groups';
@Component({
  selector: 'app-order-list',
  imports: [Pagination, RouterLink, DatePipe, NgTemplateOutlet, TrashDialog, TrashIcon],
  templateUrl: './order-list.html',
  styleUrls: ['../orders.scss', './order-list.scss'],
})
export class OrderList {
  private readonly api = inject(OrderApi);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  private readonly view = inject(DOCUMENT).defaultView;
  private readonly trash = viewChild.required(TrashDialog);
  private readonly reloads = new Subject<void>();
  private readonly searches = new Subject<string>();
  readonly owner = computed(() => this.auth.user()?.role === 'OWNER');
  readonly page = signal<Page<OrderSummary> | null>(null);
  readonly stats = signal<OrderStats | null>(null);
  readonly filter = signal<OrderFilter>(defaultOrderFilter());
  readonly tabs = ORDER_TABS;
  readonly tab = computed(() => tabOf(this.filter().group));
  readonly query = computed(() => orderQuery(this.filter()));
  readonly subActive = computed(() => this.tab().subs.some((s) => this.filter()[s.key] === s.value));
  readonly dated = computed(() => !!(this.filter().createdFrom || this.filter().createdTo));
  readonly customerName = computed(
    () => this.page()?.items[0]?.customerNameSnapshot || 'một khách',
  );
  readonly filterOpen = signal(false);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly notice = signal('');
  readonly statusLabel = statusLabel;
  readonly warningLabels = WARNING_LABELS;
  readonly money = vnd;
  readonly keepEnd = keepEnd;
  constructor() {
    let seenEpoch = this.auth.epoch();
    combineLatest([
      this.route.queryParamMap,
      this.reloads.pipe(startWith(undefined)),
      toObservable(this.auth.epoch),
    ])
      .pipe(
        switchMap(([params, , epoch]) => {
          this.page.set(null);
          this.loading.set(true);
          this.error.set('');
          // Counts stay up while the next ones load, but never across sessions.
          if (epoch !== seenEpoch || !this.owner()) this.stats.set(null);
          seenEpoch = epoch;
          const before = this.filter(),
            f = parseOrderQuery(params);
          this.filter.set(f);
          if (
            (f.createdFrom && f.createdFrom !== before.createdFrom) ||
            (f.createdTo && f.createdTo !== before.createdTo)
          )
            this.filterOpen.set(true);
          if (!this.owner()) {
            this.loading.set(false);
            return of(null);
          }
          return merge(
            this.api.list(f).pipe(
              catchError(() => {
                this.error.set('Chưa tải được đơn hàng. Vui lòng thử lại.');
                return of(null);
              }),
              tap((page) => this.showPage(page)),
            ),
            this.api.stats(f).pipe(
              catchError(() => of(null)),
              tap((stats) => this.stats.set(stats)),
            ),
          );
        }),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe();
    this.searches
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroy))
      .subscribe((q) => this.navigate({ q: q.trim().replace(/\s+/g, ' '), page: 0 }));
  }
  search(q: string) {
    this.searches.next(q);
  }
  change(key: 'createdFrom' | 'createdTo', value: string) {
    this.navigate({ [key]: value, page: 0 });
  }
  tabQuery(t: OrderTab) {
    return orderQuery({
      ...this.filter(),
      group: t.group,
      status: 'ALL',
      keepWarning: 'ALL',
      page: 0,
    });
  }
  selectSub(s: OrderSub | null) {
    this.navigate({
      status: 'ALL',
      keepWarning: 'ALL',
      page: 0,
      ...(s ? { [s.key]: s.value } : {}),
    });
  }
  clearCustomer() {
    this.navigate({ customerId: undefined, page: 0 });
  }
  clearFilters() {
    this.navigate({ customerId: undefined, createdFrom: '', createdTo: '', page: 0 });
  }
  navigate(patch: Partial<OrderFilter>, replaceUrl = false) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: orderQuery({ ...this.filter(), ...patch }),
      replaceUrl,
    });
  }
  /** Orders leave a tab as they progress, so a remembered page can be past the end. */
  private showPage(page: Page<OrderSummary> | null) {
    if (page && !page.items.length && page.totalPages > 0 && this.filter().page >= page.totalPages) {
      this.navigate({ page: page.totalPages - 1 }, true);
      return;
    }
    this.page.set(page);
    this.loading.set(false);
  }
  refresh() {
    this.reloads.next();
  }
  /** Pointer shortcut only; the order code stays the keyboard and screen-reader link. */
  openRow(event: MouseEvent, id: string) {
    if ((event.target as Element).closest('a, button') || this.view?.getSelection()?.toString()) return;
    const queryParams = this.query();
    if (event.ctrlKey || event.metaKey) {
      const url = this.router.serializeUrl(this.router.createUrlTree(['/admin/orders', id], { queryParams }));
      this.view?.open(url, '_blank', 'noopener');
    } else void this.router.navigate(['/admin/orders', id], { queryParams });
  }
  askTrash({ id, version, orderCode, customerNameSnapshot, trashable, totals }: OrderSummary) {
    const blocked = trashable
      ? undefined
      : `Đơn còn giữ ${vnd(totals.paidAmount)} của khách. Ghi nhận hoàn tiền trước khi xóa.`;
    this.trash().open({ id, version, code: orderCode, name: customerNameSnapshot, blocked });
  }
  onTrashed(code: string) {
    this.notice.set('Đã chuyển ' + code + ' vào Thùng rác.');
    this.refresh();
  }
  canLeave() {
    return true;
  }
}
