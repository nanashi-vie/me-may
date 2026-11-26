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
    recordPayment: vi.fn((..._args: any[]) => of({ id: '1', version: 4, status: 'KEEPING' })),
    proofUrl: vi.fn((id: string, p: string) => '/proof/' + id + '/' + p),
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
  const png = () => new File([new Uint8Array([137, 80, 78, 71])], 'bill.png', { type: 'image/png' });
  const buttonNamed = (f: any, name: string) =>
    (Array.from(f.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent!.trim() === name);
  it('offers a deposit while open and a refund only while the shop holds money', async () => {
    const { f, c } = await setup();
    for (const [status, paid, deposit, refund] of [
      ['KEEPING', 0, true, false],
      ['KEEPING', 1000, true, true],
      ['CANCELLED', 1000, false, true],
      ['CANCELLED', 0, false, false],
    ] as const) {
      c.order.set({ ...detail, status, totals: { ...detail.totals, paidAmount: paid } });
      f.detectChanges();
      expect(!!buttonNamed(f, 'Nhận cọc'), status + paid).toBe(deposit);
      expect(!!buttonNamed(f, 'Hoàn tiền'), status + paid).toBe(refund);
      expect(buttonNamed(f, 'Ghi nhận thu tiền')).toBeUndefined();
    }
  });
  it('asks only amount, receipt image and note, and needs the image before sending', async () => {
    const { f, c, api } = await setup();
    c.openPayment('DEPOSIT');
    f.detectChanges();
    const dialog = f.nativeElement.querySelector('#payment-dialog') as HTMLElement;
    expect(dialog.querySelector('h2')!.textContent!.trim()).toBe('Nhận cọc');
    expect(dialog.querySelector('select, [name=time], [name=method]')).toBeNull();
    expect(dialog.querySelector('input[type=file]')!.getAttribute('accept')).toBe('image/jpeg,image/png');
    c.payment.amount = 100000;
    c.submitAction();
    expect(api.recordPayment).not.toHaveBeenCalled();
    expect(c.proofError()).toBe('Chọn ảnh bill chuyển khoản.');
    c.chooseProof(new File(['x'], 'a.gif', { type: 'image/gif' }));
    expect(c.proofError()).toBe('Chỉ nhận ảnh JPG hoặc PNG.');
    c.chooseProof(new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' }));
    expect(c.proofError()).toBe('Ảnh tối đa 10 MB.');
    expect(c.paymentProof()).toBeNull();
    const file = png();
    c.chooseProof(file);
    c.payment.note = 'Đợt 1';
    c.submitAction();
    const [id, body, proof] = api.recordPayment.mock.calls[0] as any[];
    expect(id).toBe('1');
    expect(proof).toBe(file);
    expect(body).toMatchObject({ transactionType: 'DEPOSIT', amount: 100000, note: 'Đợt 1', version: 3 });
    expect(body.requestId).toBeTruthy();
    expect(body).not.toHaveProperty('paymentMethod');
    expect(body).not.toHaveProperty('occurredAt');
  });
  it('titles the refund form and still asks to confirm the actual refund', async () => {
    const { f, c, api } = await setup();
    c.order.set({ ...detail, totals: { ...detail.totals, paidAmount: 5000 } });
    c.openPayment('REFUND');
    f.detectChanges();
    expect(f.nativeElement.querySelector('#payment-dialog h2').textContent.trim()).toBe('Hoàn tiền');
    c.payment.amount = 5000;
    c.chooseProof(png());
    c.submitAction();
    expect(api.recordPayment).not.toHaveBeenCalled();
    c.actualConfirmed = true;
    c.submitAction();
    expect((api.recordPayment.mock.calls[0] as any[])[1]).toMatchObject({ transactionType: 'REFUND', actualConfirmed: true });
  });
  it('keeps amount, note and receipt and resends the same request after a network failure', async () => {
    const { c, api } = await setup();
    api.recordPayment.mockReturnValueOnce(throwError(() => ({ status: 0 })) as any);
    c.openPayment('DEPOSIT');
    const file = png();
    c.payment.amount = 100000;
    c.chooseProof(file);
    c.submitAction();
    expect(c.pending()).toBeTruthy();
    c.retry();
    const [first, second] = api.recordPayment.mock.calls as any[];
    expect(second[1]).toEqual(first[1]);
    expect(second[2]).toBe(file);
    expect(c.payment.amount).toBe(100000);
  });
  it('shows receipt thumbnails without a payment method and opens the large image', async () => {
    const { f, c } = await setup();
    const base = { amount: 1000, occurredAt: '2026-11-20T01:00:00Z', createdBy: '1', note: null, voidedAt: null, voidReason: null };
    c.order.set({ ...detail, payments: [
      { ...base, id: '9', transactionType: 'DEPOSIT', hasProof: true },
      { ...base, id: '10', transactionType: 'REFUND', hasProof: false },
    ] });
    c.totalTab.set(true);
    f.detectChanges();
    const ledger = f.nativeElement.querySelector('table.ledger') as HTMLElement;
    expect(ledger.textContent).not.toContain('BANK_TRANSFER');
    expect(ledger.textContent).toContain('Không có ảnh');
    const thumb = ledger.querySelector('button.proof-thumb img') as HTMLImageElement;
    expect(thumb.getAttribute('src')).toBe('/proof/1/9');
    (thumb.parentElement as HTMLButtonElement).click();
    f.detectChanges();
    expect(c.viewing()?.id).toBe('9');
    expect(f.nativeElement.querySelector('#proof-viewer img').getAttribute('src')).toBe('/proof/1/9');
  });
  it('offers a one-step return only for completed orders and no resend actions', async () => {
    const { f, c, api } = await setup();
    c.totalTab.set(true);
    for (const status of ['DRAFT', 'KEEPING', 'READY_TO_SHIP', 'COMPLETED', 'CANCELLED']) {
      c.order.set({ ...detail, status });
      f.detectChanges();
      const text = f.nativeElement.textContent;
      expect(!!buttonNamed(f, 'Hoàn đơn'), status).toBe(status === 'COMPLETED');
      expect(text.includes('Hủy đơn'), status).toBe(['DRAFT', 'KEEPING', 'READY_TO_SHIP'].includes(status));
      for (const gone of ['không thành công', 'Không thành công', 'gửi lại', 'Gửi lại'])
        expect(text.includes(gone), status + gone).toBe(false);
    }
    const item = { id: '5', sourceType: 'CATALOG', titleSnapshot: 'Sách', unitPriceVnd: 1, quantity: 1 };
    c.order.set({ ...detail, status: 'COMPLETED', items: [item] });
    f.detectChanges();
    buttonNamed(f, 'Hoàn đơn')!.click();
    f.detectChanges();
    expect(f.nativeElement.querySelector('#action-title').textContent.trim()).toBe('Hoàn đơn & nhập lại tồn');
    c.actionReason = 'Khách không nhận';
    c.actualConfirmed = true;
    c.returns[0].quantityReceived = 1;
    c.returns[0].quantityRestocked = 1;
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    c.submitAction();
    expect(api.command.mock.calls.at(-1)![1]).toBe('return');
    vi.restoreAllMocks();
  });
  it('labels ready orders as being packed', async () => {
    const { STATUS_LABELS } = await import('../order-models');
    expect(STATUS_LABELS.READY_TO_SHIP).toBe('Đang đóng gói');
    expect(Object.values(STATUS_LABELS)).not.toContain('Chờ giao');
  });
  it('summarises the finished keep of handed-over orders only', async () => {
    const { f, c } = await setup();
    const line = () => f.nativeElement.querySelector('.keep-summary')?.textContent.trim().replace(/\s+/g, ' ');
    const shipments = [
      { handedOverAt: '2026-11-03T18:00:00Z' },
      { handedOverAt: null },
      { handedOverAt: '2026-11-20T01:00:00Z' },
    ];
    for (const status of ['COMPLETED']) {
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
  it('offers the customer bill on both tabs once there is a book and the order is open', async () => {
    const { f, c } = await setup();
    const item = { id: '1', sourceType: 'MANUAL', titleSnapshot: 'Sách thử', unitPriceVnd: 75000, quantity: 2 };
    const button = () => Array.from(f.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find((b) => b.textContent!.trim() === 'Xem bill gửi khách');
    for (const total of [false, true]) {
      c.totalTab.set(total);
      for (const status of ['DRAFT', 'KEEPING', 'READY_TO_SHIP', 'COMPLETED', 'CANCELLED']) {
        c.order.set({ ...detail, status, items: [item] });
        f.detectChanges();
        expect(!!button(), status).toBe(status !== 'CANCELLED');
      }
      c.order.set(detail);
      f.detectChanges();
      expect(button()).toBeUndefined();
    }
    const shipment = { state: 'PLANNED', shippingSnapshot: { declaredValue: 150000, shippingFee: 30000 } };
    const totals = { ...detail.totals, goodsTotal: 150000, orderTotal: 180000, balance: 180000 };
    for (const [status, provisional] of [['KEEPING', true], ['READY_TO_SHIP', false]] as const) {
      c.order.set({ ...detail, status, items: [item], shipments: [shipment], shippingFee: 30000, totalQuantity: 2, totals });
      f.detectChanges();
      button()!.click();
      f.detectChanges();
      const bill = f.nativeElement.querySelector('.bill');
      expect(bill.textContent, status).toContain('Sách thử');
      expect(bill.textContent.includes('chưa gồm phí ship'), status).toBe(provisional);
    }
    c.order.set(null);
    f.detectChanges();
    expect(f.nativeElement.querySelector('.bill')).toBeNull();
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
