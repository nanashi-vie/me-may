import { Pagination } from '../../../../shared/pagination/pagination';
import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, catchError, of, switchMap } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { OrderApi } from '../order-api';
import { OrderSummary, Page, STATUS_LABELS, defaultOrderFilter } from '../order-models';
import { vnd } from '../order-values';
@Component({
  selector: 'app-customer-order-history',
  imports: [Pagination, RouterLink, DatePipe],
  template: ` @if (owner()) {
    <section class="section">
      <div class="section-heading">
        <h2>Lịch sử đơn hàng</h2>
        <a
          class="button secondary"
          routerLink="/admin/orders/new"
          [queryParams]="{ customerId: customerId() }"
          >Tạo đơn hàng</a
        >
      </div>
      @if (loading()) {
        <p role="status">Đang tải đơn…</p>
      } @else if (error()) {
        <p class="error" role="alert">
          Chưa tải được lịch sử đơn hàng.
          <button class="secondary" (click)="refresh()">Thử lại</button>
        </p>
      } @else if (result(); as p) {
        @for (d of p.items; track d.id) {
          <div class="history-entry split-line">
            <div>
              <a [routerLink]="['/admin/orders', d.id]">{{ d.orderCode }}</a
              ><small
                >{{ d.createdAt | date: 'dd/MM/yyyy' : '+0700' }} · {{ labels[d.status] }}</small
              >
            </div>
            <div class="number">
              {{ money(d.totals.orderTotal ?? d.totals.goodsTotal) }}
              @if (d.totals.provisional) {
                <small>Tạm tính</small>
              }
            </div>
          </div>
        } @empty {
          <p class="empty">Khách hàng chưa có đơn hàng.</p>
        }
        <div class="pagination">
          <span>{{ p.totalElements }} đơn</span>
          <app-pagination [page]="page()" [totalPages]="p.totalPages" [disabled]="loading()" (pageChange)="page.set($event)" />
        </div>
      }
    </section>
  }`,
  styleUrl: '../orders.scss',
})
export class CustomerOrderHistory {
  readonly customerId = input.required<string>();
  private readonly api = inject(OrderApi);
  private readonly auth = inject(AuthService);
  private readonly destroy = inject(DestroyRef);
  private readonly reload = signal(0);
  readonly owner = computed(() => this.auth.user()?.role === 'OWNER');
  readonly page = signal(0);
  readonly result = signal<Page<OrderSummary> | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly labels = STATUS_LABELS;
  readonly money = vnd;
  constructor() {
    combineLatest([
      toObservable(this.customerId),
      toObservable(this.page),
      toObservable(this.reload),
      toObservable(this.auth.epoch),
    ])
      .pipe(
        switchMap(([customerId, page]) => {
          this.result.set(null);
          this.loading.set(true);
          this.error.set(false);
          return this.owner()
            ? this.api.list({ ...defaultOrderFilter(), customerId, page }).pipe(
                catchError(() => {
                  this.error.set(true);
                  return of(null);
                }),
              )
            : of(null);
        }),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((r) => {
        this.result.set(r);
        this.loading.set(false);
      });
  }
  refresh() {
    this.reload.update((n) => n + 1);
  }
}
