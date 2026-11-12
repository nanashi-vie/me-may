import { Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Subject, catchError, combineLatest, of, startWith, switchMap } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { CustomerApi } from '../customer-api';
import { CustomerDetail } from '../customer-models';
import { CustomerForm } from '../customer-form/customer-form';
@Component({
  selector: 'app-customer-detail',
  imports: [DatePipe, RouterLink, CustomerForm],
  templateUrl: './customer-detail.html',
  styleUrls: ['../customer-pages.scss'],
})
export class CustomerDetailPage {
  private readonly api = inject(CustomerApi);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroy = inject(DestroyRef);
  private readonly editor = viewChild(CustomerForm);
  private readonly reloads = new Subject<void>();
  readonly owner = computed(() => this.auth.user()?.role === 'OWNER');
  readonly customer = signal<CustomerDetail | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly toast = signal('');
  readonly backQuery = this.route.snapshot.queryParams;
  readonly socialFields = [
    { key: 'zaloName', label: 'Tên Zalo' },
    { key: 'tiktokId', label: 'Tên TikTok' },
    { key: 'threadsId', label: 'Tên Threads' },
  ] as const;
  constructor() {
    combineLatest([
      this.route.paramMap,
      this.reloads.pipe(startWith(undefined)),
      toObservable(this.auth.epoch),
    ])
      .pipe(
        switchMap(([params]) => {
          this.customer.set(null);
          this.error.set('');
          this.loading.set(true);
          this.busy.set(false);
          if (!this.auth.user()) {
            this.toast.set('');
            return of(null);
          }
          return this.api.detail(params.get('id') || '').pipe(
            catchError((e) => {
              this.error.set(
                e.status === 404 ? 'Không tìm thấy khách hàng.' : 'Chưa tải được hồ sơ khách hàng.',
              );
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((customer) => {
        this.customer.set(customer);
        this.loading.set(false);
      });
  }
  refresh() {
    this.reloads.next();
  }
  edit() {
    if (this.owner() && !this.busy()) this.editor()?.open(this.customer());
  }
  onSaved(customer: CustomerDetail) {
    this.customer.set(customer);
    this.toast.set('Đã cập nhật khách hàng');
  }
  changeCustomerStatus() {
    const c = this.customer();
    if (!c || !this.owner() || this.busy()) return;
    if (
      c.status === 'ACTIVE' &&
      !window.confirm(
        'Bạn có chắc muốn lưu trữ khách hàng này? Thông tin khách hàng sẽ được giữ lại nhưng không còn xuất hiện trong danh sách đang hoạt động.',
      )
    )
      return;
    const epoch = this.auth.epoch();
    this.busy.set(true);
    this.error.set('');
    this.api
      .setStatus(c.id, c.version, c.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE')
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (customer) => {
          if (epoch !== this.auth.epoch()) return;
          this.busy.set(false);
          this.customer.set(customer);
          this.toast.set(
            customer.status === 'ACTIVE' ? 'Đã khôi phục khách hàng' : 'Đã lưu trữ khách hàng',
          );
        },
        error: (e) => {
          if (epoch === this.auth.epoch()) {
            this.busy.set(false);
            this.error.set(
              e.status === 409
                ? 'Dữ liệu đã thay đổi. Tải lại hồ sơ trước khi thao tác.'
                : 'Chưa thay đổi được trạng thái khách hàng.',
            );
          }
        },
      });
  }
  canLeave() {
    const editor = this.editor();
    return !editor?.visible() || editor.requestClose();
  }
}
