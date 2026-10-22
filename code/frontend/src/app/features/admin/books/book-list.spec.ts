import { TestBed } from '@angular/core/testing';
import { ActivatedRoute,provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { BookList } from './book-list';
import { BookApi } from './book-api';
describe('BookList',()=>{
 it('restores filters and page from the URL',()=>{const list=vi.fn(()=>of({items:[],page:2,size:20,totalElements:0,totalPages:0}));TestBed.configureTestingModule({providers:[provideRouter([]),{provide:ActivatedRoute,useValue:{queryParamMap:of(new Map([['q','sách'],['page','2'],['publication','DRAFT']]))}},{provide:BookApi,useValue:{list}}]});const fixture=TestBed.createComponent(BookList);fixture.detectChanges();expect(list).toHaveBeenCalledWith({q:'sách',page:2,publication:'DRAFT',availability:undefined});});
});
