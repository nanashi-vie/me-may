import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { BookAuditPanel } from './book-audit-panel';
import { BookApi } from '../book-api';
describe('Book audit', () => {
  it('requests a numbered audit page once and blocks repeated clicks while loading', () => {
    const next = new Subject<any>();
    const audit = vi.fn().mockReturnValueOnce(of({items: [], page: 0, size: 20, totalElements: 200, totalPages: 10})).mockReturnValue(next);
    TestBed.configureTestingModule({ providers: [{ provide: BookApi, useValue: { audit } }] });
    const f = TestBed.createComponent(BookAuditPanel);
    f.componentRef.setInput('bookId', '7'); f.detectChanges();
    f.componentInstance.toggle(true); f.detectChanges();
    const button = f.nativeElement.querySelector('app-pagination button[aria-label="Trang 5"]') as HTMLButtonElement;
    expect(button).not.toBeNull();
    button.click(); f.detectChanges(); button.click();
    expect(audit).toHaveBeenCalledTimes(2);
    expect(audit).toHaveBeenLastCalledWith('7', 4);
    expect(button.disabled).toBe(true);
    next.next({items: [], page: 4, size: 20, totalElements: 200, totalPages: 10}); f.detectChanges();
    expect(f.nativeElement.querySelector('[aria-current="page"]').textContent.trim()).toBe('5');
  });
  it('requests explicit audit page and renders business values as escaped text', () => {
    const audit = vi.fn(() =>
      of({
        items: [
          {
            id: 'a',
            actorId: '2',
            action: 'UPDATE',
            before: { title: '<script>bad</script>' },
            after: { title: 'New' },
            aggregateVersion: 3,
            createdAt: '2026-10-22T00:00:00Z',
          },
        ],
        page: 1,
        size: 20,
        totalElements: 21,
        totalPages: 2,
      }),
    );
    TestBed.configureTestingModule({ providers: [{ provide: BookApi, useValue: { audit } }] });
    const f = TestBed.createComponent(BookAuditPanel);
    f.componentRef.setInput('bookId', '1');
    f.componentRef.setInput('version', 3);
    f.componentInstance.opened.set(true);
    f.componentInstance.load(1);
    f.detectChanges();
    expect(audit).toHaveBeenCalledWith('1', 1);
    expect(f.nativeElement.querySelector('script')).toBeNull();
  });
  it('keeps audit closed without fetching and refreshes stale data only when opened',()=>{
    const audit=vi.fn(()=>of({items:[],page:0,size:20,totalElements:0,totalPages:0}));
    TestBed.configureTestingModule({providers:[{provide:BookApi,useValue:{audit}}]});
    const f=TestBed.createComponent(BookAuditPanel);f.componentRef.setInput('bookId','1');f.detectChanges();
    expect(audit).not.toHaveBeenCalled();
    f.componentInstance.toggle(true);expect(audit).toHaveBeenCalledTimes(1);
    f.componentInstance.toggle(false);f.componentRef.setInput('version',2);f.detectChanges();expect(audit).toHaveBeenCalledTimes(1);
    f.componentInstance.toggle(true);expect(audit).toHaveBeenCalledTimes(2);
  });
 it('cancels stale audit and keeps failures separate from publishing',()=>{
   const old=new Subject<any>();const audit=vi.fn().mockReturnValueOnce(old).mockReturnValueOnce(throwError(()=>({status:502})));
   TestBed.configureTestingModule({providers:[{provide:BookApi,useValue:{audit}}]});const f=TestBed.createComponent(BookAuditPanel);
   f.componentRef.setInput('bookId','1');f.detectChanges();let failures=0;f.componentInstance.failed.subscribe(()=>failures++);
   f.componentInstance.toggle(true);f.componentRef.setInput('bookId','2');f.detectChanges();
   old.next({items:[{id:'old'}]});expect(f.componentInstance.result()).toBeNull();expect(f.componentInstance.error()).toContain('Chưa tải');expect(failures).toBe(0);
   f.destroy();expect(old.observed).toBe(false);
 });
});
