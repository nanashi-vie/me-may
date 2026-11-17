import { Pagination } from '../../../../shared/pagination/pagination';
import { Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  Subject,
  catchError,
  combineLatest,
  debounceTime,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { CustomerApi } from '../customer-api';
import { CustomerDetail, CustomerFilter, CustomerSummary, Page } from '../customer-models';
import { CustomerForm } from '../customer-form/customer-form';

@Component({
  selector: 'app-customer-list',
  imports: [Pagination, RouterLink, CustomerForm],
  templateUrl: './customer-list.html',
  styleUrls: ['../customer-pages.scss'],
})
export class CustomerList {
  private readonly api = inject(CustomerApi);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  private readonly editor = viewChild(CustomerForm);
  private readonly reloads = new Subject<void>();
  private readonly searches = new Subject<string>();
  private creating = false;
  readonly owner = computed(() => this.auth.user()?.role === 'OWNER');
  readonly page = signal<Page<CustomerSummary> | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly toast = signal('');
  readonly filter = signal<CustomerFilter>({ q: '', status: 'ACTIVE', page: 0, size: 20 });
  constructor() {
    combineLatest([
      this.route.queryParamMap,
      this.reloads.pipe(startWith(undefined)),
      toObservable(this.auth.epoch),
    ])
      .pipe(
        switchMap(([params]) => {
          this.page.set(null);
          this.error.set('');
          this.loading.set(true);
          const n = (key: string, defaultValue: number, max: number) => {
            const v = Number(params.get(key) ?? defaultValue);
            return Number.isSafeInteger(v) && v >= 0 && v <= max ? v : defaultValue;
          };
          const status = params.get('status'),
            size = n('size', 20, 100);
          const filter: CustomerFilter = {
            q: (params.get('q') || '').trim().replace(/\s+/g, ' '),
            status: status === 'ALL' || status === 'ARCHIVED' ? status : 'ACTIVE',
            page: n('page', 0, 2147483647),
            size: size || 20,
          };
          this.filter.set(filter);
          if (!this.auth.user()) {
            this.toast.set('');
            return of(null);
          }
          return this.api.list(filter).pipe(
            catchError(() => {
              this.error.set('Chưa tải được khách hàng. Vui lòng thử lại.');
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((page) => {
        this.page.set(page);
        this.loading.set(false);
      });
    this.searches.pipe(debounceTime(300), takeUntilDestroyed(this.destroy)).subscribe((value) => {
      const q = value.trim().replace(/\s+/g, ' ');
      if (q !== this.filter().q) this.navigate({ q, page: 0 });
    });
  }
  search(value: string) {
    this.searches.next(value);
  }
  changeStatus(value: string) {
    if (value === 'ACTIVE' || value === 'ARCHIVED' || value === 'ALL')
      this.navigate({ status: value, page: 0 });
  }
  private navigate(patch: Partial<CustomerFilter>) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ...this.filter(), ...patch },
    });
  }
  goPage(page: number) {
    this.navigate({ page });
  }
  refresh() {
    this.reloads.next();
  }
  openNew() {
    if (!this.owner()) return;
    this.creating = true;
    this.editor()?.open();
  }
  onSaved(_customer: CustomerDetail) {
    this.toast.set(this.creating ? 'Đã thêm khách hàng thành công' : 'Đã cập nhật khách hàng');
    if (this.creating) this.navigate({ q: '', status: 'ACTIVE', page: 0 });
    this.creating = false;
    this.refresh();
  }
  canLeave() {
    const editor = this.editor();
    if (editor?.visible() && !editor.requestClose()) return false;
    return true;
  }
}
