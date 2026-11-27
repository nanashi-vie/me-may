import { TestBed } from '@angular/core/testing';
import { OrderBill } from './order-bill';

const items = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: String(i + 1),
    sourceType: i ? 'CATALOG' : 'MANUAL',
    bookCodeSnapshot: 'MM-SECRET',
    titleSnapshot: `Sách số ${i + 1}`,
    unitPriceVnd: 75000,
    quantity: 2,
    unitWeightGrams: 456,
  }));
const order = (n: number, totals: object = {}, patch: object = {}) =>
  ({
    orderCode: 'DH-000123',
    customerCodeSnapshot: 'KH-000007',
    customerNameSnapshot: 'Chị Lan',
    customerPhoneSnapshot: '0901234567',
    recipientName: 'Người khác',
    recipientPhone: '0907654321',
    shippingAddress: 'Số 1 đường thử',
    createdAt: '2026-11-01T18:00:00Z',
    serverNow: '2026-11-24T18:00:00Z',
    status: 'READY_TO_SHIP',
    items: items(n),
    notes: [{ reason: 'Ghi chú riêng' }],
    shippingFee: 30000,
    parcelWeightGrams: 1456,
    codAmount: 98765,
    discountAmount: 0,
    totalQuantity: n * 2,
    totals: { subtotal: 150000 * n, goodsTotal: 150000 * n, orderTotal: 150000 * n + 30000, paidAmount: 100000, balance: 150000 * n - 70000, ...totals },
    ...patch,
  }) as any;
