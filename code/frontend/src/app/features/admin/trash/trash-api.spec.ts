import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TrashApi, TrashItem, TrashKind } from './trash-api';

describe('TrashApi', () => {
  function setup() {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    return { api: TestBed.inject(TrashApi), http: TestBed.inject(HttpTestingController) };
  }
  it('gives books the same item shape as customers and orders', () => {
    const { api, http } = setup();
    const seen: TrashItem[] = [];
    api.list('books', 2).subscribe((page) => seen.push(...page.items));
    const raw = { id: '7', version: 3, deletedAt: 'd', expiresAt: 'e' };
    const request = http.expectOne('/api/v1/admin/books/trash?page=2');
    request.flush({ items: [{ ...raw, bookCode: 'MM-000007', title: 'Bảy' }], page: 2, size: 20, totalElements: 41, totalPages: 3 });
    api.list('orders', 0).subscribe((page) => seen.push(...page.items));
    http.expectOne('/api/v1/admin/orders/trash?page=0').flush({ items: [{ ...raw, code: 'DH-000007', name: 'Lan' }] });
    expect(seen).toEqual([
      { ...raw, code: 'MM-000007', name: 'Bảy' },
      { ...raw, code: 'DH-000007', name: 'Lan' },
    ]);
    http.verify();
  });
  it.each([
    ['books', '/api/v1/admin/books/trash/bulk', { items: [{ id: '7', version: 3 }], permanent: true }],
    ['customers', '/api/v1/admin/customers/trash/purge', { items: [{ id: '7', version: 3 }] }],
    ['orders', '/api/v1/admin/orders/trash/purge', { items: [{ id: '7', version: 3 }] }],
  ] as [TrashKind, string, unknown][])('purges %s through its own endpoint', (kind, url, body) => {
    const { api, http } = setup();
    api.purge(kind, [{ id: '7', version: 3 }]).subscribe();
    http.expectOne('/api/v1/auth/csrf').flush({ token: 't', headerName: 'X-CSRF-TOKEN' });
    const request = http.expectOne(url);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush(null);
    http.verify();
  });
  it('moves and restores with the expected version', () => {
    const { api, http } = setup();
    for (const trashed of [true, false]) {
      api.change('customers', '9007199254740993', 4, trashed).subscribe();
      if (trashed) http.expectOne('/api/v1/auth/csrf').flush({ token: 't', headerName: 'X-CSRF-TOKEN' });
      const request = http.expectOne('/api/v1/admin/customers/9007199254740993/trash');
      expect(request.request.method).toBe('PATCH');
      expect(request.request.body).toEqual({ version: 4, trashed });
      request.flush(null);
    }
    http.verify();
  });
});
