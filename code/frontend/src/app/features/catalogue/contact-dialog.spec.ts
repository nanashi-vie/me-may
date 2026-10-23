import { PublicClock } from './public-clock';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ContactDialog } from './contact-dialog';
import { PublicBook } from './public.models';
const book: PublicBook = {
  id: '1',
  bookCode: 'MM-000001',
  slug: 'mm-000001',
  title: 'Book',
  publisher: null,
  author: null,
  ageGroups: [],
  categoryCode: 'BOARD_BOOK',
  binding: null,
  conditionGrade: null,
  conditionNote: 'Thực tế',
  priceVnd: 20000,
  originalPriceVnd: null,
  saleEndsAt: null,
  description: null,
  readingLevel: null,
  readingVideoUrl: null,
  availability: 'AVAILABLE',
  media: [],
};
describe('Contact copy fallback', () => {
  it('preserves selectable enquiry when clipboard fails', async () => {
    const f = TestBed.createComponent(ContactDialog);
    f.componentRef.setInput('book', book);
    f.componentRef.setInput('url', 'http://localhost:4200/sach/mm-000001');
    f.detectChanges();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    await f.componentInstance.copy();
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('thủ công');
    expect(f.nativeElement.querySelector('textarea').value).toContain('MM-000001');
    expect(f.nativeElement.querySelector('textarea').value).toContain('20.000 ₫');
    expect(f.nativeElement.textContent).toContain('chưa được cấu hình');
  });
  it('does not copy expired discount as a current price', () => {
    const f = TestBed.createComponent(ContactDialog);
    f.componentRef.setInput('book', {
      ...book,
      priceVnd: 7000,
      originalPriceVnd: 20000,
      saleEndsAt: '2000-01-01T00:00:00Z',
    });
    f.componentRef.setInput('url', 'http://localhost:4200/sach/mm-000001');
    expect(f.componentInstance.text()).not.toContain('7.000');
  });
});

describe('Enquiry uses server clock', () => {
  it('does not copy expired discount on a device whose clock is behind', () => {
    const now = Date.parse('2026-10-23T14:00:00Z');
    vi.spyOn(Date, 'now').mockReturnValue(now - 7200000);
    TestBed.configureTestingModule({
      providers: [{ provide: PublicClock, useValue: { now: signal(now) } }],
    });
    const f = TestBed.createComponent(ContactDialog);
    f.componentRef.setInput('book', {
      ...book,
      priceVnd: 7000,
      originalPriceVnd: 20000,
      saleEndsAt: '2026-10-23T13:00:00Z',
    });
    f.componentRef.setInput('url', 'http://localhost:4200/sach/mm-000001');
    expect(f.componentInstance.text()).not.toContain('7.000');
    vi.restoreAllMocks();
  });
});
