import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { Meta } from '@angular/platform-browser';

describe('public shell', () => {
  it('offers catalogue navigation without pretending checkout exists', async () => {
    TestBed.configureTestingModule({providers: [provideRouter(routes), provideHttpClient()]});
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
    expect(harness.routeNativeElement?.textContent).toContain('Mẹ Mây');
    expect(harness.routeNativeElement?.querySelector('a[href="/sach"]')).not.toBeNull();
    expect(harness.routeNativeElement?.textContent).not.toContain('Thanh toán');
  });

  it('clears the 404 noindex directive when returning to a valid public page', async () => {
    TestBed.configureTestingModule({providers: [provideRouter(routes), provideHttpClient()]});
    const harness = await RouterTestingHarness.create();
    const meta = TestBed.inject(Meta);
    await harness.navigateByUrl('/missing');
    expect(meta.getTag('name="robots"')?.content).toBe('noindex');
    await harness.navigateByUrl('/');
    expect(meta.getTag('name="robots"')).toBeNull();
  });
});
