import { provideHttpClient } from '@angular/common/http';
import { vi } from 'vitest';
import { TestBed, DeferBlockState, DeferBlockBehavior } from '@angular/core/testing';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { DriveBatchView, MediaRole } from '../book.models';
import { BookMediaPanel } from './book-media-panel';
import { BookUploadQueue } from '../book-upload-queue';
import { BookApi } from '../book-api';
import { testBook } from '../book-test-fixture';
describe('BookMediaPanel protected thumbnails',()=>{
 beforeEach(()=>TestBed.configureTestingModule({providers:[provideHttpClient(),BookUploadQueue,{provide:BookApi,useValue:{cancelSession:()=>of(null)}}]}));
 it('requests small server images in grid and loads full preview only on open',async()=>{
  const photos=TestBed.inject(BookUploadQueue);photos.configure({...testBook(),media:[{id:'photo-1',role:'FRONT',alt:'Bìa',sourceRef:null,contentPath:'/api/v1/admin/books/1/media/FRONT/content'}]});
  const fixture=TestBed.createComponent(BookMediaPanel);fixture.detectChanges();
  const blocks=await fixture.getDeferBlocks();expect(fixture.nativeElement.querySelector('.photo-slot img')).toBeNull();
  for(const block of blocks)await block.render(DeferBlockState.Complete);
  const root=fixture.nativeElement as HTMLElement;const image=root.querySelector('.photo-slot img')!;
  expect(image.getAttribute('src')).toContain('size=320');
  expect(image.getAttribute('loading')).toBe('lazy');expect(image.getAttribute('decoding')).toBe('async');
  expect(root.textContent).toContain('Đang tải ảnh xem trước');
  image.dispatchEvent(new Event('load'));fixture.detectChanges();expect(root.textContent).not.toContain('Đang tải ảnh xem trước');
  expect(root.querySelector('dialog img')).toBeNull();
  const dialog=root.querySelector('dialog') as HTMLDialogElement;
  dialog.showModal=()=>dialog.setAttribute('open','');dialog.close=()=>dialog.removeAttribute('open');
  (root.querySelector('.view-photo') as HTMLButtonElement).click();fixture.detectChanges();
  const full=root.querySelector('dialog img')!;
  expect(full.getAttribute('src')).not.toContain('size=320');
  expect(dialog.hasAttribute('open')).toBe(true);
  (root.querySelector('dialog button') as HTMLButtonElement).click();fixture.detectChanges();
  expect(root.querySelector('dialog img')).toBeNull();
 });
 it('keeps blob previews local',async()=>{
  const photos=TestBed.inject(BookUploadQueue);photos.configure({...testBook(),media:[{id:'photo-1',role:'FRONT',alt:'Bìa',sourceRef:null,contentPath:'/api/v1/admin/books/1/media/FRONT/content'}]});
  photos.rows.update(rows=>rows.map(r=>({...r,preview:'blob:local-fixture'})));
  const fixture=TestBed.createComponent(BookMediaPanel);fixture.detectChanges();
  for(const block of await fixture.getDeferBlocks())await block.render(DeferBlockState.Complete);
  expect(fixture.nativeElement.querySelector('.photo-slot img').getAttribute('src')).toBe('blob:local-fixture');
 });
});

describe('Drive import through the photo panel',()=>{
 afterEach(()=>sessionStorage.clear());
 it('keeps visible roles in sync from READY through refresh, confirmation and attaching five photos',async()=>{
  sessionStorage.clear();
  let book=testBook();
  const ready:DriveBatchView={id:'batch',mode:'IMPORT',state:'READY',expiresAt:'2099-01-01',digest:'digest',bookVersion:null,selections:[],
   items:Array.from({length:5},(_,i)=>({id:'item-'+i,fileId:'file-'+i,state:'READY',errorCode:null,mediaId:'media-'+i,
    contentPath:'/preview/'+i,candidates:['media-'+i]}))};
  let confirmed=false;
  const api={
   capabilities:()=>of({provider:'LOCAL',revision:'LOCAL:v1',formats:['image/jpeg'],maxBytes:10485760}),
   createSession:()=>of({id:'session',state:'OPEN',media:[]}),
   createDriveBatch:()=>of({...ready,state:'PROCESSING',items:ready.items.map(item=>({...item,state:'DOWNLOADING',candidates:[]}))}),
   driveBatch:()=>of(ready),
   confirmDriveBatch:vi.fn((_id:string,input:any)=>{confirmed=true;return of({...ready,state:'CONFIRMED',selections:input.selections});}),
   commitReplacement:vi.fn((_book:string,id:string,input:{version:number;role:MediaRole})=>{
    expect(confirmed).toBe(true);expect(input.version).toBe(book.version);
    book={...book,version:book.version+1,media:[...book.media,{id,role:input.role,provider:'LOCAL',alt:null,sourceRef:null,contentPath:'/attached/'+id}]};
    return of(book);
   }),
  };
  TestBed.configureTestingModule({deferBlockBehavior:DeferBlockBehavior.Manual,providers:[provideHttpClient(),BookUploadQueue,{provide:BookApi,useValue:api},
   {provide:AuthService,useValue:{user:signal({id:1,role:'OWNER'}),epoch:signal(1)}}]});
  const q=TestBed.inject(BookUploadQueue);q.configure(book);
  const f=TestBed.createComponent(BookMediaPanel);f.detectChanges();
  const panel=f.componentInstance,root=f.nativeElement as HTMLElement;
  const button=(label:string)=>Array.from(root.querySelectorAll('button')).find(b=>b.textContent?.trim()===label)!;
  const input=root.querySelector('textarea')!;
  input.value='file-0,file-1,file-2,file-3,file-4';input.dispatchEvent(new Event('input'));
  await panel.importSources();f.detectChanges();
  expect(root.querySelectorAll('.drive-item select')).toHaveLength(0);
  button('Làm mới tiến độ').click();
  await vi.waitFor(()=>expect(panel.drive.view()?.state).toBe('READY'));f.detectChanges();
  const selects=Array.from(root.querySelectorAll('.drive-item select')) as HTMLSelectElement[];
  expect(selects.map(s=>s.value)).toEqual(['FRONT','BACK','SPINE','INSIDE_1','INSIDE_2']);
  for(const [i,role] of [[0,'BACK'],[1,'FRONT']] as const){selects[i].value=role;selects[i].dispatchEvent(new Event('change'));f.detectChanges();}
  button('Làm mới tiến độ').click();await Promise.resolve();f.detectChanges();
  expect(selects.map(s=>s.value)).toEqual(['BACK','FRONT','SPINE','INSIDE_1','INSIDE_2']);
  expect(button('Xác nhận các ảnh đã chọn').disabled).toBe(false);
  expect(api.commitReplacement).not.toHaveBeenCalled();
  button('Xác nhận các ảnh đã chọn').click();
  await vi.waitFor(()=>expect(panel.drive.view()?.state).toBe('CONFIRMED'));f.detectChanges();
  expect(q.sorted().map(row=>[row.mediaId,row.role,row.pendingLocal,row.sourceStatus])).toEqual([
   ['media-1','FRONT',true,'VERIFIED'],['media-0','BACK',true,'VERIFIED'],['media-2','SPINE',true,'VERIFIED'],
   ['media-3','INSIDE_1',true,'VERIFIED'],['media-4','INSIDE_2',true,'VERIFIED'],
  ]);
  expect(api.commitReplacement).not.toHaveBeenCalled();
  for(const row of q.sorted())await q.commitLocal(row.id);
  expect(q.persisted()?.media).toHaveLength(5);expect(q.persisted()?.version).toBe(5);
  expect(q.pending()).toBe(false);expect(q.ready()).toBe(true);
  expect(panel.drive.thumbnail(ready.items[0])).toBe('/attached/media-0?v=2&size=320');
 });
});

