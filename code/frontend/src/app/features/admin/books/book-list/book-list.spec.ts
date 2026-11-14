import {AuthService} from '../../../../core/auth/auth.service';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { vi } from 'vitest';
import { BookList } from './book-list';
import { BookApi } from '../book-api';
describe('BookList', () => {
  it('highlights the whole row with a source reason and clears it when verified', () => {
    const item = {id:'7',bookCode:'MM-000007',title:'Book',publication:'PUBLISHED',version:1,
      priceMinVnd:20000,priceMaxVnd:20000,totalStock:1,unverifiedSourceRoles:['FRONT','BACK']};
    TestBed.configureTestingModule({providers:[provideRouter([]),
      {provide:AuthService,useValue:{user:()=>({role:'STAFF'})}},
      {provide:ActivatedRoute,useValue:{queryParamMap:of(new Map())}},
      {provide:BookApi,useValue:{storageBoxes:()=>of([]),list:()=>of({items:[item],page:0,totalPages:1})}}]});
    const f=TestBed.createComponent(BookList);f.detectChanges();
    const row=f.nativeElement.querySelector('#admin-book-7') as HTMLElement;
    expect(row.classList.contains('source-warning')).toBe(true);
    expect(row.querySelector('.source-warning-reason')?.textContent).toContain('Bìa · Lưng');
    expect(row.querySelector('.source-warning-reason')?.textContent).toContain('chưa được xác minh');
    expect(row.textContent).toContain('Công khai');
    f.componentInstance.result.update(page=>({...page!,items:[{...page!.items[0],unverifiedSourceRoles:[]}]}));
    f.detectChanges();
    expect(row.classList.contains('source-warning')).toBe(false);
    expect(row.querySelector('.source-warning-reason')).toBeNull();
  });
  it('downloads only the checked books and reports which books have no photos', () => {
    const response = new Subject<HttpResponse<Blob>>();
    const downloadPhotos = vi.fn(() => response);
    const items = [7, 8, 9].map(id => ({id: String(id), bookCode: 'MM-00000' + id,
      title: 'Book ' + id, publication: 'ARCHIVED', version: 0}));
    TestBed.configureTestingModule({providers: [
      provideRouter([]),
      {provide: AuthService, useValue: {user: () => ({role: 'OWNER'}), epoch: () => 0}},
      {provide: ActivatedRoute, useValue: {queryParamMap: of(new Map())}},
      {provide: BookApi, useValue: { storageBoxes: () => of([]),downloadPhotos, list: () => of({items, page: 0, totalPages: 1})}},
    ]});
    const fixture = TestBed.createComponent(BookList);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const button = Array.from(root.querySelectorAll('button'))
      .find(node => node.textContent.includes('Tải ảnh'))!;
    expect(button).toBeDefined();
    expect(button.disabled).toBe(true);
    root.querySelector<HTMLInputElement>('[aria-label="Chọn MM-000007"]')!.click();
    root.querySelector<HTMLInputElement>('[aria-label="Chọn MM-000009"]')!.click();
    fixture.detectChanges();
    button.click();
    fixture.detectChanges();
    expect(button.disabled).toBe(true);
    expect(downloadPhotos).toHaveBeenCalledExactlyOnceWith(['7', '9']);

    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('me-may-anh-sach.zip');
    });
    try {
      response.next(new HttpResponse({body: new Blob(['zip']), headers: new HttpHeaders({'X-Missing-Book-Codes': 'MM-000009'})}));
      fixture.detectChanges();
      expect(click).toHaveBeenCalledOnce();
      expect(root.querySelector('[role="status"]')?.textContent).toContain('MM-000009');
      response.complete();
      fixture.detectChanges();
      expect(button.disabled).toBe(false);
      const failure = new Subject<HttpResponse<Blob>>();
      downloadPhotos.mockReturnValueOnce(failure);
      button.click();
      failure.error(new HttpErrorResponse({status: 413}));
      fixture.detectChanges();
      expect(root.querySelector('[role="alert"]')?.textContent).toContain('32 MiB');
      expect(button.disabled).toBe(false);
    } finally {
      click.mockRestore();
    }
  });
  it('identifies an imported book without a price',()=>{
    TestBed.configureTestingModule({providers:[provideRouter([]),{provide:AuthService,useValue:{user:()=>({role:'OWNER'})}},{provide:ActivatedRoute,useValue:{queryParamMap:of(new Map())}},
      {provide:BookApi,useValue:{ storageBoxes: () => of([]), list:()=>of({items:[{id:'7',bookCode:'MM-000007',title:'Imported',priceMinVnd:null,priceMaxVnd:null,publication:'ARCHIVED',publishedAt:null,totalStock:1,version:0,updatedAt:'2026-11-06T00:00:00Z'}],page:0,size:20,totalElements:1,totalPages:1})}}]});
    const f=TestBed.createComponent(BookList);f.detectChanges();expect(f.nativeElement.textContent).toContain('Chưa nhập giá');
    expect(f.nativeElement.textContent).not.toContain('0 đ');
  });
  it('warns before trashing and only sends a mutation after confirmation',()=>{
    const changeTrash=vi.fn(()=>of(undefined));
    const item={id:'7',bookCode:'MM-000007',title:'Imported',publication:'ARCHIVED',version:2};
    TestBed.configureTestingModule({providers:[provideRouter([]),{provide:AuthService,useValue:{user:()=>({role:'OWNER'})}},
      {provide:ActivatedRoute,useValue:{queryParamMap:of(new Map())}},
      {provide:BookApi,useValue:{ storageBoxes: () => of([]), changeTrash,list:()=>of({items:[item],page:0,size:20,totalElements:1,totalPages:1})}}]});
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
      {provide:BookApi,useValue:{ storageBoxes: () => of([]), bulkTrash,trashSelection,list:()=>of({items:[],page:0,totalPages:0}),
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
        { provide: BookApi, useValue: { storageBoxes: () => of([]), list } },
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
    TestBed.configureTestingModule({providers:[provideRouter([]),{provide:AuthService,useValue:{user:()=>({role:'STAFF'})}},{provide:ActivatedRoute,useValue:{queryParamMap:of(new Map())}},{provide:BookApi,useValue:{ storageBoxes: () => of([]), list:()=>of({items:[],page:0,size:20,totalElements:0,totalPages:0})}}]});
    const f=TestBed.createComponent(BookList);f.detectChanges();expect(f.nativeElement.querySelector('a[href="/admin/sach/moi"]')).toBeNull();expect(f.nativeElement.querySelector('option[value="DRAFT"]')).toBeNull();
  });
  it('renders bulk toolbar with inline select-all checkbox and dedicated row checkbox column', () => {
    const item = { id: '7', bookCode: 'MM-000007', title: 'Imported', publication: 'ARCHIVED', version: 2, totalStock: 1 };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { user: () => ({ role: 'OWNER' }) } },
        { provide: ActivatedRoute, useValue: { queryParamMap: of(new Map()) } },
        { provide: BookApi, useValue: { storageBoxes: () => of([]), list: () => of({ items: [item], page: 0, size: 20, totalElements: 1, totalPages: 1 }) } },
      ],
    });
    const fixture = TestBed.createComponent(BookList);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    const toolbar = root.querySelector('.bulk-toolbar') as HTMLElement;
    expect(toolbar).not.toBeNull();
    const selectAllInput = toolbar.querySelector('.bulk-select-all input[type="checkbox"]') as HTMLInputElement;
    expect(selectAllInput).not.toBeNull();
    const rowCheck = root.querySelector('.book-cell input.row-check') as HTMLInputElement;
    expect(rowCheck).not.toBeNull();

    selectAllInput.click();
    fixture.detectChanges();
    expect(rowCheck.checked).toBe(true);
    expect(toolbar.querySelector('.bulk-trash-btn')?.textContent?.trim()).toBe('Chuyển 1 cuốn vào Thùng rác');
  });
  function setupFilters(params = new Map<string,string>()) {
    const queryParamMap = new Subject<Map<string,string>>();
    const list = vi.fn(() => of({items:[],page:0,size:20,totalElements:0,totalPages:0}));
    TestBed.configureTestingModule({providers:[provideRouter([]),
      {provide:AuthService,useValue:{user:()=>({role:'OWNER'})}},
      {provide:ActivatedRoute,useValue:{queryParamMap}},
      {provide:BookApi,useValue:{storageBoxes:()=>of([2,7]),list}}]});
    const navigate=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
    const f=TestBed.createComponent(BookList);
    queryParamMap.next(params);f.detectChanges();
    const root=f.nativeElement as HTMLElement;
    const click=(selector:string)=>{root.querySelector<HTMLButtonElement>(selector)!.click();f.detectChanges();};
    const textClick=(label:string)=>{Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
      .find(b=>b.textContent.trim()===label)!.click();f.detectChanges();};
    const open=()=>click('.filter-toggle');
    return {f,root,click,textClick,open,navigate,list,queryParamMap};
  }
  it('keeps multiple draft conditions local until Apply and resets the page',()=>{
    const {f,root,open,textClick,click,navigate,list}=setupFilters();open();
    textClick('Chưa xuất bản');click('[data-filter-group="availability"]');textClick('Còn hàng');
    click('[data-filter-group="storageBoxNumber"]');textClick('Chưa phân thùng');
    click('[data-filter-group="missingOnly"]');textClick('Thiếu thông tin');
    expect(navigate).not.toHaveBeenCalled();expect(list).toHaveBeenCalledTimes(1);
    expect(root.querySelector('.applied-filters')).toBeNull();
    textClick('Áp dụng');
    expect(navigate).toHaveBeenCalledExactlyOnceWith([],expect.objectContaining({queryParams:expect.objectContaining({
      publication:'',unpublishedOnly:true,availability:'AVAILABLE',storageBoxNumber:'0',missingOnly:true,page:0})}));
    expect(root.querySelector('.filter-panel')).toBeNull();
  });
  it('discards draft on Escape/outside click and reset only affects draft',()=>{
    const {f,root,open,textClick,navigate}=setupFilters(new Map([['publication','ARCHIVED']]));open();
    textClick('Công khai');textClick('Đặt lại');
    expect(navigate).not.toHaveBeenCalled();
    f.componentInstance.onEscapeKey();f.detectChanges();
    expect(root.querySelector('.filter-panel')).toBeNull();
    expect(root.querySelector('.applied-filters')!.textContent).toContain('Ẩn');
    open();expect(root.querySelector('.filter-options .selected')?.textContent).toContain('Ẩn');
    textClick('Công khai');document.body.click();f.detectChanges();open();
    expect(root.querySelector('.filter-options .selected')?.textContent).toContain('Ẩn');
  });
  it('supports binding submenu selection as draft and clears binding for Board book',()=>{
    const {f,root,open,click,textClick,navigate}=setupFilters();open();click('[data-filter-group="category"]');
    root.querySelector<HTMLElement>('.dropdown-submenu-wrap')!.dispatchEvent(new MouseEvent('mouseenter'));f.detectChanges();
    const options=root.querySelectorAll<HTMLButtonElement>('.dropdown-submenu .dropdown-item');
    options[1].click();f.detectChanges();expect(navigate).not.toHaveBeenCalled();
    textClick('Áp dụng');expect(navigate).toHaveBeenLastCalledWith([],expect.objectContaining({queryParams:expect.objectContaining({category:'PICTURE_BOOK',binding:'PAPERBACK'})}));
    open();click('[data-filter-group="category"]');textClick('Board book');textClick('Áp dụng');
    expect(navigate).toHaveBeenLastCalledWith([],expect.objectContaining({queryParams:expect.objectContaining({category:'BOARD_BOOK',binding:''})}));
  });
  it('removes applied chips immediately while preserving other conditions and search',()=>{
    const {root,click,navigate}=setupFilters(new Map([['q','cat'],['publication','ARCHIVED'],['storageBoxNumber','0'],['missingOnly','true']]));
    expect(root.querySelector('.applied-filters')?.textContent).toContain('Chưa phân thùng');
    click('[aria-label="Bỏ bộ lọc Xuất bản: Ẩn"]');
    expect(navigate).toHaveBeenLastCalledWith([],expect.objectContaining({queryParams:expect.objectContaining({q:'cat',publication:'',missingOnly:true,storageBoxNumber:'0',page:0})}));
    click('.clear-filters');expect(navigate).toHaveBeenLastCalledWith([],expect.objectContaining({queryParams:expect.objectContaining({q:'cat',storageBoxNumber:'',missingOnly:false})}));
  });
  it('search and pagination use applied filters and URL updates dismiss stale drafts',()=>{
    const {f,root,open,textClick,navigate,queryParamMap}=setupFilters(new Map([['publication','ARCHIVED']]));open();textClick('Công khai');
    f.componentInstance.search(2);
    expect(navigate).toHaveBeenLastCalledWith([],expect.objectContaining({queryParams:expect.objectContaining({publication:'ARCHIVED',page:2})}));
    open();textClick('Công khai');queryParamMap.next(new Map([['unpublishedOnly','true'],['storageBoxNumber','7']]));f.detectChanges();
    expect(root.querySelector('.filter-panel')).toBeNull();
    expect(root.querySelector('.applied-filters')?.textContent).toContain('Chưa xuất bản');
    expect(root.querySelector('.applied-filters')?.textContent).toContain('Thùng 7');
  });
});
