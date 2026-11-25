import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { NEVER, Observable, Subject, delay, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { OrderItemForm } from './order-item-form';
import { OrderApi } from '../order-api';
import { CatalogCandidate, MatchResult, OrderDetail, OrderItem } from '../order-models';
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
const book = {
  id: '6',
  bookCode: 'MM-000006',
  title: 'sách cuối',
  weightG: 215,
  priceMinVnd: 70000,
  priceMaxVnd: 80000,
  salePriceVnd: null,
  stock: 3,
  publication: 'PUBLISHED',
  coverUrl: '/cover',
  exact: false,
} as CatalogCandidate;
const result = (...items: CatalogCandidate[]): MatchResult => ({ normalizedTitle: 'sach cuoi', fingerprint: 'fp', items });
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
    c.matchState.set('ready');
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
    c.match.set({ normalizedTitle: 'old', fingerprint: 'old', items: [] });
    c.matchState.set('ready');
    c.model.overrideReason = 'old';
    c.model.confirmed = true;
    c.titleChanged('Changed');
    expect(c.match()).toBeNull();
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
      expect(c.match()).toBeNull();
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
  describe('manual title suggestions', () => {
    const draft = { status: 'DRAFT', version: 1, items: [] } as unknown as OrderDetail;
    afterEach(() => vi.useRealTimers());
    async function manual(matches: () => Observable<MatchResult>) {
      vi.useFakeTimers();
      const { f, c, api } = setup();
      api.matches.mockImplementation(matches as any);
      f.autoDetectChanges();
      c.open(draft);
      await vi.advanceTimersByTimeAsync(400);
      const select = f.nativeElement.querySelector('select[name=source]') as HTMLSelectElement;
      select.value = select.options[1].value;
      select.dispatchEvent(new Event('change'));
      await vi.advanceTimersByTimeAsync(0);
      Object.assign(c.model, { unitPriceVnd: 90000, quantity: 2, unitWeightGrams: 300 });
      const type = async (title: string, wait = 400) => {
        const input = f.nativeElement.querySelector('input[name=title]') as HTMLInputElement;
        input.value = title;
        input.dispatchEvent(new Event('input'));
        await vi.advanceTimersByTimeAsync(wait);
      };
      const text = () => f.nativeElement.textContent as string;
      const button = (label: string) =>
        [...f.nativeElement.querySelectorAll('button')].find((b: HTMLButtonElement) =>
          b.textContent!.includes(label),
        ) as HTMLButtonElement | undefined;
      return { f, c, api, type, text, button };
    }
    it('renders matches without any further event', async () => {
      const { type, text } = await manual(() => of(result(book)).pipe(delay(50)));
      await type('sách cuối', 600);
      expect(text()).toContain('MM-000006');
      expect(text()).not.toContain('Đang kiểm tra sách tương tự');
    });
    it('near suggestions do not require a reason', async () => {
      const { c, f, type, text } = await manual(() => of(result(book)));
      await type('sách cuố');
      expect(text()).toContain('Có sách tên gần giống');
      expect(f.nativeElement.querySelector('textarea[name=overrideReason]')).toBeNull();
      expect(c.valid()).toBe(true);
      const saved = vi.fn();
      c.saved.subscribe(saved);
      c.submit();
      expect(saved).toHaveBeenCalledWith(expect.objectContaining({ title: 'sách cuố', matchConfirmation: null }));
    });
    it('an exact title requires a reason and a tick', async () => {
      const { c, type, text } = await manual(() => of(result({ ...book, exact: true })));
      await type('sách cuối');
      expect(text()).toContain('Tên trùng với sách trên website');
      expect(c.valid()).toBe(false);
      c.model.overrideReason = 'Bản khác';
      expect(c.valid()).toBe(false);
      c.model.confirmed = true;
      expect(c.valid()).toBe(true);
      const saved = vi.fn();
      c.saved.subscribe(saved);
      c.submit();
      expect(saved).toHaveBeenCalledWith(
        expect.objectContaining({
          matchConfirmation: { normalizedTitle: 'sach cuoi', fingerprint: 'fp', reason: 'Bản khác' },
        }),
      );
    });
    it('locks while checking, then allows saving and retrying after a failure', async () => {
      const reply = new Subject<MatchResult>();
      const { c, api, type, text, button } = await manual(() => reply);
      await type('sách cuối');
      expect(text()).toContain('Đang kiểm tra sách tương tự');
      expect(c.valid()).toBe(false);
      reply.error(new Error('offline'));
      await vi.advanceTimersByTimeAsync(0);
      expect(c.matchState()).toBe('failed');
      expect(c.valid()).toBe(true);
      api.matches.mockImplementation((() => of(result(book))) as any);
      button('Thử lại')!.click();
      await vi.advanceTimersByTimeAsync(400);
      expect(text()).toContain('MM-000006');
    });
    it('still checks a new title after a failure', async () => {
      const { c, api, type } = await manual(() => throwError(() => new Error('offline')));
      await type('sách');
      expect(c.matchState()).toBe('failed');
      api.matches.mockImplementation((() => of(result(book))) as any);
      await type('sách cuối');
      expect(c.matchState()).toBe('ready');
    });
    it('treats a check that never answers as failed after 8 seconds', async () => {
      const { c, type } = await manual(() => NEVER);
      await type('sách cuối', 8300);
      expect(c.matchState()).toBe('checking');
      await vi.advanceTimersByTimeAsync(100);
      expect(c.matchState()).toBe('failed');
    });
    it('ignores a late match after picking a suggestion', async () => {
      const late = new Subject<MatchResult>();
      const { c, api, type, text } = await manual(() => of(result(book)));
      await type('sách cuối');
      api.matches.mockImplementation((() => late) as any);
      await type('sách cuối 2');
      c.pickSuggestion(book);
      late.next(result({ ...book, bookCode: 'MM-000099', exact: true }));
      await vi.advanceTimersByTimeAsync(0);
      expect(c.match()).toBeNull();
      expect(text()).not.toContain('MM-000099');
    });
    it('keeps price, quantity and a missing weight when picking a suggestion', async () => {
      const { c, type, button } = await manual(() => of(result({ ...book, weightG: null })));
      await type('sách cuối');
      button('Chọn sách này')!.click();
      expect(c.model).toMatchObject({
        sourceType: 'CATALOG',
        bookCopyId: '6',
        unitPriceVnd: 90000,
        quantity: 2,
        unitWeightGrams: 300,
      });
      expect(c.valid()).toBe(true);
    });
    it('uses the weight of the picked book and restores the manual line when switching back', async () => {
      const { c, type, button } = await manual(() => of(result(book)));
      await type('sách cuố');
      button('Chọn sách này')!.click();
      expect(c.model.unitWeightGrams).toBe(215);
      c.model.sourceType = 'MANUAL';
      c.sourceChanged();
      expect(c.model).toMatchObject({ title: 'sách cuố', unitWeightGrams: 300, unitPriceVnd: 90000, bookCopyId: null });
    });
    it('does not put the price of another book on the restored manual line', async () => {
      const { c, type, button } = await manual(() => of(result(book)));
      await type('sách cuố');
      button('Chọn sách này')!.click();
      c.changeBook();
      c.choose({ ...book, id: '9' });
      c.model.unitPriceVnd = 70000;
      c.model.sourceType = 'MANUAL';
      c.sourceChanged();
      expect(c.model).toMatchObject({ title: 'sách cuố', unitPriceVnd: 90000 });
    });
    it('labels hidden and sold-out suggestions and loads covers lazily', async () => {
      const { f, type, text } = await manual(() => of(result({ ...book, stock: 0, publication: 'ARCHIVED' })));
      await type('sách cuối');
      expect(text()).toContain('Ẩn');
      expect(text()).toContain('Hết hàng');
      expect(text()).toContain('70.000');
      expect(f.nativeElement.querySelector('.suggestion img').getAttribute('loading')).toBe('lazy');
    });
    it('keeps all inputs when a 409 brings exact matches', async () => {
      const { c, type, text } = await manual(() => throwError(() => new Error('offline')));
      await type('sách cuối');
      c.setMatches(result({ ...book, exact: true }));
      await vi.advanceTimersByTimeAsync(0);
      expect(text()).toContain('Tên trùng với sách trên website');
      expect(c.model).toMatchObject({ title: 'sách cuối', unitPriceVnd: 90000, quantity: 2, unitWeightGrams: 300 });
      expect(c.valid()).toBe(false);
    });
    it('never offers to change the source of a saved manual line', async () => {
      const { c, f, text, button } = await manual(() => of(result(book)));
      c.open(order, item);
      await vi.advanceTimersByTimeAsync(400);
      expect(text()).toContain('MM-000006');
      expect(button('Chọn sách này')).toBeUndefined();
      expect(f.nativeElement.querySelector('select[name=source]').disabled).toBe(true);
    });
  });
  it('collapses the catalogue after choosing and reopens it with the same search', async () => {
    vi.useFakeTimers();
    try {
      const { c, f, api } = setup();
      api.catalog.mockReturnValue(of({ items: [book], page: 1, size: 20, totalElements: 21, totalPages: 2 }) as any);
      f.autoDetectChanges();
      c.open(order);
      c.q = 'sách';
      c.search(1);
      await vi.advanceTimersByTimeAsync(350);
      (f.nativeElement.querySelector('.catalog-result') as HTMLButtonElement).click();
      await vi.advanceTimersByTimeAsync(50);
      expect(f.nativeElement.querySelector('input[name=q]')).toBeNull();
      expect(f.nativeElement.querySelector('.catalog-results')).toBeNull();
      expect(f.nativeElement.querySelector('app-pagination')).toBeNull();
      expect(f.nativeElement.querySelector('.picked').textContent).toContain('MM-000006');
      expect(document.activeElement?.textContent).toContain('Đổi sách');
      (document.activeElement as HTMLButtonElement).click();
      await vi.advanceTimersByTimeAsync(50);
      expect(c.model.bookCopyId).toBeNull();
      expect(c.valid()).toBe(false);
      expect([c.q, c.page]).toEqual(['sách', 1]);
      expect(document.activeElement?.getAttribute('name')).toBe('q');
      expect(f.nativeElement.querySelectorAll('.catalog-result').length).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