describe('photo panel accessible order and readonly mode',()=>{
 function setup(){
  TestBed.configureTestingModule({providers:[provideHttpClient(),BookUploadQueue,{provide:BookApi,useValue:{cancelSession:()=>of(null)}}]});
  const q=TestBed.inject(BookUploadQueue);q.configure({...testBook(),media:[{id:'a',role:'FRONT',alt:'Cover',sourceRef:null,contentPath:'/a'},{id:'b',role:'BACK',alt:'Back',sourceRef:null,contentPath:'/b'}]});
  const f=TestBed.createComponent(BookMediaPanel);f.detectChanges();return{q,f};
 }
 it('sends one automatic matching request and keeps single-image verification separate', async () => {
  const { q, f } = setup();
  q.rows.update(rows => rows.map(row => ({ ...row, provider: 'LOCAL' })));
  const panel = f.componentInstance;
  const submit = vi.spyOn(panel.drive, 'submit').mockResolvedValue(undefined);
  const verify = vi.spyOn(q, 'verifySource').mockResolvedValue(true);
  panel.setBatch('file_a, file_b');
  await panel.matchSources();
  expect(submit).toHaveBeenCalledExactlyOnceWith('MATCH', 'file_a, file_b');
  expect(verify).not.toHaveBeenCalled();
 });
 it('offers Drive import when editing a saved book without photos',()=>{
  TestBed.configureTestingModule({providers:[provideHttpClient(),BookUploadQueue,{provide:BookApi,useValue:{cancelSession:()=>of(null)}}]});
  const q=TestBed.inject(BookUploadQueue);
  q.configure({...testBook(),media:[]});
  const f=TestBed.createComponent(BookMediaPanel);
  f.detectChanges();
  const input=f.nativeElement.querySelector('.drive-panel textarea') as HTMLTextAreaElement;
  input.value='https://drive.google.com/file/d/file_a/view';
  input.dispatchEvent(new Event('input'));f.detectChanges();
  const button=Array.from(f.nativeElement.querySelectorAll('.drive-panel button') as NodeListOf<HTMLButtonElement>)
   .find(button=>button.textContent?.includes('Tải ảnh từ Drive'));
  expect(button).toBeDefined();expect(button?.disabled).toBe(false);
 });
 it('changes a role with the dropdown available to keyboard and mobile users',()=>{
  const {q,f}=setup();expect(Array.from(f.nativeElement.querySelectorAll('.photo-slot select') as NodeListOf<HTMLSelectElement>).map(s=>s.value)).toEqual(['FRONT','BACK']);
  const role=f.nativeElement.querySelector('.photo-slot select') as HTMLSelectElement;role.value='BACK';role.dispatchEvent(new Event('change'));f.detectChanges();
  expect(q.assignments()).toEqual([{mediaId:'b',role:'FRONT'},{mediaId:'a',role:'BACK'}]);expect(f.nativeElement.querySelector('[aria-live]')?.textContent).toContain('vai trò Lưng');
 });
 it('shows photos while hiding all write controls for STAFF',async()=>{
  const {f}=setup();f.componentRef.setInput('readonly',true);f.detectChanges();
  for(const block of await f.getDeferBlocks())await block.render(DeferBlockState.Complete);
  expect(f.nativeElement.querySelectorAll('img')).toHaveLength(2);expect(f.nativeElement.querySelectorAll('input,select,fieldset')).toHaveLength(0);expect(f.nativeElement.querySelectorAll('.view-photo')).toHaveLength(2);
 });
});
