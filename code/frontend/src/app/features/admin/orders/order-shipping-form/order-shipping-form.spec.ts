import { TestBed } from '@angular/core/testing';
import { OrderShippingForm } from './order-shipping-form';
import { vi } from 'vitest';
describe('OrderShippingForm', () => {
  const order = (patch: object = {}, totals: object = {}) =>
    ({
      status: 'KEEPING',
      items: [],
      totalQuantity: 0,
      customerNameSnapshot: 'Customer',
      serverNow: '2026-11-27T01:00:00Z',
      recipientName: 'Reader',
      recipientPhone: '0901234567',
      shippingAddress: 'Test address',
      shippingFee: 30000,
      parcelWeightGrams: 700,
      codAmount: 0,
      totals: { goodsTotal: 170000, paidAmount: 0, totalBookWeightGrams: 850, ...totals },
      ...patch,
    }) as any;
  async function shown(o: any, _mode?: 'finalize' | 'shipping') {
    const f = TestBed.createComponent(OrderShippingForm);
    f.detectChanges();
    f.componentInstance.load(o);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    const input = f.nativeElement.querySelector('input[name=weight]') as HTMLInputElement;
    const hint = () => input.closest('label')!.querySelector('small')?.textContent.trim().replace(/\s+/g, ' ');
    const repaint = async () => {
      f.componentInstance.conflict.set(true);
      f.componentInstance.conflict.set(false);
      f.changeDetectorRef.markForCheck();
      f.detectChanges();
      await f.whenStable();
    };
    return { f, c: f.componentInstance, input, hint, repaint };
  }
  it('suggests the book weight plus packaging for a new parcel', async () => {
    for (const [o, mode] of [
      [order(), 'finalize'],
    ] as const) {
      const t = await shown(o, mode);
      expect(t.input.value, mode).toBe('1850');
      expect(t.hint(), mode).toBe('Sách 850 g + 1.000 g đóng gói');
      expect(t.c.dirty(), mode).toBe(false);
    }
  });
  it('keeps the saved weight when editing a bill', async () => {
    const t = await shown(order({ status: 'READY_TO_SHIP' }), 'shipping');
    expect(t.input.value).toBe('700');
    expect(t.hint()).toBeUndefined();
    t.c.rebase(order({ status: 'READY_TO_SHIP' }, { totalBookWeightGrams: 900 }));
    expect(t.c.model.parcelWeightGrams).toBe(700);
  });
  it('asks for the real weight when the book weight is unknown, empty or too large', async () => {
    for (const totalBookWeightGrams of [null, 0, Number.MAX_SAFE_INTEGER]) {
      const t = await shown(order({}, { totalBookWeightGrams }), 'finalize');
      expect(t.input.value, String(totalBookWeightGrams)).toBe('');
      expect(t.hint(), String(totalBookWeightGrams)).toBe('Chưa đủ trọng lượng sách, nhập số cân thật');
      expect(t.c.valid()).toBe(false);
    }
  });
  it('recalculates an untouched suggestion after a refresh and still asks for review', async () => {
    const t = await shown(order(), 'finalize');
    t.c.rebase(order({}, { totalBookWeightGrams: 900 }));
    await t.repaint();
    expect(t.c.model.parcelWeightGrams).toBe(1900);
    expect(t.hint()).toBe('Sách 900 g + 1.000 g đóng gói');
    expect(t.c.reviewRequired).toBe(true);
    expect(t.c.valid()).toBe(false);
  });
  it('never replaces a weight the owner typed or cleared', async () => {
    for (const [typed, kept] of [['1200', 1200], ['', null]] as const) {
      const t = await shown(order(), 'finalize');
      t.input.value = typed;
      t.input.dispatchEvent(new Event('input'));
      t.c.rebase(order({}, { totalBookWeightGrams: 900 }));
      expect(t.c.model.parcelWeightGrams).toBe(kept);
      t.c.load(order());
      expect(t.c.model.parcelWeightGrams).toBe(1850);
      t.c.rebase(order({}, { totalBookWeightGrams: 900 }));
      expect(t.c.model.parcelWeightGrams).toBe(1900);
    }
  });
  it('sends the suggested weight', async () => {
    const t = await shown(order(), 'finalize');
    const sent = vi.fn();
    t.c.saved.subscribe(sent);
    t.c.submit();
    expect(sent.mock.calls[0][0]).toMatchObject({ parcelWeightGrams: 1850, parcelWeightOverridden: true, parcelWeightConfirmed: true });
  });
  it('takes its mode from the order and saves a bill or edits it', async () => {
    expect((await shown(order())).c.mode).toBe('finalize');
    expect((await shown(order({ status: 'DRAFT' }))).c.mode).toBe('finalize');
    const t = await shown(order({ status: 'READY_TO_SHIP' }));
    expect(t.c.mode).toBe('shipping');
    expect(t.f.nativeElement.querySelector('h2').textContent.trim()).toBe('Nội bộ · không gửi khách');
    expect(t.f.nativeElement.querySelector('dialog')).toBeNull();
  });
  it('only shows a completed or returned bill', async () => {
    for (const o of [order({ status: 'COMPLETED' }), order({ status: 'CANCELLED', returns: [{}] })]) {
      const t = await shown(o);
      expect(t.c.readOnly()).toBe(true);
      expect(t.f.nativeElement.querySelector('fieldset').disabled).toBe(true);
      const labels = Array.from(t.f.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).map((b) => b.textContent!.trim());
      for (const hidden of ['Lưu bill', 'Hoàn tác', 'Nhận cọc']) expect(labels).not.toContain(hidden);
      expect(t.input.value).toBe('700');
    }
    expect((await shown(order())).c.readOnly()).toBe(false);
  });
  it('reports what is typed so the bill can follow it', async () => {
    const t = await shown(order());
    const drafts: any[] = [];
    t.c.changed.subscribe((d) => drafts.push(d));
    const fee = t.f.nativeElement.querySelector('input[name=fee]') as HTMLInputElement;
    fee.value = '45000';
    fee.dispatchEvent(new Event('input', { bubbles: true }));
    expect(drafts.at(-1)).toMatchObject({ shippingFee: 45000 });
    expect(t.c.dirty()).toBe(true);
  });
  it('edits the recipient and fee on the bill and names what is still missing', async () => {
    const t = await shown(order({ recipientName: null, recipientPhone: null, shippingAddress: null, shippingFee: null, customerPhoneSnapshot: '0907777777' }));
    const bill = t.f.nativeElement.querySelector('.bill') as HTMLElement;
    expect((bill.querySelector('input[name=name]') as HTMLInputElement).value).toBe('Customer');
    expect((bill.querySelector('input[name=phone]') as HTMLInputElement).value).toBe('0907777777');
    expect(bill.querySelector('input[name=fee]')).not.toBeNull();
    expect(t.c.dirty()).toBe(false);
    expect(t.f.nativeElement.querySelector('.missing').textContent).toContain('địa chỉ, phí ship');
    const modes = Array.from(t.f.nativeElement.querySelectorAll('.internal input[name=mode]') as NodeListOf<HTMLInputElement>, (r) => r.closest('label')!.textContent!.trim());
    expect(modes).toEqual(['Người nhận thanh toán', 'Thanh toán cuối tháng']);
  });
  it('asks only the recipient for a pickup and charges no shipping', async () => {
    const t = await shown(order({ shippingAddress: null, shippingFee: null, parcelWeightGrams: null }));
    const el = t.f.nativeElement as HTMLElement;
    expect(Array.from(el.querySelectorAll('.internal input[name=carrier]') as NodeListOf<HTMLInputElement>, (r) => r.value)).toEqual(['JNT', 'SPX', 'PICKUP']);
    expect(t.c.model.shippingProvider).toBe('JNT');
    t.c.chooseCarrier('PICKUP');
    t.f.detectChanges();
    expect(el.querySelector('.bill input[name=fee]')).toBeNull();
    expect(el.querySelector('.bill textarea[name=address]')).toBeNull();
    expect(el.querySelector('.bill-fee')!.textContent).toContain('Khách tự lấy');
    for (const gone of ['weight', 'cod', 'mode']) expect(el.querySelector(`.internal [name=${gone}]`), gone).toBeNull();
    expect(t.c.missing()).toEqual([]);
    expect(t.c.valid()).toBe(true);
    const sent: any[] = [];
    t.c.saved.subscribe((b) => sent.push(b));
    t.c.submit();
    expect(sent[0]).toMatchObject({ shippingProvider: 'PICKUP', shippingFee: 0, codAmount: 0, parcelWeightGrams: null, customerPaymentMode: null });
  });
  it('undoes back to the saved values', async () => {
    const t = await shown(order());
    const drafts: any[] = [];
    t.c.changed.subscribe((d) => drafts.push(d));
    t.c.model.recipientName = 'Someone else';
    expect(t.c.dirty()).toBe(true);
    t.c.undo();
    expect(t.c.model.recipientName).toBe('Reader');
    expect(t.c.dirty()).toBe(false);
    expect(drafts.at(-1)).toMatchObject({ recipientName: 'Reader' });
  });
  it('keeps typed text when the order reloads underneath', async () => {
    const t = await shown(order());
    t.c.model.recipientName = 'Typed name';
    t.c.model.shippingFee = 12345;
    t.c.rebase(order({}, { paidAmount: 50000 }));
    expect(t.c.model.recipientName).toBe('Typed name');
    expect(t.c.model.shippingFee).toBe(12345);
    expect(t.c.dirty()).toBe(true);
  });
  it('leaves the money to the bill and offers a deposit only while monthly or pickup still owes', async () => {
    const deposit = (t: any) =>
      Array.from(t.f.nativeElement.querySelectorAll('.internal button') as NodeListOf<HTMLButtonElement>).find((b) => b.textContent!.trim() === 'Nhận cọc');
    let t = await shown(order());
    expect(t.f.nativeElement.querySelector('.internal .notice')).toBeNull();
    expect(t.f.nativeElement.querySelector('.internal').textContent).not.toContain('Đã nhận');
    expect(deposit(t)).toBeUndefined();
    t = await shown(order({ customerPaymentMode: 'MONTHLY' }));
    expect(t.f.nativeElement.querySelector('.internal').textContent).toContain('Còn thiếu 200.000đ');
    const asked = vi.fn();
    t.c.paymentRequested.subscribe(asked);
    deposit(t)!.click();
    expect(asked).toHaveBeenCalledOnce();
    t = await shown(order({ shippingProvider: 'PICKUP', shippingFee: 0 }));
    expect(t.f.nativeElement.querySelector('.internal').textContent).toContain('Còn thiếu 170.000đ');
    expect(deposit(t)).toBeDefined();
    t = await shown(order({ shippingProvider: 'PICKUP', shippingFee: 0 }, { paidAmount: 170000 }));
    expect(deposit(t)).toBeUndefined();
  });
  it('turns read-only with the saved values when the order is finished elsewhere', async () => {
    const t = await shown(order({ status: 'READY_TO_SHIP' }));
    t.c.model.recipientName = 'Typed name';
    t.c.rebase(order({ status: 'COMPLETED' }));
    expect(t.c.readOnly()).toBe(true);
    expect(t.c.model.recipientName).toBe('Reader');
    expect(t.c.dirty()).toBe(false);
  });
});
