import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { PublicApi } from '../features/catalogue/public-api';
import { DEFAULT_CATEGORIES } from '../features/catalogue/catalogue-state';
import { CategoryCode, Collection, Taxonomy } from '../features/catalogue/public.models';
import { WishlistStore } from '../features/wishlist/wishlist-store';
import { TaxonomyOption } from '../features/admin/books/book.models';

@Component({
  selector: 'app-public-layout',
  imports: [RouterLink, RouterOutlet, FormsModule],
  template: `
    <a class="skip-link" href="#main">Bỏ qua điều hướng</a>
    <div class="utility">Sách ngoại văn đã qua sử dụng cho bé · Ảnh thật từng cuốn</div>
    <header class="site-header wrap">
      <button
        #menuTrigger
        type="button"
        class="menu-toggle"
        aria-label="Mở menu"
        aria-controls="mobile-sidebar"
        [attr.aria-expanded]="sidebarOpen()"
        (click)="openSidebar()"
      >
        ☰
      </button>
      <a routerLink="/" class="brand" aria-label="Mẹ Mây — Trang chủ">
        <img src="/favicon/web-app-manifest-192x192.png" alt="" width="72" height="72" />
        <span class="brand-name">Mẹ Mây<small>Sách ngoại văn cho bé</small></span>
      </a>
      <form class="header-search" (ngSubmit)="search()" role="search">
        <label class="sr-only" for="site-search">Tìm tên hoặc mã sách</label>
        <input
          id="site-search"
          name="q"
          [(ngModel)]="q"
          placeholder="Bạn đang tìm…"
          maxlength="200"
        />
        <button type="submit">Tìm sách</button>
      </form>
      <div class="header-links">
        <a class="header-contact wishlist-link" routerLink="/quan-tam">
          ♡ Quan tâm
          <span
            class="wishlist-count"
            aria-label="Số cuốn đã lưu"
            [style.visibility]="wishlist.ready() ? 'visible' : 'hidden'"
            >{{ wishlist.ready() ? wishlist.codes().length : 0 }}</span
          >
        </a>
        <a class="header-contact desktop-contact" routerLink="/lien-he">Nhắn tiệm ↗</a>
      </div>
    </header>
    @if (wishlist.warning()) {
      <p class="storage-warning wrap" role="status">{{ wishlist.warning() }}</p>
    }
    <nav class="public-nav wrap" aria-label="Điều hướng chính">
      <a
        routerLink="/"
        [class.active]="isActive('home')"
        [attr.aria-current]="isActive('home') ? 'page' : null"
        >Trang chủ</a
      >
      <div
        class="nav-dropdown"
        [class.open]="openMenu() === 'books'"
        (pointerdown)="onDropdownPointerDown()"
        (mouseenter)="openMenu.set('books')"
        (mouseleave)="openMenu.set(null)"
        (focusin)="onDropdownFocusIn('books')"
        (focusout)="onDropdownFocusOut($event, 'books')"
        (keydown.escape)="closeDropdown('books', booksTrigger)"
      >
        <div class="nav-dropdown-trigger">
          <a
            #booksTrigger
            routerLink="/sach"
            [class.active]="isActive('books')"
            [attr.aria-current]="isActive('books') && !currentCategory() ? 'page' : null"
            [attr.aria-expanded]="openMenu() === 'books'"
            aria-controls="nav-books-menu"
            >Tất cả sách</a
          >
          <button
            type="button"
            class="dropdown-caret"
            aria-label="Danh mục thể loại"
            [attr.aria-expanded]="openMenu() === 'books'"
            aria-controls="nav-books-menu"
            (click)="toggleDropdown('books')"
          >
            ▾
          </button>
        </div>
        <div id="nav-books-menu" class="dropdown-panel" [hidden]="openMenu() !== 'books'">
          <a
            routerLink="/sach"
            [class.active]="isActive('books') && !currentCategory()"
            [attr.aria-current]="isActive('books') && !currentCategory() ? 'page' : null"
            (click)="openMenu.set(null)"
            >Tất cả thể loại</a
          >
          @for (c of categories(); track c.code) {
            <a
              routerLink="/sach"
              [queryParams]="{ category: c.code }"
              [class.active]="isActive('books') && currentCategory() === c.code"
              [attr.aria-current]="isActive('books') && currentCategory() === c.code ? 'page' : null"
              (click)="openMenu.set(null)"
              >{{ c.label }}</a
            >
          }
        </div>
      </div>
      <a
        routerLink="/flash-sale"
        [class.active]="isActive('sale')"
        [attr.aria-current]="isActive('sale') ? 'page' : null"
        >Flash Sale</a
      >
      <div
        class="nav-dropdown"
        [class.open]="openMenu() === 'collections'"
        (pointerdown)="onDropdownPointerDown()"
        (mouseenter)="openMenu.set('collections')"
        (mouseleave)="openMenu.set(null)"
        (focusin)="onDropdownFocusIn('collections')"
        (focusout)="onDropdownFocusOut($event, 'collections')"
        (keydown.escape)="closeDropdown('collections', collectionsTrigger)"
      >
        <button
          #collectionsTrigger
          type="button"
          class="nav-button"
          [class.active]="isActive('collection')"
          [attr.aria-expanded]="openMenu() === 'collections'"
          aria-controls="nav-collections-menu"
          (click)="toggleDropdown('collections')"
        >
          Bộ sưu tập <span aria-hidden="true">▾</span>
        </button>
        <div
          id="nav-collections-menu"
          class="dropdown-panel"
          [hidden]="openMenu() !== 'collections'"
        >
          @for (c of collections(); track c.slug) {
            <a
              [routerLink]="['/bo-suu-tap', c.slug]"
              [class.active]="currentPath() === '/bo-suu-tap/' + c.slug"
              [attr.aria-current]="currentPath() === '/bo-suu-tap/' + c.slug ? 'page' : null"
              (click)="openMenu.set(null)"
              >{{ c.name }}</a
            >
          } @empty {
            <span class="dropdown-empty">Tiệm đang cập nhật</span>
          }
        </div>
      </div>
      <a
        routerLink="/cach-mua"
        [class.active]="isActive('how')"
        [attr.aria-current]="isActive('how') ? 'page' : null"
        >Cách mua</a
      >
      <a
        routerLink="/lien-he"
        [class.active]="isActive('contact')"
        [attr.aria-current]="isActive('contact') ? 'page' : null"
        >Liên hệ</a
      >
    </nav>
    <dialog
      #sidebarDialog
      id="mobile-sidebar"
      class="mobile-sidebar"
      aria-label="Menu điều hướng"
      (close)="onSidebarNativeClose()"
      (keydown.escape)="closeSidebar()"
      (click)="onSidebarBackdropClick($event)"
    >
      <div class="sidebar-panel">
        <div class="sidebar-header">
          <span class="sidebar-title">Mẹ Mây</span>
          <button
            type="button"
            class="sidebar-close"
            aria-label="Đóng menu"
            (click)="closeSidebar()"
          >
            ✕
          </button>
        </div>
        <nav class="sidebar-nav" aria-label="Điều hướng di động">
          <a
            routerLink="/"
            [class.active]="isActive('home')"
            [attr.aria-current]="isActive('home') ? 'page' : null"
            (click)="closeSidebar()"
            >Trang chủ</a
          >
          <div class="sidebar-group">
            <div class="sidebar-row">
              <a
                routerLink="/sach"
                [class.active]="isActive('books')"
                [attr.aria-current]="isActive('books') && !currentCategory() ? 'page' : null"
                (click)="closeSidebar()"
                >Tất cả sách</a
              >
              <button
                type="button"
                class="sidebar-expand"
                aria-label="Mở danh mục thể loại"
                aria-controls="sidebar-books-sub"
                [attr.aria-expanded]="sidebarBooksOpen()"
                (click)="sidebarBooksOpen.set(!sidebarBooksOpen())"
              >
                ›
              </button>
            </div>
            @if (sidebarBooksOpen()) {
              <div id="sidebar-books-sub" class="sidebar-sub">
                <a
                  routerLink="/sach"
                  [class.active]="isActive('books') && !currentCategory()"
                  [attr.aria-current]="isActive('books') && !currentCategory() ? 'page' : null"
                  (click)="closeSidebar()"
                  >Tất cả thể loại</a
                >
                @for (c of categories(); track c.code) {
                  <a
                    routerLink="/sach"
                    [queryParams]="{ category: c.code }"
                    [class.active]="isActive('books') && currentCategory() === c.code"
                    [attr.aria-current]="
                      isActive('books') && currentCategory() === c.code ? 'page' : null
                    "
                    (click)="closeSidebar()"
                    >{{ c.label }}</a
                  >
                }
              </div>
            }
          </div>
          <a
            routerLink="/flash-sale"
            [class.active]="isActive('sale')"
            [attr.aria-current]="isActive('sale') ? 'page' : null"
            (click)="closeSidebar()"
            >Flash Sale</a
          >
          <div class="sidebar-group">
            <div class="sidebar-row">
              <button
                type="button"
                class="sidebar-label-btn"
                [class.active]="isActive('collection')"
                [attr.aria-expanded]="sidebarCollectionsOpen()"
                aria-controls="sidebar-collections-sub"
                (click)="sidebarCollectionsOpen.set(!sidebarCollectionsOpen())"
              >
                Bộ sưu tập
              </button>
              <button
                type="button"
                class="sidebar-expand"
                aria-label="Mở danh sách bộ sưu tập"
                aria-controls="sidebar-collections-sub"
                [attr.aria-expanded]="sidebarCollectionsOpen()"
                (click)="sidebarCollectionsOpen.set(!sidebarCollectionsOpen())"
              >
                ›
              </button>
            </div>
            @if (sidebarCollectionsOpen()) {
              <div id="sidebar-collections-sub" class="sidebar-sub">
                @for (c of collections(); track c.slug) {
                  <a
                    [routerLink]="['/bo-suu-tap', c.slug]"
                    [class.active]="currentPath() === '/bo-suu-tap/' + c.slug"
                    [attr.aria-current]="
                      currentPath() === '/bo-suu-tap/' + c.slug ? 'page' : null
                    "
                    (click)="closeSidebar()"
                    >{{ c.name }}</a
                  >
                } @empty {
                  <span class="sidebar-empty">Tiệm đang cập nhật</span>
                }
              </div>
            }
          </div>
          <a
            routerLink="/cach-mua"
            [class.active]="isActive('how')"
            [attr.aria-current]="isActive('how') ? 'page' : null"
            (click)="closeSidebar()"
            >Cách mua</a
          >
          <a
            routerLink="/lien-he"
            [class.active]="isActive('contact')"
            [attr.aria-current]="isActive('contact') ? 'page' : null"
            (click)="closeSidebar()"
            >Liên hệ</a
          >
        </nav>
      </div>
    </dialog>
    <main id="main" class="wrap"><router-outlet /></main>
    <footer class="wrap">
      <div>
        <a class="brand" routerLink="/">Mẹ Mây</a>
        <p>Mỗi cuốn sách, một lần khám phá mới.</p>
      </div>
      <nav aria-label="Thông tin tiệm">
        <a routerLink="/sach">Khám phá sách</a><a routerLink="/cach-mua">Cách hỏi mua</a
        ><a routerLink="/lien-he">Liên hệ</a><a routerLink="/admin">Quản trị</a>
      </nav>
      <small>Tiệm xác nhận giá và tình trạng khi trao đổi. Website không giữ sách.</small>
    </footer>
  `,
  styles: `
    .site-header { gap: 1.5rem; }
    .menu-toggle, .dropdown-panel[hidden] { display: none; }
    .brand { display: flex; align-items: center; gap: .6rem; font-size: 1.8rem; line-height: 1.2; flex-shrink: 0; }
    .brand img { object-fit: contain; }
    .brand-name { display: block; font-size: 1.8rem; font-weight: 750; color: var(--red); }
    .brand small { display: block; font-size: .7rem; color: var(--muted); font-weight: 400; margin-top: .4rem; }
    .header-search { display: flex; align-items: center; flex: 1; max-width: 560px; }
    .header-search input { margin: 0; border-radius: 4px 0 0 4px; min-width: 0; }
    .header-search button { width: auto; margin: 0; white-space: nowrap; border-radius: 0 4px 4px 0; padding: .65rem 1rem; }
    .header-contact { font-size: .85rem; white-space: nowrap; }
    .header-links { display: flex; flex-wrap: wrap; gap: .6rem 1rem; align-items: center; }
    .wishlist-count { display: inline-block; width: 2.3em; text-align: center; background: var(--red); color: #fff; border-radius: 1em; padding: .1em .3em; }
    .storage-warning { font-size: .85rem; color: #8e4b35; }
    .public-nav { display: flex; justify-content: center; gap: 2.4rem; padding-block: .85rem; border-bottom: 1px solid var(--line); font: 700 .92rem system-ui, sans-serif; text-transform: uppercase; align-items: center; }
    .public-nav a, .nav-button, .dropdown-caret { color: var(--ink); text-decoration: none; white-space: nowrap; }
    .public-nav :is(a, button):is(:hover, .active) { color: var(--red); }
    .nav-dropdown, .nav-dropdown-trigger { position: relative; display: inline-flex; align-items: center; gap: .15rem; }
    .dropdown-caret, .nav-button { background: none; border: 0; padding: .2rem; font: inherit; text-transform: inherit; cursor: pointer; }
    .dropdown-panel { position: absolute; top: 100%; left: 0; min-width: 245px; background: #f6f5f3; border-bottom: 3px solid var(--red); box-shadow: 0 8px 20px #29272424; z-index: 20; display: flex; flex-direction: column; text-transform: none; font-weight: 500; }
    .dropdown-panel > * { padding: .7rem 1rem; border-bottom: 1px dotted #c9c1b8; }
    .dropdown-panel > :last-child { border-bottom: 0; }
    .dropdown-panel a:is(:hover, .active) { background: #ece8e1; font-weight: 600; }
    .mobile-sidebar { margin: 0; padding: 0; border: 0; width: min(80vw, 320px); height: 100dvh; max-height: 100dvh; background: var(--red); color: #fff; box-shadow: 4px 0 24px #0004; animation: slide .2s ease-out; }
    .mobile-sidebar::backdrop { background: #1917158c; }
    @keyframes slide { from { transform: translateX(-100%); } }
    @media (prefers-reduced-motion: reduce) { .mobile-sidebar { animation: none; } }
    .sidebar-panel, .sidebar-nav, .sidebar-sub { display: flex; flex-direction: column; gap: 0; }
    .sidebar-header { display: flex; align-items: center; justify-content: space-between; padding: .7rem 1rem; border-bottom: 1px solid #fff3; font-weight: 750; text-transform: uppercase; }
    .mobile-sidebar button { background: none; border: 0; border-radius: 0; color: #fff; }
    .sidebar-close { min-width: 44px; min-height: 44px; padding: 0; font-size: 1.2rem; }
    .sidebar-nav a, .sidebar-label-btn { display: flex; align-items: center; min-height: 48px; padding: .7rem 1.1rem; color: #fff; text-decoration: none; text-transform: uppercase; font-weight: 600; font-size: .92rem; border-bottom: 1px solid #fff3; flex: 1; text-align: left; }
    .sidebar-row { display: flex; }
    .sidebar-expand { min-width: 48px; padding: 0; border-left: 1px solid #fff3; border-bottom: 1px solid #fff3; font-size: 1.35rem; }
    .sidebar-expand[aria-expanded='true'], .sidebar-sub { background: #0002; }
    .sidebar-sub > * { min-height: 44px; padding: .6rem 1.1rem .6rem 1.75rem; text-transform: none; font-size: .88rem; font-weight: 400; border-bottom: 1px solid #fff2; }
    .sidebar-nav .active { font-weight: 800; background: #0002; border-left: 4px solid #fff; }
    footer { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    footer p { margin: .6rem 0; }
    footer nav { flex-wrap: wrap; justify-content: end; font-size: .85rem; }
    footer small { grid-column: 1/-1; font-size: .75rem; }
    @media (max-width: 960px) and (min-width: 721px) { .public-nav { gap: 1.15rem; font-size: .82rem; } }
    @media (max-width: 720px) {
      .utility, .public-nav, .desktop-contact { display: none; }
      .site-header { display: grid; grid-template-columns: 44px 1fr auto; align-items: center; gap: .65rem .5rem; padding-block: .7rem; min-height: auto; }
      .menu-toggle { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; padding: 0; border: 0; background: none; color: var(--red); font-size: 1.65rem; }
      .brand, .brand-name { justify-self: center; font-size: 1.35rem; gap: .45rem; white-space: nowrap; }
      .brand img { width: 44px; height: 44px; }
      .brand small { font-size: .65rem; margin-top: .15rem; white-space: nowrap; }
      .header-links { justify-self: end; }
      .header-search { grid-column: 1/-1; grid-row: 2; max-width: none; width: 100%; }
      footer { grid-template-columns: 1fr; }
      footer nav { justify-content: start; }
    }
  `,
})
export class PublicLayout {
  readonly wishlist = inject(WishlistStore);
  q = '';
  readonly collections = signal<Collection[]>([]);
  readonly taxonomy = signal<Taxonomy | null>(null);
  readonly categories = computed<TaxonomyOption<CategoryCode>[]>(() => {
    const list = this.taxonomy()?.categories;
    return list?.length ? list : DEFAULT_CATEGORIES;
  });
  readonly openMenu = signal<'books' | 'collections' | null>(null);
  readonly sidebarOpen = signal(false);
  readonly sidebarBooksOpen = signal(false);
  readonly sidebarCollectionsOpen = signal(false);
  readonly currentPath = signal('/');
  readonly currentCategory = signal('');
  private pointerDown = false;
  private readonly router = inject(Router);
  private readonly doc = inject(DOCUMENT);
  private readonly sidebarDialog = viewChild<ElementRef<HTMLDialogElement>>('sidebarDialog');
  private readonly menuTrigger = viewChild<ElementRef<HTMLButtonElement>>('menuTrigger');

