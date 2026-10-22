import { TestBed } from '@angular/core/testing';
import { ActivatedRoute,provideRouter,Router } from '@angular/router';
import { of,Subject,throwError } from 'rxjs';
import { vi } from 'vitest';
import { BookEditor } from './book-editor';
import { BookApi } from './book-api';
import { CollectionApi } from '../collections/collection-api';
import { AuthService } from '../../../core/auth/auth.service';
import { BookDetail } from './book.models';
import { HttpErrorResponse } from '@angular/common/http';
const draft={id:'1',bookCode:'MM-000001',slug:'mm-000001',version:0,publication:'DRAFT',availability:'AVAILABLE',media:[],ageGroups:[],collectionIds:[]} as unknown as BookDetail;
describe('BookEditor safe saves',()=>{
 let create:ReturnType<typeof vi.fn>, update:ReturnType<typeof vi.fn>;
 beforeEach(()=>{create=vi.fn(()=>of(draft));update=vi.fn(()=>of(draft));TestBed.configureTestingModule({providers:[provideRouter([]),{provide:ActivatedRoute,useValue:{snapshot:{paramMap:new Map()}}},{provide:BookApi,useValue:{create,update,get:()=>throwError(()=>new HttpErrorResponse({status:404})),taxonomy:()=>of({categories:[],ageGroups:[],bindings:[],readingLevels:[]})}},{provide:CollectionApi,useValue:{list:()=>of([])}},{provide:AuthService,useValue:{user:()=>({role:'OWNER'})}}]});});
 function editor(){return TestBed.createComponent(BookEditor).componentInstance;}
 it('createsThenNavigatesToEditor and prevents double click',()=>{const pending=new Subject<BookDetail>();create.mockReturnValue(pending);const e=editor();const navigate=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);e.saveDraft();e.saveDraft();expect(create).toHaveBeenCalledTimes(1);pending.next(draft);expect(navigate).toHaveBeenCalledWith(['/admin/sach','1']);});
 it('lostCreateResponseDoesNotPostAgain',()=>{create.mockReturnValue(throwError(()=>new HttpErrorResponse({status:0})));const e=editor();e.form.controls.title.setValue('Nội dung cần giữ');e.form.markAsDirty();e.saveDraft();e.saveDraft();expect(create).toHaveBeenCalledTimes(1);expect(e.form.controls.title.value).toBe('Nội dung cần giữ');expect(e.createUncertain()).toBe(true);});
 it('conflictPreservesDirtyForm and sessionExpiryKeepsFormInMemory',()=>{const e=editor();e.accept(draft);e.form.controls.title.setValue('Chỉnh sửa');e.form.markAsDirty();update.mockReturnValue(throwError(()=>new HttpErrorResponse({status:409})));e.saveDraft();expect(e.form.dirty).toBe(true);expect(e.form.controls.title.value).toBe('Chỉnh sửa');update.mockReturnValue(throwError(()=>new HttpErrorResponse({status:401})));e.saveDraft();expect(e.needsLogin()).toBe(true);expect(e.form.controls.title.value).toBe('Chỉnh sửa');});
 it('leavingDirtyFormWarns',()=>{const e=editor();e.form.markAsDirty();const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);expect(e.canLeave()).toBe(false);expect(confirm).toHaveBeenCalled();});
 it('inactiveCollectionCanBeKeptOrRemoved',()=>{const e=editor();e.accept({...draft,collectionIds:['old']});e.collections.set([{id:'old',name:'Old',slug:'old',sortOrder:0,active:false,version:0,createdAt:'',updatedAt:''},{id:'other',name:'Other',slug:'other',sortOrder:1,active:false,version:0,createdAt:'',updatedAt:''}]);expect(e.availableCollections().map(c=>c.id)).toEqual(['old']);e.toggleCollection('old',false);expect(e.form.controls.collectionIds.value).toEqual([]);});
 it('failedExistingLoadNeverCreatesAnotherBook',()=>{(TestBed.inject(ActivatedRoute).snapshot.paramMap as unknown as Map<string,string>).set('id','missing');const e=editor();e.ngOnInit();e.saveDraft();expect(create).not.toHaveBeenCalled();});
});
