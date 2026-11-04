import { vi } from 'vitest';
import { DOCUMENT } from '@angular/common';
import { TransferState, makeStateKey } from '@angular/core';
import { PublicClock } from './public-clock';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PublicApi, PUBLIC_SITE_ORIGIN, PUBLIC_SITE_STATE } from './public-api';
describe('Public catalogue HTTP', () => {
  it('looks up ordered book codes without credentials or transfer cache', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(PublicApi),
      http = TestBed.inject(HttpTestingController);
    api.lookup(['MM-000002', 'MM-1000000']).subscribe();
    const req = http.expectOne((r) => r.url === '/api/v1/books/lookup');
    expect(req.request.params.getAll('code')).toEqual(['MM-000002', 'MM-1000000']);
    expect(req.request.credentials).toBe('omit');
    expect(req.request.transferCache).toBe(false);
    req.flush([]);
    http.verify();
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

describe('Public links after client-rendered admin entry', () => {
  it('uses the browser origin when the entry page has no SSR transfer state', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: TransferState, useValue: new TransferState() },
        {
          provide: DOCUMENT,
          useValue: { location: new URL('https://me-may.dqhungg8357.workers.dev/admin') },
        },
      ],
    });
    expect(TestBed.inject(PUBLIC_SITE_ORIGIN)).toBe('https://me-may.dqhungg8357.workers.dev');
  });

  it('keeps the transferred origin when SSR supplied one', () => {
    TestBed.inject(TransferState).set(PUBLIC_SITE_STATE, 'https://books.example');
    expect(TestBed.inject(PUBLIC_SITE_ORIGIN)).toBe('https://books.example');
  });
});

describe('public request reuse', () => {
  it('shares metadata, expires it, and retries failed requests', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const api = TestBed.inject(PublicApi), http = TestBed.inject(HttpTestingController);
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
    api.contact().subscribe();
    api.contact().subscribe();
    http.expectOne('/api/v1/contact').flush({ groupUrl: null, hotlineUrl: null });
    api.contact().subscribe();
    http.expectNone('/api/v1/contact');
    now.mockReturnValue(62000);
    api.contact().subscribe({ error: () => {} });
    http.expectOne('/api/v1/contact').flush({}, { status: 503, statusText: 'Unavailable' });
    api.contact().subscribe();
    http.expectOne('/api/v1/contact').flush({});
    api.invalidateMetadata();
    api.contact().subscribe();
    http.expectOne('/api/v1/contact').flush({});
    now.mockRestore();
    http.verify();
  });
  it('consumes home transfer state once while keeping detail verification fresh', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    TestBed.inject(TransferState).set(
      makeStateKey<unknown>('memay-public:/home'), { body: { shelves: [] }, serverNow: null });
    const api = TestBed.inject(PublicApi), http = TestBed.inject(HttpTestingController);
    let received: unknown;
    api.home().subscribe(value => received = value);
    expect(received).toEqual({ shelves: [] });
    http.expectNone('/api/v1/home');
    api.home().subscribe();
    http.expectOne('/api/v1/home').flush({ shelves: [] });
    api.detail('mm-000001').subscribe();
    http.expectOne('/api/v1/books/mm-000001').flush({});
    api.detail('mm-000001').subscribe();
    http.expectOne('/api/v1/books/mm-000001').flush({});
    http.verify();
  });
});

describe('transferred server time', () => {
  for (const skew of [-3600000, 3600000]) {
    it('keeps catalogue prices on server time despite device skew ' + skew, () => {
      TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
      const serverTime = '2026-11-04T10:00:00Z';
      const now = vi.spyOn(Date, 'now').mockReturnValue(Date.parse(serverTime) + skew);
      TestBed.inject(TransferState).set(makeStateKey<unknown>('memay-public:/taxonomy'),
        { body: { categories: [], ageGroups: [] }, serverNow: serverTime });
      const clock = TestBed.inject(PublicClock);
      let body: unknown;
      TestBed.inject(PublicApi).taxonomy().subscribe(value => body = value);
      expect(body).toEqual({ categories: [], ageGroups: [] });
      expect(clock.now()).toBe(Date.parse(serverTime));
      TestBed.inject(HttpTestingController).expectNone('/api/v1/taxonomy');
      now.mockRestore();
    });
  }
});
