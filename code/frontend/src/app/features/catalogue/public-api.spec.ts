import { vi } from 'vitest';
import { PublicClock } from './public-clock';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PublicApi } from './public-api';
describe('Public catalogue HTTP', () => {
  it('looks up ordered book codes without credentials or transfer cache', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const api = TestBed.inject(PublicApi), http = TestBed.inject(HttpTestingController);
    api.lookup(['MM-000002', 'MM-1000000']).subscribe();
    const req = http.expectOne(r => r.url === '/api/v1/books/lookup');
    expect(req.request.params.getAll('code')).toEqual(['MM-000002', 'MM-1000000']);
    expect(req.request.credentials).toBe('omit');
    expect(req.request.transferCache).toBe(false);
    req.flush([]); http.verify();
  });
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

describe('Server time on direct entry', () => {
  for (const skew of [-3600000, 3600000])
    it('synchronizes public detail despite device skew ' + skew, () => {
      TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting()],
      });
      const api = TestBed.inject(PublicApi),
        http = TestBed.inject(HttpTestingController),
        clock = TestBed.inject(PublicClock);
      const now = Date.parse('2026-10-23T13:00:00Z');
      vi.spyOn(Date, 'now').mockReturnValue(now + skew);
      api.detail('mm-000001').subscribe();
      http
        .expectOne('/api/v1/books/mm-000001')
        .flush({}, { headers: { 'X-Memay-Server-Time': '2026-10-23T13:00:00Z' } });
      expect(clock.now()).toBe(now);
      vi.restoreAllMocks();
      http.verify();
    });
});
