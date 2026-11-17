import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { OrderItemForm } from './order-item-form';
import { OrderApi } from '../order-api';
import { OrderDetail, OrderItem } from '../order-models';
function setup() {
  const api = {
    catalog: vi.fn(() => of({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 })),
    matches: vi.fn(() => of({ normalizedTitle: 'outside', fingerprint: 'fp', items: [] })),
  };
  TestBed.configureTestingModule({ providers: [{ provide: OrderApi, useValue: api }] });
  const f = TestBed.createComponent(OrderItemForm);
  f.detectChanges();
  return { f, c: f.componentInstance, api };
}
const order = { status: 'KEEPING', version: 2, items: [{ id: '3' }] } as OrderDetail;
const item = {
  id: '3',
  sourceType: 'MANUAL',
  titleSnapshot: 'Outside',
  quantity: 3,
  unitPriceVnd: 75000,
  unitWeightGrams: 250,
} as OrderItem;
describe('OrderItemForm', () => {
  it('pages the catalogue without submitting the form and blocks busy lookup clicks', async () => {
    vi.useFakeTimers();
    try {
      const { c, f, api } = setup();
      const response = {items: [], page: 0, size: 20, totalElements: 200, totalPages: 10};
      api.catalog.mockReturnValue(of(response));
      c.open(order); c.q = 'cat';
      await vi.advanceTimersByTimeAsync(300); f.detectChanges();
      const saved = vi.fn(); c.saved.subscribe(saved);
      const button = f.nativeElement.querySelector('app-pagination button[aria-label="Trang 5"]') as HTMLButtonElement;
      expect(button).not.toBeNull();
      button.click(); f.detectChanges();
      expect(button.disabled).toBe(true);
      await vi.advanceTimersByTimeAsync(300);
      expect(api.catalog).toHaveBeenLastCalledWith('cat', 4);
      expect(saved).not.toHaveBeenCalled();
      c.locked.set(true); f.detectChanges();
      expect(f.nativeElement.querySelector('app-pagination button[aria-label="Trang 5"]').disabled).toBe(true);
    } finally { vi.useRealTimers(); }
  });
  it('computes exact manual totals and requires a reason for keep reduction', () => {
    const { c } = setup();
    c.open(order, item);
    c.model.quantity = 2;
    expect(c.totalPrice()).toBe(150000);
    expect(c.totalWeight()).toBe(500);
    expect(c.valid()).toBe(false);
    c.model.reason = 'Khách bỏ bớt';
    expect(c.valid()).toBe(true);
  });
  it('catalog selection copies grams but never reference or sale price', () => {
    const { c } = setup();
    c.open(order);
    c.choose({
      id: '4',
      title: 'Book',
      bookCode: 'MM4',
      weightG: 215,
      priceMinVnd: 70000,
      salePriceVnd: 60000,
    } as any);
    expect(c.model.unitWeightGrams).toBe(215);
    expect(c.model.unitPriceVnd).toBeNull();
    expect(c.valid()).toBe(false);
  });
  it('title change clears old manual confirmation before a new match result', () => {
    const { c } = setup();
    c.open(order, item);
    c.match = { normalizedTitle: 'old', fingerprint: 'old', items: [] };
    c.model.overrideReason = 'old';
    c.model.confirmed = true;
    c.titleChanged('Changed');
    expect(c.match).toBeNull();
    expect(c.model.confirmed).toBe(false);
    expect(c.model.overrideReason).toBe('');
  });
  it('debounces title matching for 350ms and cancels old title', async () => {
    vi.useFakeTimers();
    try {
      const { c, api } = setup();
      c.open(order);
      c.model.sourceType = 'MANUAL';
      c.titleChanged('First');
      await vi.advanceTimersByTimeAsync(200);
      expect(api.matches).not.toHaveBeenCalled();
      c.titleChanged('Second');
      await vi.advanceTimersByTimeAsync(349);
      expect(api.matches).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      expect(api.matches).toHaveBeenCalledExactlyOnceWith('Second');
    } finally {
      vi.useRealTimers();
    }
  });
  it('clearing title cancels pending match', async () => {
    vi.useFakeTimers();
    try {
      const { c, api } = setup();
      c.open(order);
      c.model.sourceType = 'MANUAL';
      c.titleChanged('First');
      await vi.advanceTimersByTimeAsync(100);
      c.titleChanged('');
      await vi.advanceTimersByTimeAsync(400);
      expect(api.matches).not.toHaveBeenCalled();
      expect(c.match).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
  it('cannot close dirty form while save outcome is pending', () => {
    const { c } = setup();
    c.open(order, item);
    c.locked.set(true);
    expect(c.requestClose()).toBe(false);
    expect(c.visible()).toBe(true);
  });
});
