import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, NEVER, Observable, Subject, of, throwError } from 'rxjs';
import { OrderList } from './order-list';
import { OrderApi } from '../order-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { ORDER_TABS, tabOf } from './order-groups';
import { vi } from 'vitest';
const stats = {
  keeping: 12,
  soon: 3,
  due: 1,
  overdue: 2,
  readyToShip: 5,
  completed: 9,
  unsuccessful: 1,
  draft: 2,
  cancelled: 4,
  returned: 6,
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
async function setup(role: 'OWNER' | 'STAFF' = 'OWNER', query: Record<string, string> = {}) {
  const params = new BehaviorSubject(convertToParamMap(query));
  const auth = { user: signal({ id: 1, email: 'owner@test', role }), epoch: signal(0) };
  const api = {
    list: vi.fn((): Observable<any> => of(page('DH-000001'))),
    stats: vi.fn((): Observable<any> => of(stats)),
  };
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
  const el = f.nativeElement as HTMLElement;
  const text = (e: Element | null) => (e?.textContent ?? '').replace(/\s+/g, ' ').trim();
  return {
    f,
    c: f.componentInstance,
    api,
    params,
    auth,
    el,
    tabs: () => Array.from(el.querySelectorAll('nav[aria-label="Nhóm đơn hàng"] a'), text),
    subs: () => Array.from(el.querySelectorAll<HTMLButtonElement>('.order-subs button')),
    button: (label: string) =>
      Array.from(el.querySelectorAll('button')).find((b) => text(b).startsWith(label)) as HTMLButtonElement,
    text,
    async settle() {
      await f.whenStable();
      f.detectChanges();
    },
    async go(q: Record<string, string>) {
      params.next(convertToParamMap(q));
      f.detectChanges();
      await f.whenStable();
      f.detectChanges();
    },
  };
}
describe('OrderList', () => {
  it('indicates provisional shipping total', async () => {
    const { f } = await setup();
    expect(f.nativeElement.textContent).toContain('Quản lý đơn hàng');
    expect(f.nativeElement.textContent).toContain('DH-000001');
    expect(f.nativeElement.textContent).toContain('Tạm tính');
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
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/admin/orders', '1'], { queryParams: f.componentInstance.query() });
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
    expect(cancelled.api.list).toHaveBeenLastCalledWith(expect.objectContaining({ group: 'CLOSED', status: 'RETURNED' }));
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
    expect(c.stats()).toBeNull();
  });
  it('links five counted tabs and marks the open one', async () => {
    const t = await setup('OWNER', { nhom: 'hoan-tat' });
    expect(t.tabs()).toEqual(['Tất cả 39', 'Chờ xử lý 8', 'Đang keep 12 · 2 quá hạn', 'Hoàn tất 9', 'Hủy/Hoàn 10']);
    const open = t.el.querySelectorAll('nav[aria-label="Nhóm đơn hàng"] [aria-current="page"]');
    expect(Array.from(open, t.text)).toEqual(['Hoàn tất 9']);
    expect(t.el.querySelector('.metrics')).toBeNull();
    expect(t.el.querySelector('select')).toBeNull();
    t.api.stats.mockReturnValue(of({ ...stats, overdue: 0 }));
    t.c.refresh();
    await t.settle();
    expect(t.tabs()[2]).toBe('Đang keep 12');
  });
  it('switching tabs keeps search, dates and customer only', async () => {
    const t = await setup('OWNER', {
      nhom: 'dang-keep',
      keepWarning: 'OVERDUE',
      q: 'Lan',
      createdFrom: '2026-11-01',
      customerId: '3',
      page: '2',
      size: '50',
    });
    t.api.list.mockReturnValue(NEVER);
    const kept = { q: 'Lan', createdFrom: '2026-11-01', customerId: '3', size: 50 };
    expect(t.c.tabQuery(tabOf('COMPLETED'))).toEqual({ nhom: 'hoan-tat', ...kept });
    expect(t.c.tabQuery(tabOf('ALL'))).toEqual(kept);
    const href = t.el.querySelectorAll('nav[aria-label="Nhóm đơn hàng"] a')[3].getAttribute('href')!;
    const url = new URL(href, 'http://test');
    expect(url.pathname).toBe('/admin/orders');
    expect(Object.fromEntries(url.searchParams)).toEqual({ nhom: 'hoan-tat', ...kept, size: '50' });
  });
  it('offers the sub filters of each tab', async () => {
    const t = await setup();
    const labels = () => t.subs().map(t.text);
    const expected = [
      [],
      ['Tất cả 8', 'Nháp 2', 'Chờ giao 5', 'Không thành công 1'],
      ['Tất cả 12', 'Quá hạn 2', 'Đến hạn hôm nay 1', 'Sắp hết hạn 3'],
      [],
      ['Tất cả 10', 'Đã hủy 4', 'Đã hoàn đơn 6'],
    ];
    for (const [i, tab] of ORDER_TABS.entries()) {
      await t.go(tab.slug ? { nhom: tab.slug } : {});
      expect(labels(), tab.label).toEqual(expected[i]);
    }
    t.api.stats.mockReturnValue(of({ ...stats, due: 0 }));
    await t.go({ nhom: 'dang-keep', keepWarning: 'SOON', page: '0' });
    expect(t.subs().map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'false', 'true']);
    expect(t.subs().map((b) => b.classList.contains('zero'))).toEqual([false, false, true, false]);
    expect(t.subs().some((b) => b.disabled)).toBe(false);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    t.subs()[1].click();
    expect(navigate.mock.lastCall?.[1]?.queryParams).toEqual({ nhom: 'dang-keep', keepWarning: 'OVERDUE' });
    t.subs()[0].click();
    expect(navigate.mock.lastCall?.[1]?.queryParams).toEqual({ nhom: 'dang-keep' });
  });
  it('shows the columns of each tab', async () => {
    const t = await setup();
    const base = ['Mã đơn', 'Khách hàng', 'Ngày tạo', 'Số sách', 'Tổng bill', 'Đã thanh toán'];
    const cases: [string, object, string[], string][] = [
      ['', {}, [...base, 'Trạng thái', 'Hạn keep', 'Thao tác'], 'Giữ hết 30/11/2026'],
      ['cho-xu-ly', { status: 'DRAFT', keepWarning: '' }, [...base, 'Trạng thái', 'Thao tác'], 'Nháp'],
      ['dang-keep', {}, [...base, 'Hạn keep', 'Thao tác'], 'Giữ hết 30/11/2026 Sắp hết hạn'],
      ['hoan-tat', { status: 'COMPLETED', keepWarning: '', completedAt: '2026-11-19T18:00:00Z', cancelledAt: '2026-11-01T18:00:00Z' }, [...base, 'Ngày bàn giao', 'Thao tác'], '20/11/2026'],
      ['hoan-tat', { status: 'COMPLETED', keepWarning: '', completedAt: null }, [...base, 'Ngày bàn giao', 'Thao tác'], '—'],
      ['huy-hoan', { status: 'CANCELLED', keepWarning: '', cancelledAt: '2026-11-20T18:00:00Z', completedAt: '2026-11-01T18:00:00Z' }, [...base, 'Trạng thái', 'Ngày hủy/hoàn', 'Thao tác'], '21/11/2026'],
      ['huy-hoan', { status: 'CANCELLED', keepWarning: '', cancelledAt: null }, [...base, 'Trạng thái', 'Ngày hủy/hoàn', 'Thao tác'], '—'],
    ];
    for (const [nhom, patch, headings, cell] of cases) {
      const result = page('DH-000001');
      t.api.list.mockReturnValue(of({ ...result, items: [{ ...result.items[0], ...patch }] }));
      await t.go(nhom ? { nhom } : {});
      expect(Array.from(t.el.querySelectorAll('thead th'), t.text), nhom).toEqual(headings);
      const cells = Array.from(t.el.querySelectorAll('tbody td'), t.text);
      expect(cells.length, nhom).toBe(headings.length);
      expect(cells.at(-2), nhom).toBe(cell);
    }
  });
  it('opens the date row while a date is set', async () => {
    const t = await setup();
    const toggle = () => t.button('Bộ lọc');
    const dates = () => t.el.querySelectorAll('input[type=date]').length;
    expect([t.text(toggle()), toggle().getAttribute('aria-expanded'), dates()]).toEqual(['Bộ lọc', 'false', 0]);
    toggle().click();
    f(t);
    expect([toggle().getAttribute('aria-expanded'), dates()]).toEqual(['true', 2]);
    expect(t.el.querySelector('#' + toggle().getAttribute('aria-controls'))).toBeTruthy();
    toggle().click();
    f(t);
    for (const q of [{ createdTo: '2026-11-20' }, { createdFrom: '2026-11-01', createdTo: '2026-11-20' }]) {
      await t.go({});
      await t.go(q as Record<string, string>);
      expect([t.text(toggle()), dates()]).toEqual(['Bộ lọc (1)', 2]);
    }
    toggle().click();
    f(t);
    expect(dates()).toBe(0);
    await t.go({ nhom: 'hoan-tat', createdFrom: '2026-11-01', createdTo: '2026-11-20' });
    expect(dates()).toBe(0);
  });
  it('names and clears the customer filter', async () => {
    const query = { nhom: 'dang-keep', keepWarning: 'DUE', q: 'Lan', createdFrom: '2026-11-01', customerId: '3', page: '1' };
    const t = await setup('OWNER', query);
    t.api.list.mockReturnValue(of({ ...page('DH-000001'), page: 1, totalPages: 2 }));
    await t.go(query);
    expect(t.text(t.el.querySelector('.customer-filter'))).toContain('Đang xem đơn của Synthetic reader');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    (t.el.querySelector('.customer-filter button') as HTMLButtonElement).click();
    expect(navigate.mock.lastCall?.[1]?.queryParams).toEqual({ nhom: 'dang-keep', keepWarning: 'DUE', q: 'Lan', createdFrom: '2026-11-01' });
    t.button('Xóa lọc').click();
    expect(navigate.mock.lastCall?.[1]?.queryParams).toEqual({ nhom: 'dang-keep', keepWarning: 'DUE', q: 'Lan' });
    navigate.mockRestore();
    await t.go({ q: 'Lan' });
    expect(t.el.querySelector('.customer-filter')).toBeNull();
    expect(t.button('Xóa lọc')).toBeUndefined();
  });
  it('keeps counts while loading and shows the list before slow counts', async () => {
    const t = await setup();
    t.api.list.mockReturnValue(NEVER);
    t.api.stats.mockReturnValue(NEVER);
    await t.go({ nhom: 'dang-keep' });
    expect(t.tabs()[0]).toBe('Tất cả 39');
    expect(t.el.textContent).toContain('Đang tải đơn hàng…');
    t.api.list.mockReturnValue(of(page('DH-000009')));
    await t.go({ nhom: 'hoan-tat' });
    expect(t.el.textContent).toContain('DH-000009');
  });
  it('hides failed counts without failing the list', async () => {
    const t = await setup();
    t.api.stats.mockReturnValue(throwError(() => new Error('down')));
    await t.go({ nhom: 'dang-keep' });
    expect(t.tabs()).toEqual(['Tất cả', 'Chờ xử lý', 'Đang keep', 'Hoàn tất', 'Hủy/Hoàn']);
    expect(t.subs().map(t.text)).toEqual(['Tất cả', 'Quá hạn', 'Đến hạn hôm nay', 'Sắp hết hạn']);
    expect(t.subs().some((b) => b.classList.contains('zero'))).toBe(false);
    expect(t.el.textContent).toContain('DH-000001');
    expect(t.el.querySelector('[role="alert"]')).toBeNull();
  });
  it('keeps counts when only the list fails and retries both', async () => {
    const t = await setup();
    t.api.list.mockReturnValueOnce(throwError(() => new Error('down')));
    await t.go({ nhom: 'dang-keep' });
    expect(t.text(t.el.querySelector('[role="alert"]'))).toContain('Chưa tải được đơn hàng');
    expect(t.tabs()[0]).toBe('Tất cả 39');
    const calls = t.api.stats.mock.calls.length;
    t.button('Thử lại').click();
    await t.settle();
    expect(t.el.textContent).toContain('DH-000001');
    expect(t.api.stats).toHaveBeenCalledTimes(calls + 1);
  });
  it('falls back to the last page when the requested one has emptied', async () => {
    const t = await setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    t.api.list.mockReturnValue(of({ items: [], page: 5, size: 20, totalElements: 21, totalPages: 2 }));
    await t.go({ nhom: 'dang-keep', page: '5' });
    expect(navigate).toHaveBeenCalledOnce();
    expect(navigate.mock.lastCall?.[1]).toMatchObject({ queryParams: { nhom: 'dang-keep', page: 1 }, replaceUrl: true });
    expect(t.el.textContent).not.toContain('Chưa có đơn hàng phù hợp');
    navigate.mockClear();
    t.api.list.mockReturnValue(of({ items: [], page: 5, size: 20, totalElements: 0, totalPages: 0 }));
    await t.go({ nhom: 'hoan-tat', page: '5' });
    expect(navigate).not.toHaveBeenCalled();
    expect(t.el.textContent).toContain('Chưa có đơn hàng phù hợp');
  });
  it('keeps a search typed just before switching tabs', async () => {
    const t = await setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    vi.useFakeTimers();
    try {
      const input = t.el.querySelector('input[type=search]') as HTMLInputElement;
      input.value = 'Lan';
      input.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(100);
      t.params.next(convertToParamMap({ nhom: 'dang-keep' }));
      vi.advanceTimersByTime(300);
    } finally {
      vi.useRealTimers();
    }
    await t.settle();
    expect(navigate).toHaveBeenCalledOnce();
    expect(navigate.mock.lastCall?.[1]?.queryParams).toEqual({ nhom: 'dang-keep', q: 'Lan' });
    expect((t.el.querySelector('input[type=search]') as HTMLInputElement).value).toBe('Lan');
  });
  it('drops the previous session counts even when another owner signs in', async () => {
    const t = await setup();
    t.api.list.mockReturnValue(NEVER);
    t.api.stats.mockReturnValue(NEVER);
    t.auth.user.set({ id: 2, email: 'other@test', role: 'OWNER' });
    t.auth.epoch.update((v) => v + 1);
    t.f.detectChanges();
    await t.settle();
    expect(t.c.stats()).toBeNull();
    expect(t.tabs()[0]).toBe('Tất cả');
  });
  it('dims the whole-tab sub filter when the tab is empty', async () => {
    const t = await setup();
    t.api.stats.mockReturnValue(of({ ...stats, keeping: 0, soon: 0, due: 0, overdue: 0 }));
    await t.go({ nhom: 'dang-keep', keepWarning: 'OVERDUE' });
    expect(t.subs().map((b) => b.classList.contains('zero'))).toEqual([true, true, true, true]);
  });
  it('explains reversed dates beside them without asking the server', async () => {
    const t = await setup();
    const calls = [t.api.list.mock.calls.length, t.api.stats.mock.calls.length];
    await t.go({ createdFrom: '2026-11-20', createdTo: '2026-11-01' });
    expect([t.api.list.mock.calls.length, t.api.stats.mock.calls.length]).toEqual(calls);
    expect(Array.from(t.el.querySelectorAll('[role="alert"]'), t.text)).toEqual(['Từ ngày phải trước hoặc bằng Đến ngày.']);
    const dates = Array.from(t.el.querySelectorAll<HTMLInputElement>('input[type=date]'));
    expect(dates.map((i) => i.value)).toEqual(['2026-11-20', '2026-11-01']);
    const message = t.el.querySelector('[role="alert"]')!.id;
    expect(dates.map((i) => [i.getAttribute('aria-invalid'), i.getAttribute('aria-describedby')])).toEqual([['true', message], ['true', message]]);
    expect(t.button('Thử lại')).toBeUndefined();
    expect(t.el.textContent).not.toContain('Đang tải đơn hàng');
    expect(t.el.textContent).not.toContain('DH-000001');
    expect(t.tabs()[0]).toBe('Tất cả');
    t.button('Bộ lọc').click();
    t.f.detectChanges();
    expect(t.el.querySelector('[role="alert"]')).toBeTruthy();
    await t.go({ createdFrom: '2026-11-20', createdTo: '2026-11-20' });
    expect(t.el.querySelector('[role="alert"]')).toBeNull();
    expect(t.el.textContent).toContain('DH-000001');
    expect(t.tabs()[0]).toBe('Tất cả 39');
  });
  it('moves focus to the filter button when a clear button disappears', async () => {
    const t = await setup('OWNER', { customerId: '3' });
    document.body.append(t.el);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    for (const clear of [t.el.querySelector('.customer-filter button') as HTMLButtonElement, t.button('Xóa lọc')]) {
      clear.focus();
      clear.click();
      expect(t.text(document.activeElement)).toBe('Bộ lọc');
    }
  });
  it('never rewrites the search box while it is being typed in', async () => {
    const t = await setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const input = t.el.querySelector('input[type=search]') as HTMLInputElement;
    const type = (value: string) => {
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    vi.useFakeTimers();
    try {
      type('Chị ');
      vi.advanceTimersByTime(300);
      expect(navigate.mock.lastCall?.[1]?.queryParams).toEqual({ q: 'Chị' });
      t.params.next(convertToParamMap({ q: 'Chị' }));
      t.f.detectChanges();
      expect(input.value).toBe('Chị ');
      type('Chị Lan');
      t.params.next(convertToParamMap({ q: 'Chị', nhom: 'dang-keep' }));
      t.f.detectChanges();
      expect(input.value).toBe('Chị Lan');
      vi.advanceTimersByTime(300);
      expect(navigate.mock.lastCall?.[1]?.queryParams).toEqual({ q: 'Chị Lan', nhom: 'dang-keep' });
      t.params.next(convertToParamMap({ q: 'Chị Lan', nhom: 'dang-keep' }));
      t.f.detectChanges();
      expect(input.value).toBe('Chị Lan');
      type('Chị Lan A');
      vi.advanceTimersByTime(300);
      type('Chị Lan Anh');
      t.params.next(convertToParamMap({ q: 'Chị Lan A', nhom: 'dang-keep' }));
      t.f.detectChanges();
      expect(input.value).toBe('Chị Lan Anh');
      vi.advanceTimersByTime(300);
      t.params.next(convertToParamMap({ q: 'Chị Lan Anh', nhom: 'dang-keep' }));
    } finally {
      vi.useRealTimers();
    }
    await t.go({ q: 'Hoa' });
    expect(input.value).toBe('Hoa');
    await t.go({});
    expect(input.value).toBe('');
  });
  it('lets an unusable customer link be cleared', async () => {
    const t = await setup();
    t.api.list.mockReturnValue(throwError(() => new Error('400')));
    await t.go({ customerId: 'abc' });
    expect(t.text(t.el.querySelector('.customer-filter'))).toContain('Đang xem đơn của một khách');
    expect(t.button('Xóa lọc')).toBeTruthy();
  });
});
function f(t: { f: { detectChanges(): void } }) {
  t.f.detectChanges();
}
