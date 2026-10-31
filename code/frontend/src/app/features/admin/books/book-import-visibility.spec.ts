import { TestBed } from '@angular/core/testing';
import { ActivatedRoute,convertToParamMap,provideRouter } from '@angular/router';
import { of,BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { BookList } from './book-list';
import { BookApi } from './book-api';
import { BookStatusActions } from './book-status-actions';
import { AuthService } from '../../../core/auth/auth.service';
import { testBook } from './book-test-fixture';
describe('Imported books awaiting publication',()=>{
  it('shows total stock, a placeholder and an unpublished filter in the list',()=>{
    const params=new BehaviorSubject(convertToParamMap({unpublishedOnly:'true'}));
    const list=vi.fn(()=>of({items:[{...testBook(),frontContentPath:null,totalStock:3}],page:0,size:20,totalElements:1,totalPages:1}));
    TestBed.configureTestingModule({providers:[provideRouter([]),{provide:ActivatedRoute,useValue:{queryParamMap:params}},
      {provide:BookApi,useValue:{list}},{provide:AuthService,useValue:{user:()=>({role:'OWNER'})}}]});
    const f=TestBed.createComponent(BookList);f.detectChanges();
    expect(list).toHaveBeenCalledWith(expect.objectContaining({unpublishedOnly:true}));
    expect(f.nativeElement.textContent).toContain('Chưa xuất bản');expect(f.nativeElement.textContent).toContain('Chưa có ảnh');
    expect(f.nativeElement.querySelector('tbody tr td:nth-child(4)').textContent.trim()).toBe('3');
  });
  it('distinguishes first publication from restoring a previously published book',()=>{
    TestBed.configureTestingModule({providers:[{provide:BookApi,useValue:{}}]});
    const f=TestBed.createComponent(BookStatusActions);f.componentRef.setInput('book',testBook());f.componentRef.setInput('role','OWNER');f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Xuất bản');expect(f.nativeElement.textContent).not.toContain('Hiện sách');
    f.componentRef.setInput('book',{...testBook(),publishedAt:'2026-10-30T00:00:00Z'});f.detectChanges();expect(f.nativeElement.textContent).toContain('Hiện sách');
  });
});
