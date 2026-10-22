import { TestBed } from '@angular/core/testing';
import { ActivatedRoute,provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { BookPreview } from './book-preview';
import { BookApi } from './book-api';
import { testBook } from './book-test-fixture';
import { Meta } from '@angular/platform-browser';
import { PageMetadata } from '../../../core/page-metadata';
describe('Book preview',()=>{
 it('hidesInternalFieldsAndMarksIncompleteDraft with safe title separators',()=>{const b={...testBook(),title:'Tên',publisher:null,author:'Tác giả',readingLevelBasis:'SECRET',sourceRef:'SECRET'};TestBed.configureTestingModule({providers:[provideRouter([]),{provide:ActivatedRoute,useValue:{snapshot:{paramMap:new Map([['id','1']])}}},{provide:BookApi,useValue:{preview:()=>of(b)}}]});const f=TestBed.createComponent(BookPreview);f.detectChanges();const text=f.nativeElement.textContent;expect(text).toContain('Tên | Tác giả');expect(text).toContain('chưa đủ điều kiện');expect(text).not.toContain('SECRET');expect(text).not.toContain('Trình độ đọc tham khảo:');expect(TestBed.inject(Meta).getTag('name="robots"')?.content).toContain('noindex');TestBed.inject(PageMetadata).set('Home','Description','/');expect(TestBed.inject(Meta).getTag('name="robots"')).toBeNull();});
});
