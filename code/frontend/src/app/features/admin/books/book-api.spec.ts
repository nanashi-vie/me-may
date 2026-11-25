import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { BookApi } from './book-api';
describe('BookApi', () => {
  it('sends immutable IDs as strings and current version in status request', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(BookApi),
      http = TestBed.inject(HttpTestingController);
    api.publication('9007199254740993', 2, 'PUBLISHED', true).subscribe();
    http.expectOne('/api/v1/auth/csrf').flush({ token: 't', headerName: 'X-CSRF-TOKEN' });
    const r = http.expectOne('/api/v1/admin/books/9007199254740993/publication');
    expect(r.request.method).toBe('PATCH');
    expect(r.request.body).toEqual({ version: 2, status: 'PUBLISHED', confirmedActualCopy: true });
    r.flush({});
    http.verify();
  });
  it('sends every version when marking books as sold out', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const http = TestBed.inject(HttpTestingController);
    TestBed.inject(BookApi).markSoldOut([{ id: '7', version: 2 }]).subscribe();
    http.expectOne('/api/v1/auth/csrf').flush({ token: 't', headerName: 'X-CSRF-TOKEN' });
    const r = http.expectOne('/api/v1/admin/books/sold-out');
    expect(r.request.method).toBe('POST');
    expect(r.request.body).toEqual({ items: [{ id: '7', version: 2 }] });
    r.flush([]);
    http.verify();
  });
});
