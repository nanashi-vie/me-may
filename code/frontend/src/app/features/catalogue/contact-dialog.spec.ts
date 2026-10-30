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
  priceMinVnd: 20000,
  priceMaxVnd: 20000,
  weightG: 250,
  salePriceVnd: null,
  saleEndsAt: null,
  description: null,
  readingLevel: null,
  readingVideoUrl: null,
  availability: 'AVAILABLE',
  variants: [{id:'default',name:null,available:true}],
  media: [],
};
describe('Contact copy fallback', () => {
  it('includes the selected variant in the visible enquiry and copy fallback',()=>{
    const f=TestBed.createComponent(ContactDialog);f.componentRef.setInput('book',book);
    f.componentRef.setInput('variant',{id:'condition',name:'Có cấn góc',available:true});f.detectChanges();
    expect(f.componentInstance.text()).toContain('Biến thể: Có cấn góc');
    expect(f.nativeElement.querySelector('textarea').value).toContain('20.000 VNĐ');
  });
  for (const change of ['busy', 'text'])
    it('clears copy success when verified content becomes ' + change, async () => {
      const f = TestBed.createComponent(ContactDialog);
      f.componentRef.setInput('preparedText', 'old enquiry');
      f.detectChanges();
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: vi.fn().mockResolvedValue(undefined) },
      });
      await f.componentInstance.copy();
      expect(f.componentInstance.message()).toContain('Đã sao chép');
      f.componentRef.setInput(
        change === 'busy' ? 'busy' : 'preparedText',
        change === 'busy' ? true : 'new enquiry',
      );
      f.detectChanges();
      expect(f.componentInstance.message()).not.toContain('Đã sao chép');
    });

  it('revalidates before copying and clears stale text on verification failure', async () => {
    const f = TestBed.createComponent(ContactDialog);
    f.componentRef.setInput('preparedText', 'old price');
    const verify = vi.fn().mockResolvedValue('fresh price');
    f.componentRef.setInput('verifyText', verify);
    f.detectChanges();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    await f.componentInstance.copy();
    expect(verify).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith('fresh price');
    verify.mockRejectedValue(new Error('network'));
    await f.componentInstance.copy();
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(f.componentInstance.text()).toBe('');
  });
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
    expect(f.nativeElement.querySelector('textarea').value).toContain('20.000 VNĐ');
    expect(f.nativeElement.textContent).toContain('chưa được cấu hình');
  });
  it('does not copy expired discount as a current price', () => {
    const f = TestBed.createComponent(ContactDialog);
    f.componentRef.setInput('book', {
      ...book,
      priceMinVnd: 20000,
      priceMaxVnd: 20000,
      weightG: 250,
      salePriceVnd: 7000,
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
      priceMinVnd: 20000,
      priceMaxVnd: 20000,
      weightG: 250,
      salePriceVnd: 7000,
      saleEndsAt: '2026-10-23T13:00:00Z',
    });
    f.componentRef.setInput('url', 'http://localhost:4200/sach/mm-000001');
    expect(f.componentInstance.text()).not.toContain('7.000');
    vi.restoreAllMocks();
  });
});
