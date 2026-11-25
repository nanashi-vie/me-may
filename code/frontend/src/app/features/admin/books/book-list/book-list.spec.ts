import {AuthService} from '../../../../core/auth/auth.service';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { vi } from 'vitest';
import { BookList } from './book-list';
import { BookApi } from '../book-api';
describe('BookList', () => {
  it('jumps directly using applied admin filters and locks pagination during loading/mutation', () => {
    const { f, root, open, textClick, navigate } = setupFilters(new Map([['q', 'cat'], ['publication', 'ARCHIVED']]));
    f.componentInstance.result.set({ items: [], page: 0, size: 20, totalElements: 200, totalPages: 10 });
    open(); textClick('Công khai'); f.detectChanges();
    const button = root.querySelector<HTMLButtonElement>('app-pagination button[aria-label="Trang 5"]');
    expect(button).not.toBeNull();
    button!.click();
    expect(navigate).toHaveBeenLastCalledWith([], expect.objectContaining({ queryParams: expect.objectContaining({ q: 'cat', publication: 'ARCHIVED', page: 4 }) }));
    f.componentInstance.loading.set(true); f.detectChanges();
    expect(root.querySelector<HTMLButtonElement>('app-pagination button[aria-label="Trang 5"]')?.disabled).toBe(true);
    f.componentInstance.loading.set(false); f.componentInstance.mutationBusy.set(true); f.detectChanges();
    expect(root.querySelector<HTMLButtonElement>('app-pagination button[aria-label="Trang 5"]')?.disabled).toBe(true);
  });
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
    expect(changeTrash).toHaveBeenCalledExactlyOnceWith('7',2);
  });
  it('leaves the trash link to the sidebar and focuses cancel before opening its own confirmations',()=>{
    const bulkTrash=vi.fn(()=>of(undefined));
    const item={id:'7',bookCode:'MM-000007',title:'Imported',publication:'ARCHIVED',version:2,totalStock:0};
    TestBed.configureTestingModule({providers:[provideRouter([]),{provide:AuthService,useValue:{user:()=>({role:'OWNER'})}},
      {provide:ActivatedRoute,useValue:{queryParamMap:of(new Map())}},
      {provide:BookApi,useValue:{ storageBoxes: () => of([]), bulkTrash,list:()=>of({items:[item],page:0,size:20,totalElements:1,totalPages:1})}}]});
    const f=TestBed.createComponent(BookList);f.detectChanges();
    const root=f.nativeElement as HTMLElement;
    expect(root.querySelector('a[href^="/admin/thung-rac"]')).toBeNull();
    const focused:(string|undefined)[]=[];
    const dialogs=Array.from(root.querySelectorAll('dialog')).slice(0,2);
    for(const d of dialogs){d.showModal=vi.fn(()=>{focused.push(d.querySelector('[autofocus]')?.textContent?.trim());});d.close=vi.fn();}
    root.querySelector<HTMLButtonElement>('button[aria-label="Chuyển MM-000007 vào Thùng rác"]')!.click();f.detectChanges();
    root.querySelector<HTMLInputElement>('[aria-label="Chọn MM-000007"]')!.click();f.detectChanges();
    root.querySelector<HTMLButtonElement>('.bulk-trash-btn')!.click();f.detectChanges();
    expect(focused).toEqual(['Hủy','Hủy']);
    dialogs[1].querySelectorAll('button')[1].click();
    expect(bulkTrash).toHaveBeenCalledExactlyOnceWith([{id:'7',version:2}]);
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
  describe('mark as sold out', () => {
    const books = () => [
      {id:'7',bookCode:'MM-000007',title:'Bảy',publication:'PUBLISHED',availability:'AVAILABLE',version:2,totalStock:1,updatedAt:'2026-11-23T00:00:00Z'},
      {id:'8',bookCode:'MM-000008',title:'Tám',publication:'ARCHIVED',publishedAt:null,availability:'SOLD',version:5,totalStock:0,updatedAt:'2026-11-22T00:00:00Z'},
      {id:'9',bookCode:'MM-000009',title:'Chín',publication:'ARCHIVED',publishedAt:null,availability:'AVAILABLE',version:4,totalStock:3,updatedAt:'2026-11-21T00:00:00Z'},
    ];
    function setup(role = 'OWNER') {
      const response = new Subject<unknown[]>();
      const markSoldOut = vi.fn(() => response);
      const list = vi.fn(() => of({items:books(),page:0,size:20,totalElements:3,totalPages:1}));
      TestBed.configureTestingModule({providers:[provideRouter([]),
        {provide:AuthService,useValue:{user:()=>({role})}},
        {provide:ActivatedRoute,useValue:{queryParamMap:of(new Map())}},
        {provide:BookApi,useValue:{storageBoxes:()=>of([]),list,markSoldOut}}]});
      const f = TestBed.createComponent(BookList); f.detectChanges();
      const root = f.nativeElement as HTMLElement;
      const dialog = root.querySelector<HTMLDialogElement>('dialog.sold-out-dialog')!;
      dialog.showModal = vi.fn(); dialog.close = vi.fn();
      const row = (id:string) => root.querySelector<HTMLElement>('#admin-book-' + id)!;
      const rowButton = (id:string) => row(id).querySelector<HTMLButtonElement>('.sold-out-btn');
      const bulk = () => root.querySelector<HTMLButtonElement>('.bulk-sold-out-btn')!;
      const dialogButton = (text:string) => Array.from(dialog.querySelectorAll('button')).find(b=>b.textContent.trim()===text);
      const select = (code:string) => { root.querySelector<HTMLInputElement>(`[aria-label="Chọn ${code}"]`)!.click(); f.detectChanges(); };
      return {f,root,dialog,row,rowButton,bulk,dialogButton,select,response,markSoldOut,list};
    }
    const codes = (root:HTMLElement) => Array.from(root.querySelectorAll('tbody tr')).map(tr=>tr.id);

    it('confirms one book then updates its row in place without reloading', () => {
      const t = setup();
      t.rowButton('7')!.click(); t.f.detectChanges();
      expect(t.dialog.showModal).toHaveBeenCalledOnce();
      expect(t.dialog.textContent).toContain('MM-000007');
      expect(t.dialog.textContent).toContain('1 → 0');
      expect(t.dialog.textContent).toContain('vẫn công khai');
      expect(t.markSoldOut).not.toHaveBeenCalled();

      t.dialogButton('Đánh dấu hết hàng')!.click(); t.f.detectChanges();
      expect(t.markSoldOut).toHaveBeenCalledExactlyOnceWith([{id:'7',version:2}]);
      expect(t.dialogButton('Đánh dấu hết hàng')!.disabled).toBe(true);
      t.response.next([{id:'7',version:3,totalStock:0,availability:'SOLD',updatedAt:'2026-11-25T06:00:00Z'}]); t.f.detectChanges();

      expect(t.dialog.close).toHaveBeenCalledOnce();
      expect(t.list).toHaveBeenCalledOnce();
      expect(codes(t.root)).toEqual(['admin-book-7','admin-book-8','admin-book-9']);
      expect(t.row('7').querySelector('.sold-out-badge')?.textContent).toContain('Hết hàng');
      expect(t.row('7').textContent).toContain('25/11/2026 13:00');
      expect(t.rowButton('7')).toBeNull();
      expect(t.f.componentInstance.result()!.items[0]).toMatchObject({version:3,totalStock:0,availability:'SOLD'});
      expect(t.root.querySelector('[role="status"]')?.textContent).toContain('Đã đánh dấu hết hàng MM-000007');
    });
    it('renders the cancel button before opening so the browser can autofocus it', () => {
      const t = setup();
      let focusable: string | undefined;
      t.dialog.showModal = vi.fn(() => { focusable = t.dialog.querySelector('[autofocus]')?.textContent?.trim(); });
      t.rowButton('7')!.click(); t.f.detectChanges();
      expect(focusable).toBe('Hủy');
    });
    it('offers hidden books but never claims they stay public', () => {
      const t = setup();
      t.rowButton('9')!.click(); t.f.detectChanges();
      expect(t.dialog.textContent).toContain('3 → 0');
      expect(t.dialog.textContent).not.toContain('công khai');
    });
    it('shows the badge instead of the action for books already sold out', () => {
      const t = setup();
      expect(t.row('8').querySelector('.sold-out-badge')).not.toBeNull();
      expect(t.rowButton('8')).toBeNull();
      expect(t.row('7').querySelector('.sold-out-badge')).toBeNull();
    });
    it('hides the actions from STAFF but keeps the badge', () => {
      const t = setup('STAFF');
      expect(t.root.querySelector('.sold-out-btn, .bulk-sold-out-btn')).toBeNull();
      expect(t.row('8').querySelector('.sold-out-badge')).not.toBeNull();
    });
    it('bulk marks only selected books that still have stock and clears the selection', () => {
      const t = setup();
      expect(t.bulk().disabled).toBe(true);
      t.select('MM-000008');
      expect(t.bulk().textContent).toContain('(0 cuốn)');
      expect(t.bulk().disabled).toBe(true);
      t.select('MM-000007'); t.select('MM-000009');
      expect(t.bulk().textContent).toContain('(2 cuốn)');
      t.bulk().click(); t.f.detectChanges();
      expect(t.dialog.textContent).toContain('2 cuốn');
      expect(t.dialog.textContent).toContain('4 → 0');
      t.dialogButton('Đánh dấu hết hàng')!.click();
      expect(t.markSoldOut).toHaveBeenCalledExactlyOnceWith([{id:'7',version:2},{id:'9',version:4}]);
      t.response.next(['7','9'].map(id=>({id,version:9,totalStock:0,availability:'SOLD',updatedAt:'2026-11-25T06:00:00Z'}))); t.f.detectChanges();
      expect(t.f.componentInstance.selected().size).toBe(0);
      expect(t.root.querySelectorAll('.sold-out-badge').length).toBe(3);
      expect(t.root.querySelector('[role="status"]')?.textContent).toContain('2 cuốn');
    });
    it('keeps the dialog open with a clear version conflict and reloads the list', () => {
      const t = setup();
      t.rowButton('7')!.click(); t.f.detectChanges();
      t.dialogButton('Đánh dấu hết hàng')!.click();
      t.response.error(new HttpErrorResponse({status:409,error:{error:'version_conflict',currentVersion:3}})); t.f.detectChanges();
      const alert = t.dialog.querySelector('[role="alert"]');
      expect(alert?.textContent).toContain('MM-000007');
      expect(alert?.textContent).toContain('tồn kho chưa đổi');
      expect(t.dialog.close).not.toHaveBeenCalled();
      expect(t.dialogButton('Đánh dấu hết hàng')).toBeUndefined();
      expect(t.list).toHaveBeenCalledTimes(2);
      expect(t.rowButton('7')).not.toBeNull();
      t.dialogButton('Đóng')!.click();
      expect(t.dialog.close).toHaveBeenCalledOnce();
    });
    it('does not claim the stock is unchanged when the result is unknown', () => {
      const t = setup();
      t.rowButton('7')!.click(); t.f.detectChanges();
      t.dialogButton('Đánh dấu hết hàng')!.click();
      t.response.error(new HttpErrorResponse({status:0})); t.f.detectChanges();
      const alert = t.dialog.querySelector('[role="alert"]');
      expect(alert?.textContent).toContain('Chưa xác nhận được');
      expect(alert?.textContent).not.toContain('chưa đổi');
      expect(t.list).toHaveBeenCalledTimes(2);
    });
    it('draws the trash action as an SVG that follows the button colour', () => {
      const t = setup();
      const button = t.row('7').querySelector<HTMLButtonElement>('button[aria-label="Chuyển MM-000007 vào Thùng rác"]')!;
      expect(button.textContent.trim()).toBe('');
      expect(Array.from(button.querySelectorAll('svg path')).map(p=>p.getAttribute('fill'))).toEqual(['currentColor','currentColor','currentColor']);
    });
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
