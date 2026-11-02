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

  it('updates nav active state, supports keyboard/Escape dropdown, and closes sidebar on route change', async () => {
    TestBed.configureTestingModule({providers: [provideRouter(routes), provideHttpClient()]});
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
    const root = harness.routeNativeElement!;
    const homeLink = root.querySelector('.public-nav > a[href="/"]') as HTMLAnchorElement;
    const booksLink = root.querySelector('.nav-dropdown-trigger > a[href="/sach"]') as HTMLAnchorElement;
    const booksDropdown = booksLink.closest('.nav-dropdown') as HTMLElement;
    const booksMenu = root.querySelector('#nav-books-menu') as HTMLElement;
    expect(homeLink.classList.contains('active')).toBe(true);
    expect(booksLink.classList.contains('active')).toBe(false);
    expect(booksMenu.hidden).toBe(true);

    // Focus opens dropdown; Escape closes and returns focus to trigger
    booksDropdown.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    harness.detectChanges();
    expect(booksMenu.hidden).toBe(false);
    expect(booksLink.getAttribute('aria-expanded')).toBe('true');
    expect(booksMenu.querySelectorAll('a').length).toBe(9);

    booksDropdown.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    harness.detectChanges();
    expect(booksMenu.hidden).toBe(true);
    expect(booksLink.getAttribute('aria-expanded')).toBe('false');

    // Open mobile sidebar and verify route change closes it and syncs search q
    const menuToggle = root.querySelector('.menu-toggle') as HTMLButtonElement;
    menuToggle.click();
    harness.detectChanges();
    expect(menuToggle.getAttribute('aria-expanded')).toBe('true');

    await harness.navigateByUrl('/sach?category=PICTURE_BOOK&q=gruffalo');
    harness.detectChanges();
    expect(menuToggle.getAttribute('aria-expanded')).toBe('false');
    expect(homeLink.classList.contains('active')).toBe(false);
    expect(booksLink.classList.contains('active')).toBe(true);
    const searchInput = root.querySelector('#site-search') as HTMLInputElement;
    expect(searchInput.placeholder).toBe('Bạn đang tìm…');
    expect(searchInput.value).toBe('gruffalo');
  });
});
