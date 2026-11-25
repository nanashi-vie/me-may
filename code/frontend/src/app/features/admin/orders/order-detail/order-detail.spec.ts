import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { OrderDetailPage } from './order-detail';
import { OrderApi } from '../order-api';
import { CustomerApi } from '../../customers/customer-api';
import { AuthService } from '../../../../core/auth/auth.service';
export const detail: any = {
  id: '1',
  orderCode: 'DH-000001',
  customerId: '7',
  customerNameSnapshot: 'Reader',
  status: 'KEEPING',
  version: 3,
  fulfillmentType: 'KEEP',
  items: [],
  payments: [],
  shipments: [],
  notes: [],
  returns: [],
  totals: {
    subtotal: 0,
    goodsTotal: 0,
    paidAmount: 0,
    orderTotal: null,
    balance: null,
    provisional: true,
    totalBookWeightGrams: null,
    paymentStatus: 'PROVISIONAL',
  },
  serverNow: '2026-11-17T01:00:00Z',
  keepStartedAt: '2026-11-01T01:00:00Z',
  keepUntil: '2026-11-15T17:00:00Z',
  requiredDepositVnd: 100000,
};
const reader: any = { id: '7', customerCode: 'KH-000007', fullName: 'Yến Nhi', phone: '0985642424', status: 'ACTIVE' };
const readers = { items: [reader], page: 0, size: 20, totalElements: 41, totalPages: 3 };
async function setup(id = '1', queryParams: Record<string, string> = {}, page: any = { items: [], totalPages: 0 }) {
  const api = {
    detail: vi.fn(() => of(detail)),
    command: vi.fn((..._args: any[]) => of({ id: '1', version: 4, status: 'KEEPING' })),
    removeItem: vi.fn((..._args: any[]) => of({ id: '1', version: 4 })),
    create: vi.fn(() => of({ id: '2', version: 0 })),
    list: vi.fn(() => of({ items: [], totalPages: 0 })),
    catalog: vi.fn(() => of({ items: [], totalPages: 0 })),
    matches: vi.fn(() => of({ items: [] })),
  };
  const params = new BehaviorSubject(convertToParamMap({ id }));
  const auth = { user: signal({ id: 1, role: 'OWNER' }), epoch: signal(0) };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: {
          paramMap: params,
          snapshot: { queryParams },
        },
      },
      { provide: OrderApi, useValue: api },
      { provide: CustomerApi, useValue: { list: vi.fn(() => of(page)), detail: vi.fn(() => of(reader)) } },
      { provide: AuthService, useValue: auth },
    ],
  });
  const f = TestBed.createComponent(OrderDetailPage);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return { f, c: f.componentInstance, api, auth, params };
}
describe('OrderDetail', () => {
  it('offers the unsuccessful-return action only for completed orders', async () => {
    const { f, c } = await setup();
    c.totalTab.set(true);
    for (const status of ['DRAFT', 'KEEPING', 'READY_TO_SHIP', 'COMPLETED', 'UNSUCCESSFUL', 'CANCELLED']) {
      c.order.set({ ...detail, status });
      f.detectChanges();
      expect(f.nativeElement.textContent.includes('Đơn không thành công / hoàn về'), status).toBe(status === 'COMPLETED');
      expect(f.nativeElement.textContent.includes('Hủy đơn'), status).toBe(['DRAFT', 'KEEPING', 'READY_TO_SHIP'].includes(status));
    }
  });
  it('summarises the finished keep of handed-over orders only', async () => {
    const { f, c } = await setup();
    const line = () => f.nativeElement.querySelector('.keep-summary')?.textContent.trim().replace(/\s+/g, ' ');
    const shipments = [
      { handedOverAt: '2026-11-03T18:00:00Z' },
      { handedOverAt: null },
      { handedOverAt: '2026-11-20T01:00:00Z' },
    ];
    for (const status of ['COMPLETED', 'UNSUCCESSFUL']) {
      c.order.set({ ...detail, status, shipments });
      f.detectChanges();
      expect(line(), status).toBe('Đã keep 01/11/2026 → bàn giao 04/11/2026 (hạn 15/11/2026)');
    }
    for (const patch of [
      { status: 'KEEPING' },
      { status: 'READY_TO_SHIP' },
      { status: 'CANCELLED' },
      { status: 'COMPLETED', keepStartedAt: null, keepUntil: null },
    ]) {
      c.order.set({ ...detail, shipments, ...patch });
      f.detectChanges();
      expect(line(), JSON.stringify(patch)).toBeUndefined();
    }
  });
  it('labels a cancelled order apart from a closed return', async () => {
    const { f, c } = await setup();
    const badge = () => f.nativeElement.querySelector('.heading .badge').textContent.trim();
    c.order.set({ ...detail, status: 'CANCELLED' });
    f.detectChanges();
    expect(badge()).toBe('Đã hủy');
    c.order.set({ ...detail, status: 'CANCELLED', returns: [{ id: '1' }] });
    f.detectChanges();
    expect(badge()).toBe('Đã hoàn đơn');
  });
  it('requires reason before deleting keep item and retains form after validation rejection', async () => {
    const { c, api } = await setup();
    c.remove({ id: '9', titleSnapshot: 'Book', quantity: 2 } as any);
    c.submitAction();
    expect(api.removeItem).not.toHaveBeenCalled();
    c.actionReason = 'Khách đổi ý';
    api.removeItem.mockReturnValue(
      throwError(() => ({ status: 400, error: { error: 'invalid_request' } })) as any,
    );
    c.submitAction();
    expect(api.removeItem.mock.calls[0][2].reason).toBe('Khách đổi ý');
    expect(c.actionReason).toBe('Khách đổi ý');
    expect(c.panel()).toBe('remove');
  });
  it('retries indeterminate write with identical key and body, then reads fresh detail', async () => {
    const { c, api } = await setup();
    api.command.mockReturnValueOnce(throwError(() => ({ status: 0 })) as any);
    c.mutate('keep', { allowInsufficientDeposit: true, reason: 'Exception' });
    expect(c.pending()).toBeTruthy();
    const sent = api.command.mock.calls[0][2];
    c.retry();
    expect(api.command.mock.calls[1][2]).toEqual(sent);
    expect(api.detail).toHaveBeenCalledTimes(2);
    expect(c.order()?.version).toBe(3);
  });
  it('clamps overdue progress and guards pending state', async () => {
    const { c } = await setup();
    expect(c.keepProgress()).toBe(100);
    expect(c.keepText()).toContain('Quá hạn');
    c.pending.set({ kind: 'command', action: 'keep', body: { version: 3, requestId: 'x' } } as any);
    const spy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(c.canLeave()).toBe(false);
    spy.mockRestore();
  });
  it('quick-created active customer is selected and archived is rejected', async () => {
    const { c, api } = await setup('');
    c.customerSaved({ id: '7', status: 'ACTIVE', fullName: 'New' } as any);
    expect(c.selectedCustomer()?.id).toBe('7');
    expect(api.list).toHaveBeenCalled();
    c.customerSaved({ id: '8', status: 'ARCHIVED' } as any);
    expect(c.selectedCustomer()?.id).toBe('7');
  });
  it('ignores refresh for a previous routed order and stale overlapping versions', async () => {
    const { c, f, api, params } = await setup();
    const delayed = new Subject<any>();
    api.detail.mockReturnValueOnce(delayed as any);
    c.refresh();
    api.detail.mockReturnValueOnce(of({ ...detail, id: '2', orderCode: 'DH-000002', version: 8 }));
    params.next(convertToParamMap({ id: '2' }));
    f.detectChanges();
    await f.whenStable();
    delayed.next({ ...detail, version: 4 });
    delayed.complete();
    expect(c.order()?.id).toBe('2');
    const older = new Subject<any>(),
      newer = new Subject<any>();
    api.detail.mockReturnValueOnce(older as any).mockReturnValueOnce(newer as any);
    c.refresh();
    c.refresh();
    newer.next({ ...detail, id: '2', version: 10 });
    newer.complete();
    older.next({ ...detail, id: '2', version: 9 });
    older.complete();
    expect(c.order()?.version).toBe(10);
  });
  for (const kind of ['item', 'shipping'] as const)
    it('recovers ' + kind + ' version conflict inside dialog without losing draft', async () => {
      const { c, f, api } = await setup();
      const form = kind === 'item' ? c.itemForm()! : c.shippingForm()!;
      if (kind === 'item') {
        c.itemForm()!.open(c.order()!);
        c.itemForm()!.model.unitPriceVnd = 123456;
      } else {
        c.shippingForm()!.open(c.order()!, 'finalize');
        c.shippingForm()!.model.recipientName = 'Changed recipient';
        c.shippingForm()!.model.codConfirmed = true;
        c.shippingForm()!.model.parcelWeightConfirmed = true;
      }
      api.command.mockReturnValueOnce(
        throwError(() => ({ status: 409, error: { error: 'version_conflict' } })) as any,
      );
      c.mutate('finalize', {});
      f.detectChanges();
      const button = Array.from(
        f.nativeElement.querySelectorAll('dialog button'),
      ) as HTMLButtonElement[];
      const reload = button.find((b) => b.textContent?.trim() === 'Tải lại dữ liệu đơn');
      expect(reload).toBeTruthy();
      api.detail.mockReturnValueOnce(of({ ...detail, version: 4 }));
      reload!.click();
      f.detectChanges();
      await f.whenStable();
      expect(c.order()?.version).toBe(4);
      expect(form.visible()).toBe(true);
      if (kind === 'item') expect(c.itemForm()!.model.unitPriceVnd).toBe(123456);
      else {
        expect(c.shippingForm()!.model.recipientName).toBe('Changed recipient');
        expect(c.shippingForm()!.model.codConfirmed).toBe(false);
        expect(c.shippingForm()!.model.parcelWeightConfirmed).toBe(false);
      }
      c.mutate('finalize', {});
      expect(api.command.mock.calls.at(-1)![2].version).toBe(4);
    });
  it('delegates dirty and pending quick-customer navigation protection', async () => {
    const { c } = await setup('');
    const child = c.customerForm()!;
    child.open();
    child.form.controls.fullName.setValue('Unsaved customer');
    child.form.markAsDirty();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(c.canLeave()).toBe(false);
    child.busy.set(true);
    expect(c.canLeave()).toBe(false);
    confirm.mockRestore();
  });
  describe('customer picker', () => {
    const wait = (ms = 0) => new Promise((r) => setTimeout(r, ms));
    async function picker(id = '', queryParams = {}) {
      const r = await setup(id, queryParams, readers);
      r.f.autoDetectChanges();
      await wait(400);
      const el = r.f.nativeElement as HTMLElement;
      const button = (label: string) =>
        [...el.querySelectorAll('button')].find((b) => b.textContent!.includes(label));
      return { ...r, el, button, settle: () => wait(20) };
    }
    const expectCollapsed = (el: HTMLElement) => {
      expect(el.querySelector('.order-panel input[type=search]')).toBeNull();
      expect(el.querySelector('.catalog-results')).toBeNull();
      expect(el.querySelector('app-pagination')).toBeNull();
      expect(el.querySelector('.order-panel')!.textContent).not.toContain('Thêm khách mới');
      expect(el.querySelector('.picked-customer')!.textContent).toContain('Yến Nhi');
      expect(el.querySelector('.picked-customer')!.textContent).toContain('0985642424');
    };
    it('collapses after choosing in a new order and focuses the change button', async () => {
      const { el, button, settle } = await picker();
      button('KH-000007')!.click();
      await settle();
      expectCollapsed(el);
      expect(document.activeElement).toBe(button('Đổi khách'));
    });
    it('collapses for a quick-created customer', async () => {
      const { c, el, settle } = await picker();
      c.customerForm()!.saved.emit(reader);
      await settle();
      expectCollapsed(el);
    });
    it('collapses for a customer preselected by the link without stealing focus', async () => {
      const { el } = await picker('', { customerId: '7' });
      expectCollapsed(el);
      expect(document.activeElement).toBe(document.body);
    });
    it('reopens with the same query, page and order type but no customer', async () => {
      const { c, el, button, settle } = await picker();
      c.customerQ = 'nhi';
      c.searchCustomers(2);
      await wait(400);
      c.fulfillmentType = 'IMMEDIATE';
      button('KH-000007')!.click();
      await settle();
      button('Đổi khách')!.click();
      await settle();
      expect([c.selectedCustomer(), c.customerQ, c.customerPageNumber, c.fulfillmentType]).toEqual([null, 'nhi', 2, 'IMMEDIATE']);
      expect(el.querySelector('.catalog-results')!.textContent).toContain('KH-000007');
      expect(document.activeElement?.getAttribute('type')).toBe('search');
      expect(el.textContent).not.toContain('Tạo đơn nháp cho khách');
    });
    it('stays open when the chosen customer is archived', async () => {
      const { c, el, settle } = await picker();
      c.customerSaved({ ...reader, status: 'ARCHIVED' });
      await settle();
      expect(el.querySelector('.picked-customer')).toBeNull();
      expect(el.querySelector('.catalog-results')).not.toBeNull();
    });
    it('drops a late keep lookup after changing customer', async () => {
      const { c, api, settle } = await picker();
      const late = new Subject<any>();
      api.list.mockReturnValueOnce(late as any);
      c.customerSaved(reader);
      c.changeCustomer();
      late.next({ items: [], totalElements: 2, totalPages: 1 });
      await settle();
      expect(c.existingKeeps()).toBeNull();
      late.error(new Error('late'));
      expect(c.keepError()).toBe('');
    });
    it('retries a failed keep lookup beside the collapsed customer', async () => {
      const { c, api, el, button, settle } = await picker();
      api.list.mockReturnValueOnce(throwError(() => new Error('offline')));
      c.customerSaved(reader);
      await settle();
      expect(el.querySelector('[role=alert]')!.textContent).toContain('Chưa kiểm tra được đơn đang keep');
      button('Thử lại')!.click();
      await settle();
      expect(c.keepError()).toBe('');
      expect(c.existingKeeps()).not.toBeNull();
    });
    it('a failed customer list neither blocks nor mislabels the chosen customer', async () => {
      const { c, f, el, button, settle } = await picker();
      c.customerSaved(reader);
      vi.spyOn(TestBed.inject(CustomerApi), 'list').mockReturnValue(throwError(() => new Error('offline')));
      c.searchCustomers();
      await wait(400);
      await settle();
      expect(el.textContent).not.toContain('Chưa tải được khách hàng');
      expect(button('Tạo đơn nháp cho khách')!.disabled).toBe(false);
      button('Đổi khách')!.click();
      await settle();
      expect(el.textContent).toContain('Chưa tải được khách hàng');
      expect(f.componentInstance.selectedCustomer()).toBeNull();
    });
    it('a failed keep lookup still blocks creating the order', async () => {
      const { c, api, button, settle } = await picker();
      api.list.mockReturnValueOnce(throwError(() => new Error('offline')));
      c.customerSaved(reader);
      await settle();
      expect(button('Tạo đơn nháp cho khách')!.disabled).toBe(true);
      c.create();
      expect(api.create).not.toHaveBeenCalled();
    });
    async function editing() {
      const r = await picker('1');
      r.c.order.set({ ...detail, status: 'DRAFT' });
      r.c.openPanel('edit');
      await r.settle();
      const type = async () => {
        const input = r.el.querySelector('input[name=customerQ]') as HTMLInputElement;
        input.value = 'nhi';
        input.dispatchEvent(new Event('input'));
        await wait(400);
      };
      return { ...r, type };
    }
    it('collapses the draft edit picker and can keep the current customer', async () => {
      const { c, el, button, settle, type } = await editing();
      expect(el.querySelector('.catalog-results')).toBeNull();
      await type();
      button('KH-000007')!.click();
      await settle();
      expect(el.querySelector('input[name=customerQ]')).toBeNull();
      expect(el.querySelector('.catalog-results')).toBeNull();
      expect(el.querySelector('.picked-customer')!.textContent).toContain('Yến Nhi');
      button('Đổi khách')!.click();
      await settle();
      expect((el.querySelector('input[name=customerQ]') as HTMLInputElement).value).toBe('nhi');
      button('KH-000007')!.click();
      await settle();
      button('Giữ khách hiện tại')!.click();
      await settle();
      expect([c.selectedCustomer(), c.customerQ]).toEqual([null, '']);
      expect(el.querySelector('.catalog-results')).toBeNull();
    });
    it('forgets an unsaved customer when the edit panel closes or reopens', async () => {
      const { c, button, settle, type } = await editing();
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
      await type();
      button('KH-000007')!.click();
      await settle();
      c.closePanel();
      expect([c.selectedCustomer(), c.customerQ]).toEqual([null, '']);
      c.selectedCustomer.set(reader);
      c.openPanel('edit');
      expect(c.selectedCustomer()).toBeNull();
      confirm.mockRestore();
    });
  });
});
