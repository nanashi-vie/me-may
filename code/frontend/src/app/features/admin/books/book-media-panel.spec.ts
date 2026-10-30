import { TestBed, DeferBlockState } from '@angular/core/testing';
import { of } from 'rxjs';
import { BookMediaPanel } from './book-media-panel';
import { BookUploadQueue } from './book-upload-queue';
import { BookApi } from './book-api';
import { testBook } from './book-test-fixture';
describe('BookMediaPanel protected thumbnails',()=>{
 beforeEach(()=>TestBed.configureTestingModule({providers:[BookUploadQueue,{provide:BookApi,useValue:{cancelSession:()=>of(null)}}]}));
 it('requests small server images in grid and loads full preview only on open',async()=>{
  const photos=TestBed.inject(BookUploadQueue);photos.configure({...testBook(),media:[{id:'photo-1',role:'FRONT',alt:'Bìa',sourceRef:null,contentPath:'/api/v1/admin/books/1/media/FRONT/content'}]});
  const fixture=TestBed.createComponent(BookMediaPanel);fixture.detectChanges();
  const blocks=await fixture.getDeferBlocks();expect(fixture.nativeElement.querySelector('.photo-slot img')).toBeNull();
  for(const block of blocks)await block.render(DeferBlockState.Complete);
  const root=fixture.nativeElement as HTMLElement;const image=root.querySelector('.photo-slot img')!;
  expect(image.getAttribute('src')).toContain('size=320');
  expect(image.getAttribute('loading')).toBe('lazy');expect(image.getAttribute('decoding')).toBe('async');
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

describe('photo panel accessible order and readonly mode',()=>{
 function setup(){
  TestBed.configureTestingModule({providers:[BookUploadQueue,{provide:BookApi,useValue:{cancelSession:()=>of(null)}}]});
  const q=TestBed.inject(BookUploadQueue);q.configure({...testBook(),media:[{id:'a',role:'FRONT',alt:'Cover',sourceRef:null,contentPath:'/a'},{id:'b',role:'BACK',alt:'Back',sourceRef:null,contentPath:'/b'}]});
  const f=TestBed.createComponent(BookMediaPanel);f.detectChanges();return{q,f};
 }
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
