import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { BackendStatus, OUTAGE_POLL_MS, outageCode, outageInterceptor } from './backend-status';

const error = (status: number, body: unknown = null) => new HttpErrorResponse({ status, error: body });

describe('outageCode', () => {
  it('counts only origin-unreachable answers', () => {
    expect(outageCode(error(530))).toBe(530);
    expect(outageCode(error(502))).toBe(502);
    expect(outageCode(error(0))).toBe(0);
    expect(outageCode(error(503, { error: 'backend_unavailable', upstreamStatus: 530 }))).toBe(530);
    expect(outageCode(error(503, { error: 'backend_unavailable' }))).toBe(503);
    expect(outageCode(error(503, { error: 'image_worker_down' }))).toBeNull();
    expect(outageCode(error(500))).toBeNull();
    expect(outageCode(error(401))).toBeNull();
    expect(outageCode(new Error('x'))).toBeNull();
  });
});

describe('BackendStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([outageInterceptor])), provideHttpClientTesting()],
    });
  });
  afterEach(() => vi.useRealTimers());

  it('reports an outage from any request and keeps the first time and code', () => {
    const http = TestBed.inject(HttpClient);
    const backend = TestBed.inject(HttpTestingController);
    const status = TestBed.inject(BackendStatus);
    http.get('/api/v1/books').subscribe({ error: () => {} });
    backend.expectOne('/api/v1/books').flush('down', { status: 530, statusText: 'Origin' });
    const first = status.outage();
    expect(first?.code).toBe(530);
    http.get('/api/v1/taxonomy').subscribe({ error: () => {} });
    backend.expectOne('/api/v1/taxonomy').flush('x', { status: 502, statusText: 'Bad' });
    expect(status.outage()).toBe(first);
  });

  it('ignores app errors', () => {
    const http = TestBed.inject(HttpClient);
    http.get('/api/v1/books').subscribe({ error: () => {} });
    TestBed.inject(HttpTestingController).expectOne('/api/v1/books').flush('x', { status: 500, statusText: 'Err' });
    expect(TestBed.inject(BackendStatus).outage()).toBeNull();
  });

  it('polls the origin every 30s and clears the banner state once it answers', () => {
    const backend = TestBed.inject(HttpTestingController);
    const status = TestBed.inject(BackendStatus);
    status.report(530);
    vi.advanceTimersByTime(OUTAGE_POLL_MS);
    backend.expectOne('/api/v1/cache-policy').flush('x', { status: 530, statusText: 'Origin' });
    expect(status.outage()).not.toBeNull();
    vi.advanceTimersByTime(OUTAGE_POLL_MS);
    backend.expectOne('/api/v1/cache-policy').flush({ enabled: false });
    expect(status.outage()).toBeNull();
    vi.advanceTimersByTime(OUTAGE_POLL_MS);
    backend.expectNone('/api/v1/cache-policy');
  });

  it('does not blame the shop when the visitor is offline', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const status = TestBed.inject(BackendStatus);
    status.report(0);
    expect(status.outage()).toBeNull();
  });
});
