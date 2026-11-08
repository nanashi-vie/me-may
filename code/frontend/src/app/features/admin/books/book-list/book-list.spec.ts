import {AuthService} from '../../../../core/auth/auth.service';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { vi } from 'vitest';
import { BookList } from './book-list';
import { BookApi } from '../book-api';
describe('BookList', () => {
  it('downloads only the checked books and reports which books have no photos', () => {
    const response = new Subject<HttpResponse<Blob>>();
    const downloadPhotos = vi.fn(() => response);
    const items = [7, 8, 9].map(id => ({id: String(id), bookCode: 'MM-00000' + id,
      title: 'Book ' + id, publication: 'ARCHIVED', version: 0}));
    TestBed.configureTestingModule({providers: [
      provideRouter([]),
      {provide: AuthService, useValue: {user: () => ({role: 'OWNER'}), epoch: () => 0}},
      {provide: ActivatedRoute, useValue: {queryParamMap: of(new Map())}},
      {provide: BookApi, useValue: {downloadPhotos, list: () => of({items, page: 0, totalPages: 1})}},
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
  it('opens category binding submenu on hover and filters immediately when selecting dropdown or chip', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { user: () => ({ role: 'OWNER' }) } },
        { provide: ActivatedRoute, useValue: { queryParamMap: of(new Map()) } },
        { provide: BookApi, useValue: { list: () => of({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }) } },
      ],
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(BookList);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('details')).toBeNull();
    const categoryField = root.querySelector('.filter-category') as HTMLElement;
    expect(categoryField).not.toBeNull();
    const trigger = categoryField.querySelector('.dropdown-trigger') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();

    const submenuWraps = Array.from(categoryField.querySelectorAll('.dropdown-submenu-wrap')) as HTMLElement[];
    expect(submenuWraps.length).toBeGreaterThan(0);
    submenuWraps[0].dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();

    const submenuItems = Array.from(categoryField.querySelectorAll('.dropdown-submenu .dropdown-item')) as HTMLButtonElement[];
    expect(submenuItems.map((b) => b.querySelector('.item-text')?.textContent?.trim())).toEqual([
      'Tất cả kiểu bìa',
      'Paperback',
      'Hardcover',
    ]);

    submenuItems[1].click();
    fixture.detectChanges();
    expect(navigate).toHaveBeenCalledWith([], expect.objectContaining({
      queryParams: expect.objectContaining({ category: 'PICTURE_BOOK', binding: 'PAPERBACK', page: 0 }),
    }));
    expect(trigger.textContent).toContain('Picture book · Paperback');
  });
  it('renders bulk toolbar with inline select-all checkbox and dedicated row checkbox column', () => {
    const item = { id: '7', bookCode: 'MM-000007', title: 'Imported', publication: 'ARCHIVED', version: 2, totalStock: 1 };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { user: () => ({ role: 'OWNER' }) } },
        { provide: ActivatedRoute, useValue: { queryParamMap: of(new Map()) } },
        { provide: BookApi, useValue: { list: () => of({ items: [item], page: 0, size: 20, totalElements: 1, totalPages: 1 }) } },
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
});
