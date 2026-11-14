import { DOCUMENT } from '@angular/common';
import {
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { PublicApi } from '../../features/catalogue/public-api';
import { DEFAULT_CATEGORIES } from '../../features/catalogue/catalogue-state';
import { CategoryCode, Collection, Taxonomy } from '../../features/catalogue/public.models';
import { WishlistStore } from '../../features/wishlist/wishlist-store';
import { TaxonomyOption } from '../../features/admin/books/book.models';
import { ThemeSwitch } from './theme-switch';
import { AuthService } from '../../core/auth/auth.service';

export type UiLang = 'vi' | 'en-US';
export const UI_LANG_KEY = 'memay.uiLang.v1';

interface UiLangOption {
  code: UiLang;
  label: string;
  flagId: string;
}

const UI_LANGS: ReadonlyArray<UiLangOption> = [
  { code: 'vi', label: 'Tiếng Việt', flagId: 'flag-vi' },
  { code: 'en-US', label: 'English (US)', flagId: 'flag-en-us' },
];

@Component({
  selector: 'app-public-layout',
  imports: [RouterLink, RouterOutlet, FormsModule, ThemeSwitch],
  templateUrl: './public-layout.html',
  styleUrl: './public-layout.scss',
  host: {
    '[attr.data-theme]': "dark() ? 'dark' : 'light'",
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'onDocumentEscape()',
  },
})
export class PublicLayout {
  readonly wishlist = inject(WishlistStore);
  readonly auth = inject(AuthService);
  readonly isLoggedInAdmin = computed(() => !!this.auth.user());
  readonly adminLink = computed(() => (this.isLoggedInAdmin() ? '/admin' : '/admin/dang-nhap'));
  readonly dark = signal(false);
  q = '';
  readonly collections = signal<Collection[]>([]);
  readonly taxonomy = signal<Taxonomy | null>(null);
  readonly categories = computed<TaxonomyOption<CategoryCode>[]>(() => {
    const list = this.taxonomy()?.categories;
    return list?.length ? list : DEFAULT_CATEGORIES;
  });
  readonly openMenu = signal<'books' | 'collections' | null>(null);
  readonly langs = UI_LANGS;
  readonly currentLang = signal<UiLang>('vi');
  readonly currentLangOption = computed(
    () => this.langs.find((l) => l.code === this.currentLang()) ?? this.langs[0],
  );
  readonly langMenuOpen = signal(false);
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
  private readonly langSwitcher = viewChild<ElementRef<HTMLElement>>('langSwitcher');
  private readonly langTrigger = viewChild<ElementRef<HTMLButtonElement>>('langTrigger');

  constructor() {
    const api = inject(PublicApi);
    api.collections().subscribe({ next: (c) => this.collections.set(c), error: () => {} });
    api.taxonomy().subscribe({ next: (t) => this.taxonomy.set(t), error: () => {} });
    afterNextRender(() => {
      this.loadSavedLang();
      try { this.dark.set(this.doc.defaultView?.localStorage?.getItem('memay.theme.v1') === 'dark'); }
      catch { /* Storage may be denied; the switch still works. */ }
    });
    this.syncRoute();
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.syncRoute();
        this.openMenu.set(null);
        this.langMenuOpen.set(false);
        if (this.sidebarOpen()) this.closeSidebar();
      });
  }

  setDark(dark: boolean) {
    this.dark.set(dark);
    try { this.doc.defaultView?.localStorage?.setItem('memay.theme.v1', dark ? 'dark' : 'light'); }
    catch { /* Keep the in-memory preference when storage is unavailable. */ }
  }

  private loadSavedLang() {
    try {
      const saved = this.doc.defaultView?.localStorage?.getItem(UI_LANG_KEY);
      if (saved === 'vi' || saved === 'en-US') {
        this.currentLang.set(saved);
      }
    } catch {
      // Ignore storage access failures in private browsing.
    }
  }

  toggleLangMenu() {
    this.langMenuOpen.update((open) => !open);
  }

  selectLang(code: UiLang) {
    this.currentLang.set(code);
    try {
      this.doc.defaultView?.localStorage?.setItem(UI_LANG_KEY, code);
    } catch {
      // Ignore storage access failures in private browsing.
    }
    this.langMenuOpen.set(false);
  }

  onDocumentClick(event: MouseEvent) {
    if (!this.langMenuOpen()) return;
    const host = this.langSwitcher()?.nativeElement;
    if (host && event.target instanceof Node && !host.contains(event.target)) {
      this.langMenuOpen.set(false);
    }
  }

  onDocumentEscape() {
    if (!this.langMenuOpen()) return;
    this.langMenuOpen.set(false);
    this.langTrigger()?.nativeElement.focus();
  }

  private syncRoute() {
    const tree = this.router.parseUrl(this.router.url);
    const segments = tree.root.children['primary']?.segments.map((s) => s.path) ?? [];
    this.currentPath.set('/' + segments.join('/'));
    this.currentCategory.set((tree.queryParams['category'] as string) || '');
    this.q = (tree.queryParams['q'] as string) || '';
  }

  isActive(section: 'home' | 'books' | 'sale' | 'collection' | 'contact' | 'wishlist'): boolean {
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
      case 'contact':
        return p === '/lien-he';
      case 'wishlist':
        return p === '/quan-tam';
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