  constructor() {
    const api = inject(PublicApi);
    api.collections().subscribe({ next: (c) => this.collections.set(c), error: () => {} });
    api.taxonomy().subscribe({ next: (t) => this.taxonomy.set(t), error: () => {} });
    this.syncRoute();
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.syncRoute();
        this.openMenu.set(null);
        if (this.sidebarOpen()) this.closeSidebar();
      });
  }

  private syncRoute() {
    const tree = this.router.parseUrl(this.router.url);
    const segments = tree.root.children['primary']?.segments.map((s) => s.path) ?? [];
    this.currentPath.set('/' + segments.join('/'));
    this.currentCategory.set((tree.queryParams['category'] as string) || '');
    this.q = (tree.queryParams['q'] as string) || '';
  }

  isActive(section: 'home' | 'books' | 'sale' | 'collection' | 'how' | 'contact'): boolean {
    const p = this.currentPath();
    switch (section) {
      case 'home':
        return p === '/';
      case 'books':
        return p === '/sach';
      case 'sale':
        return p === '/flash-sale';
      case 'collection':
        return p.startsWith('/bo-suu-tap/');
      case 'how':
        return p === '/cach-mua';
      case 'contact':
        return p === '/lien-he';
    }
  }

  onDropdownPointerDown() {
    this.pointerDown = true;
  }

  onDropdownFocusIn(menu: 'books' | 'collections') {
    if (!this.pointerDown) this.openMenu.set(menu);
  }

  onDropdownFocusOut(event: FocusEvent, menu: 'books' | 'collections') {
    const container = event.currentTarget as HTMLElement | null;
    const next = event.relatedTarget as Node | null;
    if (container && next && container.contains(next)) return;
    if (this.openMenu() === menu) this.openMenu.set(null);
  }

  toggleDropdown(menu: 'books' | 'collections') {
    this.pointerDown = false;
    this.openMenu.set(this.openMenu() === menu ? null : menu);
  }

  closeDropdown(menu: 'books' | 'collections', trigger: HTMLElement) {
    if (this.openMenu() === menu) {
      this.pointerDown = true;
      trigger.focus();
      this.pointerDown = false;
      this.openMenu.set(null);
    }
  }

  openSidebar() {
    this.sidebarOpen.set(true);
    const dlg = this.sidebarDialog()?.nativeElement;
    if (dlg && !dlg.open) {
      if (typeof dlg.showModal === 'function') dlg.showModal();
      else dlg.setAttribute('open', '');
    }
    this.doc.body.style.overflow = 'hidden';
  }

  closeSidebar() {
    const wasOpen = this.sidebarOpen();
    this.sidebarOpen.set(false);
    const dlg = this.sidebarDialog()?.nativeElement;
    if (dlg?.open || dlg?.hasAttribute('open')) {
      if (typeof dlg.close === 'function' && dlg.open) dlg.close();
      else dlg.removeAttribute('open');
    }
    this.doc.body.style.overflow = '';
    if (wasOpen) this.menuTrigger()?.nativeElement.focus();
  }

  onSidebarNativeClose() {
    if (this.sidebarOpen()) {
      this.sidebarOpen.set(false);
      this.doc.body.style.overflow = '';
      this.menuTrigger()?.nativeElement.focus();
    }
  }

  onSidebarBackdropClick(event: MouseEvent) {
    if (event.target === this.sidebarDialog()?.nativeElement) this.closeSidebar();
  }

  search() {
    void this.router.navigate(['/sach'], {
      queryParams: this.q.trim() ? { q: this.q.trim() } : {},
    });
  }
}
