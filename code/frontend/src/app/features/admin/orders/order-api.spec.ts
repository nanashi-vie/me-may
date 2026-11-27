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
  it('csrf refresh retries the exact requestId and body', () => {
    const { api, http } = setup();
    const body = {
      version: 2,
      requestId: '22222222-2222-4222-8222-222222222222',
      reason: 'Customer cancelled',
    };
    api.command('5', 'cancel', body).subscribe();
    http.expectOne('/api/v1/auth/csrf').flush({ token: 'old', headerName: 'X-CSRF-TOKEN' });
    const first = http.expectOne('/api/v1/admin/orders/5/cancel');
    first.flush({ error: 'csrf_invalid' }, { status: 403, statusText: 'Forbidden' });
    body.reason = 'Edited later';
    http.expectOne('/api/v1/auth/csrf').flush({ token: 'new', headerName: 'X-CSRF-TOKEN' });
    const retry = http.expectOne('/api/v1/admin/orders/5/cancel');
    expect(retry.request.body.reason).toBe('Customer cancelled');
    expect(retry.request.body.requestId).toBe('22222222-2222-4222-8222-222222222222');
    retry.flush({ id: '5', orderCode: 'DH-000005', version: 3, status: 'DRAFT' });
    http.verify();
  });
  it('records a payment as multipart with the JSON part and one receipt file', () => {
    const { api, http } = setup();
    const proof = new File([new Uint8Array([137, 80, 78, 71])], 'bill.png', { type: 'image/png' });
    let result: any;
    api
      .recordPayment('5', { transactionType: 'DEPOSIT', amount: 100000, note: '', version: 2, requestId: 'r-1' }, proof)
      .subscribe((r) => (result = r));
    http.expectOne('/api/v1/auth/csrf').flush({ token: 't', headerName: 'X-CSRF-TOKEN' });
    const r = http.expectOne('/api/v1/admin/orders/5/payments');
    expect(r.request.method).toBe('POST');
    const form = r.request.body as FormData;
    expect(form.get('proof')).toBe(proof);
    expect((form.get('payment') as Blob).type).toBe('application/json');
    r.flush({ id: '5', version: 3, status: 'KEEPING' });
    expect(result).toEqual({ id: '5', version: 3, status: 'KEEPING' });
    http.verify();
  });
  it('sends a payment without a receipt part when there is no image', () => {
    const { api, http } = setup();
    api.recordPayment('5', { transactionType: 'DEPOSIT', amount: 1000, note: 'Tiền mặt', version: 2, requestId: 'r-2' }, null).subscribe();
    http.expectOne('/api/v1/auth/csrf').flush({ token: 't', headerName: 'X-CSRF-TOKEN' });
    const form = http.expectOne('/api/v1/admin/orders/5/payments').request.body as FormData;
    expect(form.has('proof')).toBe(false);
    http.verify();
  });
  it('points receipt images at the private admin path', () => {
    const { api } = setup();
    expect(api.proofUrl('5', '9')).toBe('/api/v1/admin/orders/5/payments/9/proof');
  });
});
