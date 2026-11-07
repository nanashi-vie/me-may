import {AuthService} from '../../../../core/auth/auth.service';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { BookList } from './book-list';
import { BookApi } from '../book-api';
describe('BookList', () => {
  it('identifies an imported book without a price',()=>{
    TestBed.configureTestingModule({providers:[provideRouter([]),{provide:AuthService,useValue:{user:()=>({role:'OWNER'})}},{provide:ActivatedRoute,useValue:{queryParamMap:of(new Map())}},
      {provide:BookApi,useValue:{list:()=>of({items:[{id:'7',bookCode:'MM-000007',title:'Imported',priceMinVnd:null,priceMaxVnd:null,publication:'ARCHIVED',publishedAt:null,totalStock:1,version:0,updatedAt:'2026-11-06T00:00:00Z'}],page:0,size:20,totalElements:1,totalPages:1})}}]});
    const f=TestBed.createComponent(BookList);f.detectChanges();expect(f.nativeElement.textContent).toContain('Chưa nhập giá');
    expect(f.nativeElement.textContent).not.toContain('0 đ');
  });
  it('warns before trashing and only sends a mutation after confirmation',()=>{
    const changeTrash=vi.fn(()=>of(undefined));
    const item={id:'7',bookCode:'MM-000007',title:'Imported',publication:'ARCHIVED',version:2};
    TestBed.configureTestingModule({providers:[provideRouter([]),{provide:AuthService,useValue:{user:()=>({role:'OWNER'})}},
      {provide:ActivatedRoute,useValue:{queryParamMap:of(new Map())}},
      {provide:BookApi,useValue:{changeTrash,list:()=>of({items:[item],page:0,size:20,totalElements:1,totalPages:1})}}]});
    const f=TestBed.createComponent(BookList);f.detectChanges();
    const root=f.nativeElement as HTMLElement;
    const dialog=root.querySelector('dialog')!;
    dialog.showModal=vi.fn();dialog.close=vi.fn();
    root.querySelector<HTMLButtonElement>('button[aria-label*="MM-000007"]')!.click();f.detectChanges();
    expect(dialog.textContent).toContain('MM-000007');
    expect(dialog.textContent).toContain('7 ngày');
    dialog.querySelectorAll('button')[0].click();
    expect(changeTrash).not.toHaveBeenCalled();
    dialog.querySelectorAll('button')[1].click();
    expect(changeTrash).toHaveBeenCalledExactlyOnceWith('7',2,true);
  });
  it('confirms the full trash snapshot rather than only the visible page',()=>{
    const bulkTrash=vi.fn(()=>of(undefined));
    const trashSelection=vi.fn(()=>of([{id:'7',version:2},{id:'8',version:3}]));
    const item={id:'7',bookCode:'MM-000007',title:'Imported',version:2,expiresAt:'2099-01-01'};
    TestBed.configureTestingModule({providers:[provideRouter([]),
      {provide:AuthService,useValue:{user:()=>({role:'OWNER'})}},
      {provide:ActivatedRoute,useValue:{queryParamMap:of(new Map())}},
      {provide:BookApi,useValue:{bulkTrash,trashSelection,list:()=>of({items:[],page:0,totalPages:0}),
        trash:()=>of({items:[item],page:0,totalPages:2,totalElements:2})}}]});
    const f=TestBed.createComponent(BookList);f.componentInstance.showTrash();f.detectChanges();
    const root=f.nativeElement as HTMLElement;
    const dialog=root.querySelectorAll('dialog')[1];
    dialog.showModal=vi.fn();dialog.close=vi.fn();
    Array.from(root.querySelectorAll('button')).find(b=>b.textContent.trim()==='Dọn tất cả')!.click();
    f.detectChanges();
    expect(dialog.textContent).toContain('Dọn vĩnh viễn 2 cuốn');
    expect(bulkTrash).not.toHaveBeenCalled();
    dialog.querySelectorAll('button')[1].click();
    expect(bulkTrash).toHaveBeenCalledExactlyOnceWith([{id:'7',version:2},{id:'8',version:3}],true);
  });
  it('restores filters and page from the URL', () => {
    const list = vi.fn(() => of({ items: [], page: 2, size: 20, totalElements: 0, totalPages: 0 }));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {provide:AuthService,useValue:{user:()=>({role:'OWNER'})}},
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(
              new Map([
                ['q', 'sách'],
                ['page', '2'],
                ['publication', 'ARCHIVED'],
              ]),
            ),
          },
        },
        { provide: BookApi, useValue: { list } },
      ],
    });
    const fixture = TestBed.createComponent(BookList);
    fixture.detectChanges();
    expect(list).toHaveBeenCalledWith({
      q: 'sách',
      page: 2,
      publication: 'ARCHIVED',
      availability: undefined,
    });
  });
  it('lets STAFF inspect books without offering create or draft controls',()=>{
    TestBed.configureTestingModule({providers:[provideRouter([]),{provide:AuthService,useValue:{user:()=>({role:'STAFF'})}},{provide:ActivatedRoute,useValue:{queryParamMap:of(new Map())}},{provide:BookApi,useValue:{list:()=>of({items:[],page:0,size:20,totalElements:0,totalPages:0})}}]});
    const f=TestBed.createComponent(BookList);f.detectChanges();expect(f.nativeElement.querySelector('a[href="/admin/sach/moi"]')).toBeNull();expect(f.nativeElement.querySelector('option[value="DRAFT"]')).toBeNull();
  });
});
