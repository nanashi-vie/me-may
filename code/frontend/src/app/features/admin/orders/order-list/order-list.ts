import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  Subject,
  catchError,
  combineLatest,
  debounceTime,
  forkJoin,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { OrderApi } from '../order-api';
import {
  defaultOrderFilter,
  OrderFilter,
  OrderStats,
  OrderSummary,
  Page,
  STATUS_LABELS,
  WARNING_LABELS,
} from '../order-models';
import { keepEnd, vnd } from '../order-values';
@Component({
  selector: 'app-order-list',
  imports: [RouterLink, DatePipe],
  templateUrl: './order-list.html',
  styleUrls: ['../orders.scss', './order-list.scss'],
})
export class OrderList {
  private readonly api = inject(OrderApi);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  private readonly reloads = new Subject<void>();
  private readonly searches = new Subject<string>();
  readonly owner = computed(() => this.auth.user()?.role === 'OWNER');
  readonly page = signal<Page<OrderSummary> | null>(null);
  readonly stats = signal<OrderStats | null>(null);
  readonly filter = signal<OrderFilter>(defaultOrderFilter());
  readonly loading = signal(true);
  readonly error = signal('');
  readonly statusLabels = STATUS_LABELS;
  readonly statuses = Object.keys(STATUS_LABELS) as (keyof typeof STATUS_LABELS)[];
  readonly warningLabels = WARNING_LABELS;
  readonly money = vnd;
  readonly keepEnd = keepEnd;
  constructor() {
    combineLatest([
      this.route.queryParamMap,
      this.reloads.pipe(startWith(undefined)),
      toObservable(this.auth.epoch),
    ])
      .pipe(
        switchMap(([p]) => {
          this.page.set(null);
          this.stats.set(null);
          this.loading.set(true);
          this.error.set('');
          const number = (key: string, fallback: number, max: number) => {
            const n = Number(p.get(key) ?? fallback);
            return Number.isSafeInteger(n) && n >= 0 && n <= max ? n : fallback;
          };
          const status = p.get('status') || 'ALL',
            warning = p.get('keepWarning') || 'ALL';
          const f: OrderFilter = {
            q: (p.get('q') || '').trim().replace(/\s+/g, ' '),
            status: status in STATUS_LABELS ? (status as OrderFilter['status']) : 'ALL',
            keepWarning: ['SOON', 'DUE', 'OVERDUE'].includes(warning)
              ? (warning as OrderFilter['keepWarning'])
              : 'ALL',
            createdFrom: p.get('createdFrom') || '',
            createdTo: p.get('createdTo') || '',
            page: number('page', 0, 2147483647),
            size: number('size', 20, 100) || 20,
          };
          if (p.get('customerId')) f.customerId = p.get('customerId')!;
          this.filter.set(f);
          if (!this.owner()) return of(null);
          return forkJoin({ page: this.api.list(f), stats: this.api.stats(f) }).pipe(
            catchError(() => {
              this.error.set('Chưa tải được đơn hàng. Vui lòng thử lại.');
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((result) => {
        this.page.set(result?.page ?? null);
        this.stats.set(result?.stats ?? null);
        this.loading.set(false);
      });
    this.searches
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroy))
      .subscribe((q) => this.navigate({ q: q.trim().replace(/\s+/g, ' '), page: 0 }));
  }
  search(q: string) {
    this.searches.next(q);
  }
  change(key: 'status' | 'keepWarning' | 'createdFrom' | 'createdTo', value: string) {
    this.navigate({ [key]: value, page: 0 } as Partial<OrderFilter>);
  }
  navigate(patch: Partial<OrderFilter>) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ...this.filter(), ...patch },
    });
  }
  refresh() {
    this.reloads.next();
  }
  canLeave() {
    return true;
  }
}
