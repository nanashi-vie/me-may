import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { adminGuard } from './auth.guard';

describe('admin route boundary', () => {
  it('redirects anonymous users to the internal login route', async () => {
    TestBed.configureTestingModule({providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]});
    const result = firstValueFrom(TestBed.runInInjectionContext(() => adminGuard('/admin')));
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/auth/me').flush({}, {status: 401, statusText: 'Unauthorized'});
    const url = await result;
    expect(TestBed.inject(Router).serializeUrl(url as never)).toBe('/admin/dang-nhap');
    http.verify();
  });
});
