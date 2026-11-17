import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { OrderList } from './order-list';
import { OrderApi } from '../order-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { vi } from 'vitest';
const stats = {
  keeping: 12,
  soon: 3,
  due: 1,
  overdue: 2,
  readyToShip: 5,
  completed: 9,
  unsuccessful: 1,
};
const page = (code: string) => ({
  items: [
    {
      id: '1',
      orderCode: code,
      customerId: '3',
      customerNameSnapshot: 'Synthetic reader',
      customerPhoneSnapshot: null,
      status: 'KEEPING',
      fulfillmentType: 'KEEP',
      createdAt: '2026-11-17T01:00:00Z',
      keepUntil: '2026-11-30T17:00:00Z',
      totalQuantity: 2,
      version: 2,
      keepWarning: 'SOON',
      totals: {
        subtotal: 500000,
        goodsTotal: 500000,
        orderTotal: null,
        paidAmount: 100000,
        balance: null,
        totalBookWeightGrams: 500,
        provisional: true,
        paymentStatus: 'PROVISIONAL',
      },
    },
  ],
  page: 0,
  size: 20,
  totalElements: 1,
  totalPages: 1,
});
async function setup(role: 'OWNER' | 'STAFF' = 'OWNER') {
  const params = new BehaviorSubject(convertToParamMap({}));
  const auth = { user: signal({ id: 1, email: 'owner@test', role }), epoch: signal(0) };
  const api = { list: vi.fn(() => of(page('DH-000001'))), stats: vi.fn(() => of(stats)) };
  TestBed.configureTestingModule({
    imports: [OrderList],
    providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { queryParamMap: params } },
      { provide: AuthService, useValue: auth },
      { provide: OrderApi, useValue: api },
    ],
  });
  const f = TestBed.createComponent(OrderList);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return { f, c: f.componentInstance, api, params, auth };
}
describe('OrderList', () => {
  it('uses server metrics and indicates provisional shipping total', async () => {
    const { f } = await setup();
    expect(f.nativeElement.textContent).toContain('Quản lý đơn hàng');
    expect(f.nativeElement.textContent).toContain('DH-000001');
    expect(f.nativeElement.textContent).toContain('Tạm tính');
    expect(f.nativeElement.textContent).toContain('12');
    expect(f.nativeElement.querySelector('[href="/admin/orders/new"]')).toBeTruthy();
  });
  it('staff never loads private data', async () => {
    const { api, f } = await setup('STAFF');
    expect(api.list).not.toHaveBeenCalled();
    expect(api.stats).not.toHaveBeenCalled();
    expect(f.nativeElement.textContent).not.toContain('DH-000001');
  });
  it('cancels stale query responses and clears data on auth epoch change', async () => {
    const { f, c, api, params, auth } = await setup();
    const old = new Subject<any>();
    api.list.mockImplementationOnce(() => old);
    params.next(convertToParamMap({ q: 'old' }));
    f.detectChanges();
    await f.whenStable();
    params.next(convertToParamMap({ q: 'new' }));
    f.detectChanges();
    await f.whenStable();
    old.next(page('STALE'));
    old.complete();
    f.detectChanges();
    expect(c.page()?.items[0].orderCode).toBe('DH-000001');
    auth.user.set({ id: 1, email: 'staff@test', role: 'STAFF' });
    auth.epoch.update((v) => v + 1);
    f.detectChanges();
    await f.whenStable();
    expect(c.page()).toBeNull();
  });
});
