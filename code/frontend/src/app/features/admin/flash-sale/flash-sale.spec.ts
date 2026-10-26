import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { FlashSaleEditor } from './flash-sale';
import { AuthService } from '../../../core/auth/auth.service';
import { signal } from '@angular/core';
describe('Flash Sale editor', () => {
  it('sends campaign version and keeps edits on conflict', async () => {
    TestBed.configureTestingModule({
      imports: [FlashSaleEditor],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { user: signal({ role: 'OWNER' }) } },
      ],
    });
    const fixture = TestBed.createComponent(FlashSaleEditor);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne('/api/v1/admin/flash-sale')
      .flush({ version: 3, enabled: false, startsAt: null, endsAt: null, items: [] });
    const c = fixture.componentInstance;
    c.enabled = true;
    c.startsAt = '2026-10-24T08:00';
    c.endsAt = '2026-10-24T09:00';
    c.items = [{ bookCode: 'MM-000001', salePriceVnd: 7000 }];
    c.dirty = true;
    c.save();
    http.expectOne('/api/v1/auth/csrf').flush({ headerName: 'X-CSRF-TOKEN', token: 'token' });
    const req = http.expectOne('/api/v1/admin/flash-sale');
    expect(req.request.body.version).toBe(3);
    expect(req.request.body.startsAt).toBe('2026-10-24T01:00:00.000Z');
    req.flush({ error: 'version_conflict' }, { status: 409, statusText: 'Conflict' });
    expect(c.items[0].salePriceVnd).toBe(7000);
    expect(c.dirty).toBe(true);
    expect(c.error()).toContain('thay đổi');
    http.verify();
  });
});

describe('Campaign save locks editing', () => {
  it('disables inputs while waiting for successful save', () => {
    TestBed.configureTestingModule({
      imports: [FlashSaleEditor],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { user: signal({ role: 'OWNER' }) } },
      ],
    });
    const f = TestBed.createComponent(FlashSaleEditor);
    f.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne('/api/v1/admin/flash-sale')
      .flush({ version: 0, enabled: false, startsAt: null, endsAt: null, items: [] });
    f.detectChanges();
    f.componentInstance.save();
    f.detectChanges();
    expect(f.nativeElement.querySelector('input[name=enabled]').matches(':disabled')).toBe(true);
    http.expectOne('/api/v1/auth/csrf').flush({ headerName: 'X-CSRF-TOKEN', token: 'token' });
    http
      .expectOne('/api/v1/admin/flash-sale')
      .flush({ version: 1, enabled: false, startsAt: null, endsAt: null, items: [] });
    f.detectChanges();
    expect(f.nativeElement.querySelector('input[name=enabled]').matches(':disabled')).toBe(false);
    f.componentInstance.load();
    f.detectChanges();
    expect(f.nativeElement.querySelector('input[name=enabled]').matches(':disabled')).toBe(true);
    http
      .expectOne('/api/v1/admin/flash-sale')
      .flush({ version: 1, enabled: false, startsAt: null, endsAt: null, items: [] });
    http.verify();
  });
});
