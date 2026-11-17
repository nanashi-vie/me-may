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
async function setup(id = '1') {
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
          snapshot: { queryParams: {} },
        },
      },
      { provide: OrderApi, useValue: api },
      { provide: CustomerApi, useValue: { list: vi.fn(() => of({ items: [], totalPages: 0 })) } },
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
});
