import {AuthService} from '../../../../core/auth/auth.service';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { BookList } from './book-list';
import { BookApi } from '../book-api';
describe('BookList', () => {
  it('identifies an imported book without a price',()=>{
    TestBed.configureTestingModule({providers:[provideRouter([]),{provide:AuthService,useValue:{user:()=>({role:'OWNER'})}},{provide:ActivatedRoute,useValue:{queryParamMap:of(new Map())}},
      {provide:BookApi,useValue:{list:()=>of({items:[{id:'7',bookCode:'MM-000007',title:'Imported',priceMinVnd:null,priceMaxVnd:null,publication:'ARCHIVED',publishedAt:null,totalStock:1,version:0,updatedAt:'2026-11-06T00:00:00Z'}],page:0,size:20,totalElements:1,totalPages:1})}}]});
    const f=TestBed.createComponent(BookList);f.detectChanges();expect(f.nativeElement.textContent).toContain('Chưa nhập giá');
    expect(f.nativeElement.textContent).not.toContain('0 đ');
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
});
