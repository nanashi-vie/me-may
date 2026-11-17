import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
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
  const auth = { user: signal({ id: 1, role: 'OWNER' }), epoch: signal(0) };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: {
          paramMap: new BehaviorSubject(convertToParamMap({ id })),
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
  return { f, c: f.componentInstance, api, auth };
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
});
