import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { PublicApi } from '../../features/catalogue/public-api';
import { DEFAULT_CATEGORIES } from '../../features/catalogue/catalogue-state';
import { CategoryCode, Collection, Taxonomy } from '../../features/catalogue/public.models';
import { WishlistStore } from '../../features/wishlist/wishlist-store';
import { TaxonomyOption } from '../../features/admin/books/book.models';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-public-layout',
  imports: [RouterLink, RouterOutlet, FormsModule],
  templateUrl: './public-layout.html',
  styleUrl: './public-layout.scss',
})
export class PublicLayout {
  readonly wishlist = inject(WishlistStore);
  readonly auth = inject(AuthService);
  readonly isLoggedInAdmin = computed(() => !!this.auth.user());
  readonly adminLink = computed(() => (this.isLoggedInAdmin() ? '/admin' : '/admin/dang-nhap'));
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
