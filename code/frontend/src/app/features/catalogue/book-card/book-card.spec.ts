import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BookCard } from './book-card';
import { testBook } from '../../admin/books/book-test-fixture';
import { PublicBook } from '../public.models';
const book:PublicBook={...testBook(),conditionGrade:null,conditionNote:null,title:'Book',categoryCode:'BOARD_BOOK',salePriceVnd:null,saleEndsAt:null,variants:[]};
describe('book card feature',()=>{
  it('shows only the first feature outside the decorative hidden cover link',()=>{
    TestBed.configureTestingModule({providers:[provideRouter([])]});
    const f=TestBed.createComponent(BookCard);f.componentRef.setInput('book',{...book,features:[{code:'SOUND',label:'Âm thanh'},{code:'FLAP',label:'Lật mở'}]});f.detectChanges();
    const tag=f.nativeElement.querySelector('.feature-tag') as HTMLElement;
    expect(tag?.textContent).toContain('Âm thanh');expect(f.nativeElement.textContent).not.toContain('Lật mở');
    expect(tag.closest('[aria-hidden="true"]')).toBeNull();
    f.componentRef.setInput('book',book);f.detectChanges();expect(f.nativeElement.querySelector('.feature-tag')).toBeNull();
  });
});
