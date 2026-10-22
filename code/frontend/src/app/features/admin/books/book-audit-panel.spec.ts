import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { BookAuditPanel } from './book-audit-panel';
import { BookApi } from './book-api';
describe('Book audit', () => {
  it('requests explicit audit page and renders business values as escaped text', () => {
    const audit = vi.fn(() =>
      of({
        items: [
          {
            id: 'a',
            actorId: '2',
            action: 'UPDATE',
            before: { title: '<script>bad</script>' },
            after: { title: 'New' },
            aggregateVersion: 3,
            createdAt: '2026-10-22T00:00:00Z',
          },
        ],
        page: 1,
        size: 20,
        totalElements: 21,
        totalPages: 2,
      }),
    );
    TestBed.configureTestingModule({ providers: [{ provide: BookApi, useValue: { audit } }] });
    const f = TestBed.createComponent(BookAuditPanel);
    f.componentRef.setInput('bookId', '1');
    f.componentRef.setInput('version', 3);
    f.componentInstance.load(1);
    f.detectChanges();
    expect(audit).toHaveBeenCalledWith('1', 1);
    expect(f.nativeElement.querySelector('script')).toBeNull();
  });
});
