import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { Meta } from '@angular/platform-browser';
import { WISHLIST_KEY, WishlistStore } from './features/wishlist/wishlist-store';
import { UI_LANG_KEY } from './layouts/public-layout/public-layout';

describe('public shell', () => {
  it('offers catalogue navigation without pretending checkout exists', async () => {
    TestBed.configureTestingModule({providers: [provideRouter(routes), provideHttpClient()]});
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
    expect(harness.routeNativeElement?.textContent).toContain('Mẹ Mây');
    expect(harness.routeNativeElement?.querySelector('a[href="/sach"]')).not.toBeNull();
    expect(harness.routeNativeElement?.querySelector('button[role="switch"]')).not.toBeNull();
    expect(harness.routeNativeElement?.querySelector('.sidebar-admin-link')).not.toBeNull();
    expect(harness.routeNativeElement?.textContent).not.toContain('Thanh toán');

    const root = harness.routeNativeElement!;
    const utilitySocials = Array.from(root.querySelectorAll<HTMLAnchorElement>('.utility-socials a')).map((a) => a.href);
    expect(utilitySocials).toEqual([
      'https://www.facebook.com/sachngoaivanmemay/',
      'https://www.threads.com/@sachngoaivanmemay',
      'https://www.tiktok.com/@andamdaily',
    ]);
    expect(root.querySelector<HTMLAnchorElement>('.utility-email')?.getAttribute('href')).toBe(
      'mailto:support@memaybooks.com',
    );
    expect(root.querySelector('.utility-ticker-track')?.textContent).toContain(
      'Sách ngoại văn đã qua sử dụng cho bé · Ảnh thật từng cuốn',
    );

    const footer = root.querySelector('.site-footer')!;
    expect(footer.textContent).toContain('KẾT NỐI VỚI CHÚNG TÔI');
    expect(footer.textContent).toContain('CÁC KÊNH KHÁC');
    const fbCard = footer.querySelector<HTMLAnchorElement>('a.fb-page-card')!;
    expect(fbCard).not.toBeNull();
    expect(fbCard.href).toBe('https://www.facebook.com/sachngoaivanmemay/');
    expect(fbCard.textContent).toContain('Sách Ngoại Văn Mẹ Mây');
    expect(fbCard.textContent).toContain('Theo dõi trên Facebook ↗');
    expect(fbCard.querySelector('img.fb-page-avatar')?.getAttribute('src')).toBe(
      '/favicon/web-app-manifest-192x192.png',
    );
    const footerSocials = Array.from(footer.querySelectorAll<HTMLAnchorElement>('.footer-socials a.social-box')).map(
      (a) => a.href,
    );
    expect(footerSocials).toEqual([
      'https://www.facebook.com/sachngoaivanmemay/',
      'https://www.threads.com/@sachngoaivanmemay',
      'https://www.tiktok.com/@andamdaily',
    ]);
    expect(root.querySelector('symbol#icon-facebook')).not.toBeNull();
    expect(root.querySelector('symbol#icon-threads')).not.toBeNull();
    expect(root.querySelector('symbol#icon-tiktok')).not.toBeNull();
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
    expect(booksMenu.querySelectorAll('a').length).toBe(10);

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

  it('renders wishlist header icon without contact CTA and shows badge only when non-empty', async () => {
    localStorage.removeItem(WISHLIST_KEY);
    TestBed.configureTestingModule({ providers: [provideRouter(routes), provideHttpClient()] });
    const wishlist = TestBed.inject(WishlistStore);
    wishlist.initialize();

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
    harness.detectChanges();
    const root = harness.routeNativeElement!;

    expect(root.querySelector('.header-links a[href="/lien-he"]')).toBeNull();
    expect(root.querySelector('.header-links')?.textContent).not.toContain('Nhắn tiệm');
    expect(root.querySelector('.public-nav a[href="/lien-he"]')).not.toBeNull();

    const wishlistLink = root.querySelector<HTMLAnchorElement>('.header-links a.wishlist-link')!;
    expect(wishlistLink).not.toBeNull();
    expect(wishlistLink.getAttribute('href')).toBe('/quan-tam');
    expect(wishlistLink.querySelector('.wishlist-icon-wrap svg use')?.getAttribute('href')).toBe(
      '#icon-wishlist-heart',
    );
    expect(wishlistLink.querySelector('.wl-label')?.textContent).toBe('Danh sách quan tâm');
    expect(wishlistLink.querySelector('.wishlist-count')).toBeNull();
    expect(wishlistLink.classList.contains('active')).toBe(false);

    wishlist.toggle('MM-000001');
    wishlist.toggle('MM-000002');
    harness.detectChanges();
    expect(wishlistLink.querySelector('.wishlist-icon-wrap .wishlist-count')?.textContent?.trim()).toBe('2');

    await harness.navigateByUrl('/quan-tam');
    harness.detectChanges();
    expect(wishlistLink.classList.contains('active')).toBe(true);
    expect(wishlistLink.getAttribute('aria-current')).toBe('page');
    localStorage.removeItem(WISHLIST_KEY);
  });

  it('renders language after the theme switch and toggles dropdown options', async () => {
    localStorage.removeItem(UI_LANG_KEY);
    TestBed.configureTestingModule({ providers: [provideRouter(routes), provideHttpClient()] });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
    harness.detectChanges();
    const root = harness.routeNativeElement!;

    const headerLinks = Array.from(root.querySelector('.header-links')!.children);
    expect(headerLinks[0].classList.contains('wishlist-link')).toBe(true);
    expect(headerLinks[1].tagName.toLowerCase()).toBe('app-theme-switch');
    expect(headerLinks[2].classList.contains('lang-switcher')).toBe(true);

    const trigger = root.querySelector<HTMLButtonElement>('.lang-trigger')!;
    expect(trigger).not.toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.textContent?.trim()).toBe('');
    expect(trigger.querySelector('use')?.getAttribute('href')).toBe('#flag-vi');
    expect(root.querySelector('#lang-menu')).toBeNull();

    trigger.click();
    harness.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    const options = Array.from(root.querySelectorAll<HTMLButtonElement>('#lang-menu .lang-option'));
    expect(options.length).toBe(2);
    expect(options[0].textContent).toContain('Tiếng Việt');
    expect(options[0].querySelector('use')?.getAttribute('href')).toBe('#flag-vi');
    expect(options[1].textContent).toContain('English (US)');
    expect(options[1].querySelector('use')?.getAttribute('href')).toBe('#flag-en-us');

    options[1].click();
    harness.detectChanges();
    expect(root.querySelector('#lang-menu')).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.querySelector('use')?.getAttribute('href')).toBe('#flag-en-us');
    expect(localStorage.getItem(UI_LANG_KEY)).toBe('en-US');

    // Escape closes opened menu
    trigger.click();
    harness.detectChanges();
    expect(root.querySelector('#lang-menu')).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    harness.detectChanges();
    expect(root.querySelector('#lang-menu')).toBeNull();

    localStorage.removeItem(UI_LANG_KEY);
  });
});
