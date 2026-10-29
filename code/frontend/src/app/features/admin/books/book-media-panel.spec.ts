import {TestBed} from '@angular/core/testing';
import {of} from 'rxjs';
import {BookMediaPanel} from './book-media-panel';
import {BookUploadQueue} from './book-upload-queue';
import {BookApi} from './book-api';
import {testBook} from './book-test-fixture';
describe('photo panel accessible order and readonly mode',()=>{
 function setup(){
  TestBed.configureTestingModule({providers:[BookUploadQueue,{provide:BookApi,useValue:{cancelSession:()=>of(null)}}]});
  const q=TestBed.inject(BookUploadQueue);q.configure({...testBook(),media:[{id:'a',role:'FRONT',alt:'Cover',sourceRef:null,contentPath:'/a'},{id:'b',role:'BACK',alt:'Back',sourceRef:null,contentPath:'/b'}]});
  const f=TestBed.createComponent(BookMediaPanel);f.detectChanges();return{q,f};
 }
 it('moves a photo using the same button available to keyboard and mobile users',()=>{
  const {q,f}=setup();(f.nativeElement.querySelector('button[aria-label="Đưa ảnh Bìa xuống"]') as HTMLButtonElement).click();f.detectChanges();
  expect(q.assignments()).toEqual([{mediaId:'b',role:'FRONT'},{mediaId:'a',role:'BACK'}]);expect(f.nativeElement.querySelector('[aria-live]')?.textContent).toContain('vị trí 2');
 });
 it('shows photos while hiding all write controls for STAFF',()=>{
  const {f}=setup();f.componentRef.setInput('readonly',true);f.detectChanges();
  expect(f.nativeElement.querySelectorAll('img')).toHaveLength(2);expect(f.nativeElement.querySelectorAll('button,input,select')).toHaveLength(0);
 });
});
