import { TestBed } from '@angular/core/testing';
import { OrderShippingForm } from './order-shipping-form';
import { vi } from 'vitest';
describe('OrderShippingForm', () => {
  it('resend adds only extra shipping and declares goods without shipping or payment deduction', () => {
    const f = TestBed.createComponent(OrderShippingForm);
    const c = f.componentInstance;
    c.open(
      {
        status: 'UNSUCCESSFUL',
        recipientName: 'Reader',
        recipientPhone: '0901234567',
        shippingAddress: 'Test address',
        shippingFee: 30000,
        parcelWeightOverridden: false,
        totals: { goodsTotal: 170000, paidAmount: 100000, totalBookWeightGrams: 500 },
        codAmount: 100000,
        shippingPaymentType: 'PP_CASH',
      } as any,
      'resend',
    );
    c.model.additionalShippingFee = 20000;
    expect(c.billTotal()).toBe(220000);
    expect(c.declaredValue()).toBe(170000);
    expect(c.model.codConfirmed).toBe(false);
    expect(c.model.shippingPaymentType).toBe('PP_CASH');
    const sent = vi.fn();
    c.saved.subscribe(sent);
    c.model.codConfirmed = true;
    c.model.customerPaymentMode = 'RECIPIENT';
    c.model.parcelWeightGrams = 750;
    c.model.reason = 'Gửi lại';
    c.submit();
    expect(sent.mock.calls[0][0].shippingFee).toBeNull();
    expect(sent.mock.calls[0][0].additionalShippingFee).toBe(20000);
  });
  const order = (patch: object = {}, totals: object = {}) =>
    ({
      status: 'KEEPING',
      recipientName: 'Reader',
      recipientPhone: '0901234567',
      shippingAddress: 'Test address',
      shippingFee: 30000,
      parcelWeightGrams: 700,
      codAmount: 0,
      totals: { goodsTotal: 170000, paidAmount: 0, totalBookWeightGrams: 850, ...totals },
      ...patch,
    }) as any;
  async function shown(o: any, mode: 'finalize' | 'shipping' | 'resend') {
    const f = TestBed.createComponent(OrderShippingForm);
    f.detectChanges();
    f.componentInstance.open(o, mode);
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
      [order({ status: 'UNSUCCESSFUL' }), 'resend'],
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
      t.c.close();
      t.c.open(order(), 'finalize');
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
});
