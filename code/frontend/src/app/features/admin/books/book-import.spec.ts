import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter,Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../../app.routes';
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { BookImport } from './book-import';
import { BookImportApi } from './book-import-api';
import { ImportPreview, ImportReceipt } from './book-import-models';
import { AuthService, CurrentAdmin } from '../../../core/auth/auth.service';
import { testBook } from './book-test-fixture';

const receipt:ImportReceipt={id:'batch',fingerprint:'a'.repeat(64),createdAt:'2026-10-31T00:00:00Z',books:[{groupKey:'A',id:'7',bookCode:'MM-000007',title:'Synthetic'}]};
function valid():ImportPreview {return {receipt:null,document:{groups:[{key:'A',write:{...testBook(),title:'Synthetic',language:'Tiếng Anh',categoryCode:'BOARD_BOOK',binding:null,conditionGrade:'HIGH_FRESHNESS',conditionNote:'Bìa đẹp',weightG:300,priceMinVnd:21000,priceMaxVnd:25000,variants:[{id:null,name:null,stock:2}]},collectionSlugs:[],rows:[2]}],issues:[],totalIssues:0,rowCount:1,fingerprint:'a'.repeat(64)}};}
describe('BookImport file and session boundaries',()=>{
  let previews:Subject<ImportPreview>[],commits:Subject<ImportReceipt>[],api:any;
  let epoch:ReturnType<typeof signal<number>>,user:ReturnType<typeof signal<CurrentAdmin|null>>;
  beforeEach(()=>{
    previews=[];commits=[];epoch=signal(0);user=signal<CurrentAdmin|null>({id:1,email:'owner@qa.test',role:'OWNER'});
    api={options:vi.fn(()=>of({taxonomy:{categories:[],ageGroups:[],bindings:[],readingLevels:[]},collections:[]})),
      template:vi.fn(()=>of(new Blob(['csv']))),
      preview:vi.fn(()=>{const s=new Subject<ImportPreview>();previews.push(s);return s;}),
      confirm:vi.fn(()=>{const s=new Subject<ImportReceipt>();commits.push(s);return s;})};
    TestBed.configureTestingModule({providers:[provideRouter([]),{provide:BookImportApi,useValue:api},
      {provide:AuthService,useValue:{user,epoch,refresh:()=>of(user()),login:()=>of(user()),logout:()=>of(null)}}]});
  });
  function setup(){const f=TestBed.createComponent(BookImport);f.detectChanges();return f;}
  function ready(c:BookImport){const file=new File(['csv'],'books.csv');c.select(file);c.checkFile();previews[0].next(valid());return file;}
  it('latePreviewCannotEnableAnotherFile',()=>{
    const f=setup(),c=f.componentInstance;const a=new File(['a'],'a.csv'),b=new File(['b'],'b.csv');
    c.select(a);c.checkFile();c.select(b);previews[0].next(valid());f.detectChanges();
    expect(c.selectedFile()).toBe(b);expect(c.preview()).toBeNull();expect(c.canConfirm()).toBe(false);
  });
  it('lostCommitResponseRetriesExactFileAndFingerprint',()=>{
    const f=setup(),c=f.componentInstance,file=ready(c);c.confirmed.set(true);c.confirm();c.confirm();
    expect(api.confirm).toHaveBeenCalledTimes(1);commits[0].error(new HttpErrorResponse({status:0}));f.detectChanges();
    expect(c.uncertain()).toBe(true);c.retryCommit();expect(api.confirm).toHaveBeenLastCalledWith(file,'a'.repeat(64));
    commits[1].next(receipt);f.detectChanges();expect(c.receipt()?.books[0].id).toBe('7');
    expect(f.nativeElement.querySelector('a[href="/admin/sach/7"]')).not.toBeNull();
  });
  it('drops preview and late commit result across authentication epochs',()=>{
    const f=setup(),c=f.componentInstance;ready(c);c.confirmed.set(true);c.confirm();
    epoch.set(1);user.set({id:2,email:'other@qa.test',role:'OWNER'});f.detectChanges();commits[0].next(receipt);f.detectChanges();
    expect(c.receipt()).toBeNull();expect(c.preview()).toBeNull();expect(c.canConfirm()).toBe(false);expect(c.selectedFile()).toBeNull();
  });
  it.each([401,403,409,422,429])('handles status %s without enabling a new confirmation',(status)=>{
    const f=setup(),c=f.componentInstance,file=ready(c);c.confirmed.set(true);c.confirm();
    commits[0].error(new HttpErrorResponse({status,headers:new HttpHeaders({'Retry-After':'60'}),error:{issues:[{sheet:'CSV',row:2,column:'gia_tu',code:'required',message:'Nhập giá'}],totalIssues:1}}));f.detectChanges();
    expect(c.canConfirm()).toBe(false);expect(c.error()).not.toBe('');
    if(status===401){expect(c.selectedFile()).toBe(file);expect(c.needsLogin()).toBe(true);}
    if(status===429)expect(c.retryAfter()).toBe('60');
    if(status===422)expect(c.issues()[0].column).toBe('gia_tu');
  });
  it('renders issue values as text and blocks invalid files',()=>{
    const f=setup(),c=f.componentInstance;c.select(new File(['csv'],'books.csv'));c.checkFile();
    const result=valid();result.document.fingerprint=null;result.document.issues=[{sheet:'CSV',row:2,column:'ten_sach',code:'required',message:'<img src=x onerror=alert(1)>'}];result.document.totalIssues=1001;
    previews[0].next(result);f.detectChanges();expect(c.canConfirm()).toBe(false);
    expect(f.nativeElement.textContent).toContain('<img src=x onerror=alert(1)>');expect(f.nativeElement.querySelector('img')).toBeNull();
    expect(f.nativeElement.textContent).toContain('1001');
  });
  it('shows a duplicate receipt and does not offer another import',()=>{
    const f=setup(),c=f.componentInstance;c.select(new File(['csv'],'books.csv'));c.checkFile();previews[0].next({...valid(),receipt});f.detectChanges();
    expect(c.canConfirm()).toBe(false);expect(c.receipt()?.id).toBe('batch');expect(f.nativeElement.textContent).toContain('MM-000007');
  });
  it('does not allow STAFF or detached late responses to change state',()=>{
    const f=setup(),c=f.componentInstance;c.select(new File(['csv'],'books.csv'));c.checkFile();f.destroy();previews[0].next(valid());expect(c.preview()).toBeNull();
    user.set({id:3,email:'staff@qa.test',role:'STAFF'});const other=setup().componentInstance;other.select(new File(['csv'],'books.csv'));other.checkFile();expect(api.preview).toHaveBeenCalledTimes(1);
  });
  it('late old-session 401 cannot ask the new owner to log in again',()=>{
    const f=setup(),c=f.componentInstance;c.select(new File(['csv'],'books.csv'));c.checkFile();
    epoch.set(1);user.set({id:2,email:'other@qa.test',role:'OWNER'});
    previews[0].error(new HttpErrorResponse({status:401}));f.detectChanges();expect(c.needsLogin()).toBe(false);
  });
  it('options download failure cannot unlock an in-flight commit',()=>{
    const options=new Subject();api.options.mockReturnValue(options);const f=setup(),c=f.componentInstance;
    ready(c);c.confirmed.set(true);c.confirm();options.error(new HttpErrorResponse({status:500}));
    expect(c.busy()).toBe(true);commits[0].next(receipt);expect(c.receipt()?.id).toBe('batch');
  });
  it('registers the import page before the book id route',async()=>{
    TestBed.inject(Router).resetConfig(routes);const harness=await RouterTestingHarness.create('/admin/sach/import');
    expect(harness.routeNativeElement?.querySelector('app-book-import')).not.toBeNull();
    expect(harness.routeNativeElement?.querySelector('app-book-editor')).toBeNull();
  });
});
