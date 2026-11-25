import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
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
  it('opens the order from anywhere on its row except its controls', async () => {
    const { f, api } = await setup();
    api.list.mockReturnValue(of({ ...page('DH-000001'), items: [{ ...page('DH-000001').items[0], trashable: true }] }));
    f.componentInstance.refresh();
    await f.whenStable();
    f.detectChanges();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const row = f.nativeElement.querySelector('tbody tr') as HTMLElement;
    expect(row.textContent).not.toContain('Xem');
    const dialog = f.nativeElement.querySelector('app-trash-dialog dialog') as HTMLDialogElement;
    dialog.showModal = vi.fn();
    row.querySelector<HTMLButtonElement>('.trash-btn')!.click();
    f.detectChanges();
    expect(dialog.showModal).toHaveBeenCalledOnce();
    expect(navigate).not.toHaveBeenCalled();
    row.querySelector<HTMLElement>('td:nth-child(5)')!.click();
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/admin/orders', '1'], { queryParams: f.componentInstance.filter() });
  });
  it('keeps text selection and modified clicks from leaving the list', async () => {
    const { f } = await setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const selection = vi.spyOn(window, 'getSelection').mockReturnValue({ toString: () => 'Synthetic' } as Selection);
    const cell = f.nativeElement.querySelector('tbody td:nth-child(2)') as HTMLElement;
    try {
      cell.click();
      expect(navigate).not.toHaveBeenCalled();
      selection.mockReturnValue({ toString: () => '' } as Selection);
      cell.dispatchEvent(new MouseEvent('click', { bubbles: true, metaKey: true }));
      expect(navigate).not.toHaveBeenCalled();
      expect(open).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('/admin/orders/1'), '_blank', 'noopener');
    } finally {
      open.mockRestore();
      selection.mockRestore();
    }
  });
  it('shows a dash instead of the trash for orders that must be kept', async () => {
    const { f, c, api } = await setup();
    expect(f.nativeElement.querySelector('.trash-btn')).toBeNull();
    expect(f.nativeElement.querySelector('tbody tr').lastElementChild.textContent.trim()).toBe('—');
    const calls = api.list.mock.calls.length;
    c.onTrashed('DH-000001');
    expect(api.list).toHaveBeenCalledTimes(calls + 1);
    await f.whenStable();
    f.detectChanges();
    expect(f.nativeElement.querySelector('[role="status"]').textContent).toContain('DH-000001');
  });
  async function show(patch: object) {
    const t = await setup();
    const result = page('DH-000001');
    t.api.list.mockReturnValue(of({ ...result, items: [{ ...result.items[0], keepWarning: '', ...patch }] }));
    t.c.refresh();
    await t.f.whenStable();
    t.f.detectChanges();
    return t;
  }
  it('explains in a dialog why a cancelled order holding money cannot be deleted', async () => {
    const { f } = await show({ status: 'CANCELLED', trashable: false });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const dialog = f.nativeElement.querySelector('app-trash-dialog dialog') as HTMLDialogElement;
    dialog.showModal = vi.fn();
    const button = f.nativeElement.querySelector('tbody .trash-btn') as HTMLButtonElement;
    expect(button.classList).toContain('blocked');
    expect(button.getAttribute('aria-label')).toBe('Vì sao chưa xóa được DH-000001');
    button.click();
    f.detectChanges();
    expect(dialog.showModal).toHaveBeenCalledOnce();
    expect(dialog.textContent).toMatch(/Đơn còn giữ 100\.000\s?đ của khách\. Ghi nhận hoàn tiền trước khi xóa\./);
    expect(dialog.textContent).not.toContain('Chuyển vào Thùng rác');
    expect(navigate).not.toHaveBeenCalled();
  });
  it('shows the keep deadline only while the order is being kept', async () => {
    const t = await setup();
    const cell = () => t.f.nativeElement.querySelector('tbody td:nth-child(8)').textContent.trim();
    expect(cell()).toBe('Giữ hết 30/11/2026');
    for (const status of ['DRAFT', 'READY_TO_SHIP', 'COMPLETED', 'UNSUCCESSFUL', 'CANCELLED']) {
      const result = page('DH-000001');
      t.api.list.mockReturnValue(of({ ...result, items: [{ ...result.items[0], status, keepWarning: '' }] }));
      t.c.refresh();
      await t.f.whenStable();
      t.f.detectChanges();
      expect(cell(), status).toBe('—');
    }
  });
  it('names cancelled orders and closed returns separately and filters each', async () => {
    const cancelled = await show({ status: 'CANCELLED', returned: false });
    const badge = () => cancelled.f.nativeElement.querySelector('tbody .badge').textContent.trim();
    expect(badge()).toBe('Đã hủy');
    cancelled.api.list.mockReturnValue(of({ ...page('DH-000001'), items: [{ ...page('DH-000001').items[0], status: 'CANCELLED', returned: true }] }));
    cancelled.params.next(convertToParamMap({ status: 'RETURNED' }));
    await cancelled.f.whenStable();
    cancelled.f.detectChanges();
    expect(badge()).toBe('Đã hoàn đơn');
    expect(cancelled.api.list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'RETURNED' }));
    const select = cancelled.f.nativeElement.querySelector('select') as HTMLSelectElement;
    expect(Array.from(select.options, (o) => [o.value, o.text.trim()])).toEqual(
      expect.arrayContaining([['CANCELLED', 'Đã hủy'], ['RETURNED', 'Đã hoàn đơn']]),
    );
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
