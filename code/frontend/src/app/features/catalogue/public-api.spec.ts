import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PublicApi } from './public-api';
describe('Public catalogue HTTP', () => {
  it('maps URL page and multiple ages without credentials or admin endpoint', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(PublicApi),
      http = TestBed.inject(HttpTestingController);
    api
      .books({
        q: '100% O_Reilly',
        category: 'PICTURE_BOOK',
        binding: 'HARDCOVER',
        age: ['AGE_4_6', 'AGE_7_9'],
        sort: 'price_asc',
        page: 2,
      })
      .subscribe();
    const req = http.expectOne((r) => r.url === '/api/v1/books');
    expect(req.request.params.get('q')).toBe('100% O_Reilly');
    expect(req.request.params.getAll('age')).toEqual(['AGE_4_6', 'AGE_7_9']);
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.withCredentials).toBe(false);
    expect(req.request.credentials).toBe('omit');
    expect(req.request.transferCache).toBe(false);
    req.flush({ items: [], page: 1, size: 20, totalElements: 0, totalPages: 0 });
    http.verify();
  });
});
