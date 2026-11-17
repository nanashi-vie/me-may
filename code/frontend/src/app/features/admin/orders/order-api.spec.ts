import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { OrderApi } from './order-api';
describe('OrderApi', () => {
  function setup() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    return { api: TestBed.inject(OrderApi), http: TestBed.inject(HttpTestingController) };
  }
  it('sends private paged filters with string customer ID', () => {
    const { api, http } = setup();
    api
      .list({
        q: '+84901234567',
        status: 'ALL',
        page: 1,
        size: 20,
        customerId: '9007199254740993',
        createdFrom: '',
        createdTo: '',
        keepWarning: 'ALL',
      })
      .subscribe();
    const r = http.expectOne((r) => r.url === '/api/v1/admin/orders');
    expect(r.request.params.get('q')).toBe('+84901234567');
    expect(r.request.params.get('customerId')).toBe('9007199254740993');
    expect(r.request.params.get('page')).toBe('1');
    expect(r.request.withCredentials).toBe(true);
    expect(r.request.transferCache).toBe(false);
    r.flush({ items: [], page: 1, size: 20, totalElements: 0, totalPages: 0 });
    http.verify();
  });
  it('DELETE sends reason in body and retry keeps the same immutable command', () => {
    const { api, http } = setup();
    const body = {
      version: 2,
      requestId: '11111111-1111-4111-8111-111111111111',
      reason: 'Customer removed book',
    };
    api.removeItem('5', '9', body).subscribe({ error: () => {} });
    body.reason = 'Edited while csrf pending';
    http.expectOne('/api/v1/auth/csrf').flush({ token: 't', headerName: 'X-CSRF-TOKEN' });
    const first = http.expectOne('/api/v1/admin/orders/5/items/9');
    expect(first.request.method).toBe('DELETE');
    expect(first.request.body.reason).toBe('Customer removed book');
    expect(first.request.body.requestId).toBe('11111111-1111-4111-8111-111111111111');
    first.error(new ProgressEvent('error'));
    api.removeItem('5', '9', { ...body, reason: 'Customer removed book' }).subscribe();
    const retry = http.expectOne('/api/v1/admin/orders/5/items/9');
    expect(retry.request.body.requestId).toBe(first.request.body.requestId);
    retry.flush({ id: '5', orderCode: 'DH-000005', version: 3, status: 'KEEPING' });
    http.verify();
  });
  it('csrf refresh retries the exact requestId and amount', () => {
    const { api, http } = setup();
    const body = {
      version: 2,
      requestId: '22222222-2222-4222-8222-222222222222',
      transactionType: 'PAYMENT',
      amount: 100000,
      paymentMethod: 'CASH',
    };
    api.command('5', 'payments', body).subscribe();
    http.expectOne('/api/v1/auth/csrf').flush({ token: 'old', headerName: 'X-CSRF-TOKEN' });
    const first = http.expectOne('/api/v1/admin/orders/5/payments');
    first.flush({ error: 'csrf_invalid' }, { status: 403, statusText: 'Forbidden' });
    body.amount = 200000;
    http.expectOne('/api/v1/auth/csrf').flush({ token: 'new', headerName: 'X-CSRF-TOKEN' });
    const retry = http.expectOne('/api/v1/admin/orders/5/payments');
    expect(retry.request.body.amount).toBe(100000);
    expect(retry.request.body.requestId).toBe('22222222-2222-4222-8222-222222222222');
    retry.flush({ id: '5', orderCode: 'DH-000005', version: 3, status: 'DRAFT' });
    http.verify();
  });
});