const saved = { recipientPhone: '0907654321', shippingAddress: 'Số 1 đường thử', shippingFee: 30000 };
function setup(o: any, draft: any = saved, dirty = false) {
  const f = TestBed.createComponent(OrderBill);
  f.componentRef.setInput('order', o);
  f.componentRef.setInput('draft', draft);
  f.componentRef.setInput('dirty', dirty);
  f.detectChanges();
  const el = f.nativeElement as HTMLElement;
  const text = (e: Element | null) => (e?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const cells = (selector: string) =>
    Array.from(el.querySelectorAll(selector), (row) => Array.from(row.children, text).join(' '));
  const card = () => el.querySelector('.bill');
  const press = (label: string) => {
    (Array.from(el.querySelectorAll('button')).find((b) => text(b).includes(label) || b.getAttribute('aria-label') === label) as HTMLButtonElement).click();
    f.detectChanges();
  };
  const set = (name: string, value: unknown) => {
    f.componentRef.setInput(name, value);
    f.detectChanges();
  };
  return { f, el, card, press, set, text, rows: () => cells('.bill tbody tr'), sums: () => cells('.bill-totals > *') };
}

describe('OrderBill', () => {
  it('shows the shop, customer contact, books and money of a saved bill', () => {
    const t = setup(order(1));
    const all = t.text(t.card());
    for (const part of ['Mẹ Mây', 'Sách ngoại văn cho bé', 'Người nhận: Người khác', 'SĐT: 0907654321', 'Địa chỉ: Số 1 đường thử'])
      expect(all).toContain(part);
    expect(t.rows()).toEqual(['Sách số 1 2 × 75.000đ 150.000đ']);
    expect(t.sums()).toEqual(['Tiền sách (2 quyển) 150.000đ', 'Phí ship 30.000đ', 'Tổng bill 180.000đ', 'Đã thanh toán 100.000đ', 'Cần thanh toán 80.000đ']);
    expect(all).not.toContain('Trang');
    expect(all).not.toContain('Tạm tính');
    expect(t.el.querySelector('dialog')).toBeNull();
  });
  it('dates the bill the day it is exported, not the day the order was made', () => {
    const all = setup(order(1)).text(setup(order(1)).card());
    expect(all).toContain('25/11/2026');
    expect(all).not.toContain('02/11/2026');
  });
  it('keeps internal details off the bill', () => {
    const all = (t => t.text(t.card()))(setup(order(2, {}, { discountAmount: 10000 })));
    for (const secret of ['DH-', 'KH-', 'MM-', '456', '1456', '98.765', 'COD', 'Ghi chú', 'Sách ngoài', 'Website', 'Giảm giá', 'TikTok', 'Zalo'])
      expect(all, secret).not.toContain(secret);
  });
  it('falls back to the profile phone and the saved address, and hides what is missing', () => {
    let t = setup(order(1), { recipientPhone: ' ', shippingAddress: '', shippingFee: 30000 });
    expect(t.text(t.card())).toContain('SĐT: 0901234567');
    expect(t.text(t.card())).toContain('Địa chỉ: Số 1 đường thử');
    t = setup(order(1, {}, { customerPhoneSnapshot: null, shippingAddress: null }), { recipientPhone: '', shippingAddress: '', shippingFee: 30000 });
    expect(t.text(t.card())).not.toContain('SĐT');
    expect(t.text(t.card())).not.toContain('Địa chỉ');
  });
  it('follows the fee being typed', () => {
    const t = setup(order(1, {}, { status: 'KEEPING' }), { ...saved, shippingFee: 25000 });
    expect(t.sums()).toEqual(['Tiền sách (2 quyển) 150.000đ', 'Phí ship 25.000đ', 'Tổng bill 175.000đ', 'Đã thanh toán 100.000đ', 'Cần thanh toán 75.000đ']);
    t.set('draft', { ...saved, shippingFee: 0 });
    expect(t.sums()[1]).toBe('Phí ship Miễn phí');
    expect(t.sums().at(-1)).toBe('Cần thanh toán 50.000đ');
  });
  it('words each payment state for the customer', () => {
    const last = (paidAmount: number) => setup(order(1, { paidAmount })).sums().at(-1);
    expect(last(100000)).toBe('Cần thanh toán 80.000đ');
    expect(last(180000)).toBe('Đã thanh toán đủ');
    expect(last(200000)).toBe('Tiền thừa 20.000đ');
  });
  it('is provisional without shipping until a fee is entered', () => {
    for (const draft of [null, { ...saved, shippingFee: null }]) {
      const t = setup(order(1, {}, { status: 'KEEPING' }), draft);
      expect(t.text(t.card())).toContain('Tạm tính, chưa gồm phí ship');
      expect(t.sums()).toEqual(['Tiền sách (2 quyển) 150.000đ', 'Tạm tính 150.000đ', 'Đã thanh toán 100.000đ', 'Cần thanh toán 50.000đ']);
    }
  });
  it('warns outside the screenshot while the form has unsaved changes', () => {
    const t = setup(order(1));
    expect(t.el.querySelector('[role="status"]')).toBeNull();
    t.set('dirty', true);
    const note = t.el.querySelector('[role="status"]')!;
    expect(t.text(note)).toBe('Chưa lưu — bấm Lưu bill trước khi chụp gửi khách');
    expect(t.card()!.contains(note)).toBe(false);
  });
  it.each([
    [1, [1]],
    [12, [12]],
    [13, [12, 1]],
    [25, [12, 12, 1]],
  ])('splits %i lines into screenshots with totals on the last', (n, pages) => {
    const t = setup(order(n));
    const seen: string[] = [];
    pages.forEach((size, i) => {
      expect(t.rows().length).toBe(size);
      seen.push(...t.rows());
      const last = i === pages.length - 1;
      expect(t.sums().length > 0).toBe(last);
      expect(t.text(t.card()).includes(`Trang ${i + 1}/${pages.length}`)).toBe(pages.length > 1);
      const next = t.el.querySelector<HTMLButtonElement>('button[aria-label="Trang sau"]');
      const previous = t.el.querySelector<HTMLButtonElement>('button[aria-label="Trang trước"]');
      if (pages.length === 1) expect([next, previous]).toEqual([null, null]);
      else {
        expect([previous!.disabled, next!.disabled]).toEqual([i === 0, last]);
        if (!last) t.press('Trang sau');
      }
    });
    expect(new Set(seen).size).toBe(n);
  });
  it('keeps its controls outside the screenshot and has no close button', () => {
    const t = setup(order(13));
    expect(t.card()!.querySelector('button, a')).toBeNull();
    expect(t.el.querySelectorAll('button').length).toBe(2);
  });
  it('goes back to the first page when the books change', () => {
    const t = setup(order(25));
    t.press('Trang sau');
    t.press('Trang sau');
    t.set('order', order(3));
    expect(t.rows().length).toBe(3);
    expect(t.sums().length).toBeGreaterThan(0);
    t.set('order', order(25));
    expect(t.text(t.card())).toContain('Trang 1/3');
  });
});
