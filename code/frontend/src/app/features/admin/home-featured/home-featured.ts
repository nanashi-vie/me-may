import { Component, HostListener, inject, OnInit, signal, viewChild } from '@angular/core';
import { HeroBannerEditor } from './hero-banner-editor';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminHttp } from '../../../core/auth/admin-http';
import { AuthService } from '../../../core/auth/auth.service';
import { formatAdminPriceRange } from '../books/book-copy';

export interface PinnedBookItem {
  id: string;
  bookCode: string;
  title: string;
  priceMinVnd: number | null;
  priceMaxVnd: number | null;
  publicationStatus: string;
  availability: string;
  coverUrl: string | null;
  activeOnHome: boolean;
}

export interface HomeFeaturedShelf {
  shelfKey: string;
  title: string;
  href: string;
  categoryCode: string | null;
  collectionSlug: string | null;
  items: PinnedBookItem[];
}

export interface HomeFeaturedConfig {
  version: number;
  shelves: HomeFeaturedShelf[];
}

@Component({
  selector: 'app-home-featured-editor',
  imports: [FormsModule, HeroBannerEditor],
  templateUrl: './home-featured.html',
  styleUrl: './home-featured.scss',
})
export class HomeFeaturedEditor implements OnInit {
  readonly bannerEditor = viewChild(HeroBannerEditor);
  private readonly http = inject(AdminHttp);
  readonly auth = inject(AuthService);
  readonly config = signal<HomeFeaturedConfig | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');

  priceLabel(book: PinnedBookItem): string {
    return formatAdminPriceRange(book.priceMinVnd, book.priceMaxVnd);
  }

  shelves: HomeFeaturedShelf[] = [];
  searchQuery: Record<string, string> = {};
  candidates = signal<Record<string, PinnedBookItem[]>>({});
  searching = signal<Record<string, boolean>>({});
  openDropdown = signal<string | null>(null);
  dirty = false;

  ngOnInit() {
    this.load();
  }

  private accept(c: HomeFeaturedConfig) {
    this.config.set(c);
    this.shelves = c.shelves.map((s) => ({
      ...s,
      items: s.items.map((i) => ({ ...i })),
    }));
    this.dirty = false;
  }

  load() {
    if (
      this.busy() ||
      (this.dirty && !window.confirm('Kệ sách có thay đổi chưa lưu. Bỏ thay đổi để tải lại?'))
    )
      return;
    this.error.set('');
    this.notice.set('');
    this.busy.set(true);
    this.http.get<HomeFeaturedConfig>('/home-featured').subscribe({
      next: (c) => {
        this.accept(c);
        this.busy.set(false);
      },
      error: () => {
        this.busy.set(false);
        this.error.set(
          'Chưa tải được cấu hình sách nổi bật. Kiểm tra phiên đăng nhập rồi thử lại.',
        );
      },
    });
  }

  searchCandidates(shelfKey: string) {
    const q = (this.searchQuery[shelfKey] || '').trim();
    this.openDropdown.set(shelfKey);
    this.searching.update((s) => ({ ...s, [shelfKey]: true }));
    const queryParam = q ? `&q=${encodeURIComponent(q)}` : '';
    this.http
      .get<PinnedBookItem[]>(
        `/home-featured/candidates?shelfKey=${encodeURIComponent(shelfKey)}${queryParam}`,
      )
      .subscribe({
        next: (rows) => {
          this.candidates.update((c) => ({ ...c, [shelfKey]: rows }));
          this.searching.update((s) => ({ ...s, [shelfKey]: false }));
        },
        error: () => {
          this.searching.update((s) => ({ ...s, [shelfKey]: false }));
        },
      });
  }

  closeCandidates(shelfKey: string) {
    if (this.openDropdown() === shelfKey) {
      this.openDropdown.set(null);
    }
  }

  availableCandidates(shelf: HomeFeaturedShelf): PinnedBookItem[] {
    const list = this.candidates()[shelf.shelfKey] || [];
    const pinnedCodes = new Set(shelf.items.map((i) => i.bookCode));
    return list.filter((b) => !pinnedCodes.has(b.bookCode));
  }

  addBook(shelf: HomeFeaturedShelf, book: PinnedBookItem) {
    if (shelf.items.length >= 10) return;
    if (shelf.items.some((i) => i.bookCode === book.bookCode)) return;
    shelf.items = [...shelf.items, { ...book }];
    this.dirty = true;
    this.notice.set('');
  }

  moveUp(shelf: HomeFeaturedShelf, index: number) {
    if (index <= 0 || index >= shelf.items.length) return;
    const next = [...shelf.items];
    const tmp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = tmp;
    shelf.items = next;
    this.dirty = true;
    this.notice.set('');
  }

  moveDown(shelf: HomeFeaturedShelf, index: number) {
    if (index < 0 || index >= shelf.items.length - 1) return;
    const next = [...shelf.items];
    const tmp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = tmp;
    shelf.items = next;
    this.dirty = true;
    this.notice.set('');
  }

  removeBook(shelf: HomeFeaturedShelf, index: number) {
    shelf.items = shelf.items.filter((_, i) => i !== index);
    this.dirty = true;
    this.notice.set('');
  }

  save() {
    if (this.busy() || !this.config() || this.auth.user()?.role !== 'OWNER') return;
    this.error.set('');
    this.notice.set('');
    this.busy.set(true);
    this.http
      .mutate<HomeFeaturedConfig>('PUT', '/home-featured', {
        version: this.config()!.version,
        shelves: this.shelves.map((s) => ({
          shelfKey: s.shelfKey,
          bookCodes: s.items.map((i) => i.bookCode),
        })),
      })
      .subscribe({
        next: (c) => {
          this.accept(c);
          this.busy.set(false);
          this.openDropdown.set(null);
          this.notice.set('Đã lưu cấu hình hiển thị sách nổi bật trên trang chủ.');
        },
        error: (e: HttpErrorResponse) => {
          this.busy.set(false);
          const fields = e.error?.fieldErrors as Record<string, string[]> | undefined;
          this.error.set(
            e.status === 409
              ? 'Dữ liệu đã thay đổi ở phiên khác. Nội dung đang sửa được giữ nguyên; tải lại để đối chiếu.'
              : e.status === 401
                ? 'Phiên hết hạn. Đăng nhập lại ở tab khác rồi lưu; nội dung đang sửa được giữ nguyên.'
                : fields
                  ? Object.values(fields).flat().join(' ')
                  : 'Chưa lưu được cấu hình. Kiểm tra dữ liệu và thử lại.',
          );
        },
      });
  }

  canLeave() {
    return (
      !(this.dirty || this.bannerEditor()?.dirty() || this.bannerEditor()?.pending()) ||
      typeof window === 'undefined' ||
      window.confirm('Cấu hình trang chủ có thay đổi chưa lưu. Bỏ thay đổi?')
    );
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(e: BeforeUnloadEvent) {
    if (this.dirty || this.bannerEditor()?.dirty() || this.bannerEditor()?.pending()) {
      e.preventDefault();
      e.returnValue = '';
    }
  }
}
