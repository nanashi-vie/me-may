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
    c.model.reason = 'Gửi lại';
    c.submit();
    expect(sent.mock.calls[0][0].shippingFee).toBeNull();
    expect(sent.mock.calls[0][0].additionalShippingFee).toBe(20000);
  });
});
