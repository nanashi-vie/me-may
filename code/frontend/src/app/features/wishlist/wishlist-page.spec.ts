import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { WishlistPage } from './wishlist-page';
import { WishlistStore, WISHLIST_KEY, WISHLIST_STORAGE } from './wishlist-store';
import { PublicApi, PUBLIC_SITE_ORIGIN } from '../catalogue/public-api';
import { PublicBook } from '../catalogue/public.models';
import { PublicClock } from '../catalogue/public-clock';

const book = (code = 'MM-000001', patch: Partial<PublicBook> = {}): PublicBook => ({
  id: code,
  bookCode: code,
  slug: code.toLowerCase(),
  title: 'Moon ' + code,
  publisher: null,
  author: null,
  ageGroups: [],
  categoryCode: 'BOARD_BOOK',
  binding: null,
  conditionGrade: null,
  conditionNote: 'Ảnh thật',
  priceVnd: 20000,
  originalPriceVnd: null,
  saleEndsAt: null,
  description: null,
  readingLevel: null,
  readingVideoUrl: null,
  availability: 'AVAILABLE',
  media: [],
  ...patch,
});
describe('Wishlist selection and verified multi-book enquiry', () => {
  const now = signal(Date.parse('2026-10-24T12:00:00Z'));
  function setup(
    codes = ['MM-000001', 'MM-000002', 'MM-000003'],
    initial = [book(), book('MM-000002', { availability: 'SOLD' })],
  ) {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(codes));
    const lookup = vi.fn((_codes: string[]) => of(initial));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: PublicApi,
          useValue: { lookup, contact: () => of({ hotlineUrl: null, groupUrl: null }) },
        },
        { provide: WISHLIST_STORAGE, useValue: () => localStorage },
        { provide: PublicClock, useValue: { now } },
        { provide: PUBLIC_SITE_ORIGIN, useValue: 'https://memay.example' },
      ],
    });
    const f = TestBed.createComponent(WishlistPage);
    const c = f.componentInstance;
    TestBed.inject(WishlistStore).initialize();
    f.detectChanges();
    c.dialog.dialog.nativeElement.showModal = function () {
      this.open = true;
    };
    return { f, c, lookup, store: TestBed.inject(WishlistStore) };
  }
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    now.set(Date.parse('2026-10-24T12:00:00Z'));
  });
  it('loads server state with no initial selection; select-all excludes sold and missing rows', () => {
    const { f, c, lookup } = setup();
    expect(lookup).toHaveBeenCalledWith(['MM-000001', 'MM-000002', 'MM-000003']);
    expect(c.selected()).toEqual([]);
    c.selectAll();
    expect(c.selected()).toEqual(['MM-000001']);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Hết hàng');
    expect(f.nativeElement.textContent).toContain('Không còn hiển thị');
    const inputs = [
      ...f.nativeElement.querySelectorAll('input[type=checkbox]'),
    ] as HTMLInputElement[];
    expect(inputs.filter((i) => i.disabled)).toHaveLength(2);
    expect(document.querySelector('meta[name=robots]')?.getAttribute('content')).toContain(
      'noindex',
    );
  });
  it('keeps the rest saved and copies only selected codes with fresh prices/canonical URLs', async () => {
    const { f, c, lookup, store } = setup(['MM-000001', 'MM-000002'], [book(), book('MM-000002')]);
    c.toggleSelection('MM-000001', true);
    lookup.mockReturnValueOnce(of([book(undefined, { priceVnd: 17000 })]));
    c.prepare();
    f.detectChanges();
    expect(lookup).toHaveBeenLastCalledWith(['MM-000001']);
    const text = (f.nativeElement.querySelector('textarea') as HTMLTextAreaElement).value;
    expect(text).toContain(
      'MM-000001 | Moon MM-000001 | 17.000 ₫ | https://memay.example/sach/mm-000001',
    );
    expect(text).not.toContain('MM-000002');
    expect(text).toContain('xác nhận');
    expect(store.codes()).toHaveLength(2);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    await c.dialog.copy();
    expect(writeText).toHaveBeenCalledWith(text);
    writeText.mockRejectedValueOnce(Error('denied'));
    await c.dialog.copy();
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('thủ công');
    expect((f.nativeElement.querySelector('textarea') as HTMLTextAreaElement).value).toBe(text);
  });
  it('revalidation removes newly sold and hidden selections and explains exclusion', () => {
    const { f, c, lookup } = setup(['MM-000001', 'MM-000002'], [book(), book('MM-000002')]);
    c.selectAll();
    lookup.mockReturnValueOnce(of([book(undefined, { availability: 'SOLD' })]));
    c.prepare();
    f.detectChanges();
    expect(c.selected()).toEqual([]);
    expect(c.enquiry()).toBe('');
    expect(f.nativeElement.textContent).toContain('không còn');
    expect((f.nativeElement.querySelector('dialog') as HTMLDialogElement).open).toBe(false);
  });
  it('never leaves old text copyable after a failed refresh and retry recovers', () => {
    const { f, c, lookup } = setup();
    c.selectAll();
    c.prepare();
    f.detectChanges();
    expect(c.enquiry()).toBeTruthy();
    lookup.mockReturnValueOnce(throwError(() => Error('offline')));
    c.refresh();
    f.detectChanges();
    expect(c.enquiry()).toBe('');
    expect((f.nativeElement.querySelector('textarea') as HTMLTextAreaElement).value).toBe('');
    expect((f.nativeElement.querySelector('dialog button') as HTMLButtonElement).disabled).toBe(
      true,
    );
    c.refresh();
    f.detectChanges();
    expect(c.error()).toBe(false);
    expect(c.enquiry()).toBeTruthy();
  });
  it('cancels a late enquiry response when a selected code is removed in another tab', () => {
    const { f, c, lookup, store } = setup();
    c.selectAll();
    const pending = new Subject<PublicBook[]>();
    lookup.mockReturnValueOnce(pending);
    c.prepare();
    localStorage.setItem(WISHLIST_KEY, '["MM-000002"]');
    window.dispatchEvent(new StorageEvent('storage', { key: WISHLIST_KEY }));
    f.detectChanges();
    pending.next([book()]);
    pending.complete();
    f.detectChanges();
    expect(store.codes()).toEqual(['MM-000002']);
    expect(c.selected()).toEqual([]);
    expect(c.enquiry()).toBe('');
    expect(f.nativeElement.textContent).not.toContain('Moon MM-000001');
  });
  it('invalidates already generated text immediately on cross-tab removal', () => {
    const { f, c } = setup();
    c.selectAll();
    c.prepare();
    f.detectChanges();
    expect(c.enquiry()).toBeTruthy();
    localStorage.setItem(WISHLIST_KEY, '[]');
    window.dispatchEvent(new StorageEvent('storage', { key: WISHLIST_KEY }));
    expect(c.enquiry()).toBe('');
    f.detectChanges();
    expect(c.selected()).toEqual([]);
  });
  it('refreshes on foreground and discards late responses after destruction', () => {
    const { f, c, lookup } = setup();
    c.selectAll();
    c.prepare();
    const pending = new Subject<PublicBook[]>();
    lookup.mockReturnValueOnce(pending);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(c.enquiry()).toBe('');
    const count = lookup.mock.calls.length;
    f.destroy();
    pending.next([book(undefined, { priceVnd: 999 })]);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(lookup.mock.calls.length).toBe(count);
    expect(c.enquiry()).toBe('');
  });
  it('clears the expired sale before refresh and requires confirmed current prices', () => {
    const sale = book(undefined, {
      priceVnd: 7000,
      originalPriceVnd: 20000,
      saleEndsAt: '2026-10-24T12:00:01Z',
    });
    const { f, c, lookup } = setup(['MM-000001'], [sale]);
    c.selectAll();
    c.prepare();
    f.detectChanges();
    expect(c.enquiry()).toContain('7.000');
    const pending = new Subject<PublicBook[]>();
    lookup.mockReturnValueOnce(pending);
    now.set(Date.parse(sale.saleEndsAt!));
    expect(c.enquiry()).toBe('');
    f.detectChanges();
    expect(lookup).toHaveBeenCalledTimes(3);
    pending.next([book()]);
    f.detectChanges();
    expect(c.enquiry()).toContain('20.000');
    expect(c.enquiry()).not.toContain('7.000');
  });
  it('empty saved list needs no lookup, has a catalogue link and no enquiry action', () => {
    const { f, c, lookup } = setup([], []);
    expect(lookup).not.toHaveBeenCalled();
    expect(c.enquiry()).toBe('');
    expect(f.nativeElement.textContent).toContain('Chưa có cuốn');
    expect(f.nativeElement.querySelector('a[href="/sach"]')).toBeTruthy();
  });
  it('normal refresh drops obsolete responses and does not expose old hidden metadata', () => {
    const { f, c, lookup } = setup();
    const older = new Subject<PublicBook[]>(),
      newer = new Subject<PublicBook[]>();
    lookup.mockReturnValueOnce(older).mockReturnValueOnce(newer);
    c.refresh();
    c.refresh();
    newer.next([]);
    older.next([book(undefined, { title: 'OLD SECRET' })]);
    f.detectChanges();
    expect(f.nativeElement.textContent).not.toContain('OLD SECRET');
    expect(f.nativeElement.textContent).toContain('Không còn hiển thị');
  });
});
