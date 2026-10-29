import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { BookStatusActions } from './book-status-actions';
import { BookApi } from './book-api';
import { testBook } from './book-test-fixture';
describe('Owner actions', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.close = vi.fn();
    HTMLDialogElement.prototype.showModal = vi.fn();
  });
  it('staffHasNoOwnerActions and publishNeedsActualCopyConfirmation', () => {
    const publication = vi.fn(() => of(testBook()));
    TestBed.configureTestingModule({
      providers: [{ provide: BookApi, useValue: { publication } }],
    });
    const f = TestBed.createComponent(BookStatusActions);
    f.componentRef.setInput('book', testBook());
    f.componentRef.setInput('role', 'STAFF');
    f.detectChanges();
    expect(f.nativeElement.textContent).not.toContain('Xuất bản');
    f.componentInstance.execute('PUBLISHED', true);
    expect(publication).not.toHaveBeenCalled();
    f.componentRef.setInput('role', 'OWNER');
    f.componentInstance.execute('PUBLISHED', false);
    expect(publication).not.toHaveBeenCalled();
    f.componentInstance.execute('PUBLISHED', true);
    expect(publication).toHaveBeenCalledWith('1', 0, 'PUBLISHED', true);
  });
  it('sends availability and archive/restore with current aggregate version', () => {
    const publication = vi.fn(() => of(testBook())),
      availability = vi.fn(() => of(testBook()));
    TestBed.configureTestingModule({
      providers: [{ provide: BookApi, useValue: { publication, availability } }],
    });
    const f = TestBed.createComponent(BookStatusActions);
    f.componentRef.setInput('book', { ...testBook(), version: 4 });
    f.componentRef.setInput('role', 'OWNER');
    f.componentInstance.execute('SOLD', false);
    expect(availability).toHaveBeenCalledWith('1', 4, 'SOLD');
    f.componentInstance.execute('ARCHIVED', false);
    expect(publication).toHaveBeenCalledWith('1', 4, 'ARCHIVED', false);
    f.componentInstance.execute('ARCHIVED', false);
    expect(publication).toHaveBeenCalledWith('1', 4, 'ARCHIVED', false);
  });
});
