import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
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
    createdAt: '2026-11-24T18:00:00Z',
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
function setup(o: any, billed = true) {
  const f = TestBed.createComponent(OrderBill);
  f.componentRef.setInput('order', o);
  f.componentRef.setInput('billed', billed);
  f.detectChanges();
  const el = f.nativeElement as HTMLElement;
  const text = (e: Element | null) => (e?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const cells = (selector: string) =>
    Array.from(el.querySelectorAll(selector), (row) => Array.from(row.children, text).join(' '));
  const open = () => {
    f.componentInstance.open();
    f.detectChanges();
  };
  const card = () => el.querySelector('.bill');
  const press = (label: string) => {
    (Array.from(el.querySelectorAll('button')).find((b) => text(b).includes(label) || b.getAttribute('aria-label') === label) as HTMLButtonElement).click();
    f.detectChanges();
  };
  return { f, el, open, card, press, text, rows: () => cells('.bill tbody tr'), sums: () => cells('.bill-totals > *') };
}

describe('OrderBill', () => {
  it('shows the shop, customer, books and money of a saved bill', () => {
    const t = setup(order(1));
    expect(t.card()).toBeNull();
    t.open();
    const all = t.text(t.card());
    for (const part of ['Mẹ Mây', 'Sách ngoại văn cho bé', 'Khách: Chị Lan', '25/11/2026']) expect(all).toContain(part);
    expect(t.rows()).toEqual(['Sách số 1 2 × 75.000đ 150.000đ']);
    expect(t.sums()).toEqual(['Tiền sách (2 quyển) 150.000đ', 'Phí ship 30.000đ', 'Tổng bill 180.000đ', 'Đã thanh toán 100.000đ', 'Cần thanh toán 80.000đ']);
    expect(all).not.toContain('Trang');
    expect(all).not.toContain('Tạm tính');
  });
  it('keeps internal and delivery details off the bill', () => {
    const t = setup(order(2, {}, { discountAmount: 10000 }));
    t.open();
    const all = t.text(t.card());
    expect(t.rows().length).toBe(2);
    for (const secret of ['DH-', 'KH-', '0901234567', '0907654321', 'Người khác', 'Số 1 đường thử', 'MM-', '456', '1456', '98.765', 'COD', 'Ghi chú', 'Sách ngoài', 'Website', 'Giảm giá'])
      expect(all, secret).not.toContain(secret);
  });
  it('words each payment state for the customer', () => {
    const last = (totals: object) => {
      const t = setup(order(1, totals));
      t.open();
      return t.sums().at(-1);
    };
    expect(last({ balance: 80000 })).toBe('Cần thanh toán 80.000đ');
    expect(last({ balance: 0, paidAmount: 180000 })).toBe('Đã thanh toán đủ');
    expect(last({ balance: -20000, paidAmount: 200000 })).toBe('Tiền thừa 20.000đ');
  });
  it('says free shipping', () => {
    const t = setup(order(1, { orderTotal: 150000, balance: 50000 }, { shippingFee: 0 }));
    t.open();
    expect(t.sums()[1]).toBe('Phí ship Miễn phí');
  });
  it('is provisional without shipping until a bill is saved, even if an old fee remains', () => {
    const t = setup(order(1, {}, { status: 'KEEPING' }), false);
    t.open();
    expect(t.text(t.card())).toContain('Tạm tính, chưa gồm phí ship');
    expect(t.sums()).toEqual(['Tiền sách (2 quyển) 150.000đ', 'Tạm tính 150.000đ', 'Đã thanh toán 100.000đ', 'Cần thanh toán 50.000đ']);
  });
  it.each([
    [1, [1]],
    [12, [12]],
    [13, [12, 1]],
    [25, [12, 12, 1]],
  ])('splits %i lines into screenshots with totals on the last', (n, pages) => {
    const t = setup(order(n));
    t.open();
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
  it('keeps its controls outside the screenshot', () => {
    const t = setup(order(13));
    t.open();
    expect(t.card()!.querySelector('button, a')).toBeNull();
    expect(t.el.querySelectorAll('dialog button').length).toBe(3);
  });
  it('returns to the first page and to the opener', () => {
    const t = setup(order(13));
    const opener = document.createElement('button');
    document.body.append(opener, t.el);
    opener.focus();
    t.open();
    t.press('Trang sau');
    t.el.querySelector<HTMLButtonElement>('footer button:last-child')!.focus();
    t.press('Đóng');
    expect(t.card()).toBeNull();
    expect(document.activeElement).toBe(opener);
    t.open();
    expect(t.text(t.card())).toContain('Trang 1/2');
    t.el.querySelector<HTMLButtonElement>('footer button:last-child')!.focus();
    t.el.querySelector('dialog')!.dispatchEvent(new Event('cancel', { cancelable: true }));
    t.f.detectChanges();
    expect(t.card()).toBeNull();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
  it('follows the order if lines disappear while open', () => {
    const t = setup(order(13));
    t.open();
    t.press('Trang sau');
    t.f.componentRef.setInput('order', order(3));
    t.f.detectChanges();
    expect(t.rows().length).toBe(3);
    expect(t.sums().length).toBeGreaterThan(0);
  });
  it('opens as a modal dialog', () => {
    const t = setup(order(1));
    const dialog = t.el.querySelector('dialog') as HTMLDialogElement;
    dialog.showModal = vi.fn();
    t.open();
    expect(dialog.showModal).toHaveBeenCalledOnce();
    expect(dialog.getAttribute('aria-label')).toBe('Bill gửi khách');
  });
});
