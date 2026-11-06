import { PublicClock } from '../public-clock';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ContactDialog } from './contact-dialog';
import { PublicBook } from '../public.models';
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
  it('copies the book enquiry without a variant',()=>{
    const f=TestBed.createComponent(ContactDialog);f.componentRef.setInput('book',book);
    f.detectChanges();
    expect(f.componentInstance.text()).not.toContain('Biến thể:');
    expect(f.nativeElement.querySelector('textarea').value).toContain('20.000 đ');
  });
  it('ignores legacy variants when preparing a book enquiry',()=>{
    const f=TestBed.createComponent(ContactDialog);
    f.componentRef.setInput('book',{...book,variants:[{id:'a',name:'A',available:false},{id:'b',name:'B',available:true}]});
    f.detectChanges();
    expect(f.componentInstance.text()).toContain(book.bookCode);
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
    expect(f.nativeElement.querySelector('textarea').value).toContain('20.000 đ');
    expect(f.nativeElement.textContent).toContain('chưa được cấu hình');
  });
  it('starts a delayed clipboard write inside the click before verification resolves', async()=>{
    const f=TestBed.createComponent(ContactDialog);f.componentRef.setInput('preparedText','old price');
    let resolve!:(value:string)=>void;
    const verify=vi.fn(()=>new Promise<string>(r=>resolve=r));f.componentRef.setInput('verifyText',verify);f.detectChanges();
    class Item {constructor(readonly data:Record<string,Promise<Blob>>) {}}
    vi.stubGlobal('ClipboardItem',Item);
    const write=vi.fn(async(items:Item[])=>{const blob=await items[0].data['text/plain'];expect(await blob.text()).toBe('fresh price');});
    const writeText=vi.fn();Object.defineProperty(navigator,'clipboard',{configurable:true,value:{write,writeText}});
    const copying=f.componentInstance.copy();
    expect(write).toHaveBeenCalledTimes(1);expect(writeText).not.toHaveBeenCalled();
    await f.componentInstance.copy();expect(verify).toHaveBeenCalledTimes(1);
    resolve('fresh price');await copying;expect(f.componentInstance.message()).toContain('Đã sao chép');
    vi.unstubAllGlobals();
  });
  it('rejects pending clipboard data when verification fails without copying stale text',async()=>{
    const f=TestBed.createComponent(ContactDialog);f.componentRef.setInput('preparedText','stale price');
    f.componentRef.setInput('verifyText',()=>Promise.reject(Error('offline')));f.detectChanges();
    class Item {constructor(readonly data:Record<string,Promise<Blob>>) {}}
    vi.stubGlobal('ClipboardItem',Item);let written='';
    const write=vi.fn(async(items:Item[])=>{const blob=await items[0].data['text/plain'];written=await blob.text();});
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{write}});
    await f.componentInstance.copy();expect(write).toHaveBeenCalledTimes(1);expect(written).toBe('');
    expect(f.componentInstance.text()).toBe('');expect(f.componentInstance.message()).toContain('Chưa xác nhận');
    vi.unstubAllGlobals();
  });
  it('selects the complete fresh enquiry for manual copying when clipboard is unavailable',async()=>{
    const f=TestBed.createComponent(ContactDialog);f.componentRef.setInput('preparedText','fresh enquiry');f.detectChanges();
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined});
    await f.componentInstance.copy();f.detectChanges();const area=f.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    expect(area.selectionStart).toBe(0);expect(area.selectionEnd).toBe('fresh enquiry'.length);
    expect(f.componentInstance.message()).toContain('thủ công');
  });
  it('keeps manual selection available if the legacy copy command is blocked',async()=>{
    const f=TestBed.createComponent(ContactDialog);f.componentRef.setInput('preparedText','fresh enquiry');f.detectChanges();
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined});
    Object.defineProperty(document,'execCommand',{configurable:true,value:()=>{throw Error('blocked');}});
    try {await f.componentInstance.copy();expect(f.componentInstance.message()).toContain('thủ công');}
    finally {delete (document as any).execCommand;}
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
