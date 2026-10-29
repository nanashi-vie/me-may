import { firstValueFrom } from 'rxjs';
import { bookPrice } from '../catalogue/catalogue-state';
import { DOCUMENT } from '@angular/common';
import {
  Component,
  DestroyRef,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, map, of, switchMap } from 'rxjs';
import { WishlistStore } from './wishlist-store';
import { PublicApi, PUBLIC_SITE_ORIGIN } from '../catalogue/public-api';
import { PublicBook, ContactConfig } from '../catalogue/public.models';
import { PublicClock } from '../catalogue/public-clock';
import { effectiveBook } from '../catalogue/catalogue-state';
import { ContactDialog } from '../catalogue/contact-dialog';
import { PageMetadata } from '../../core/page-metadata';
import { formatPrice } from '../admin/books/book-copy';

interface LookupRequest {
  codes: string[];
  prepare: boolean;
}

@Component({
  selector: 'app-wishlist-page',
  imports: [RouterLink, ContactDialog],
  templateUrl: './wishlist-page.html',
  styleUrl: './wishlist-page.scss',
})
export class WishlistPage {
  @ViewChild(ContactDialog) dialog!: ContactDialog;
  readonly store = inject(WishlistStore);
  private readonly api = inject(PublicApi);
  private readonly clock = inject(PublicClock);
  private readonly document = inject(DOCUMENT);
  private readonly destroy = inject(DestroyRef);
  private readonly origin = inject(PUBLIC_SITE_ORIGIN);
  readonly books = signal<Record<string, PublicBook>>({});
  readonly selected = signal<string[]>([]);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly notice = signal('');
  readonly feedback = computed(() =>
    this.error()
      ? 'Chưa xác nhận được giá và tình trạng. Hãy thử lại trước khi sao chép.'
      : this.notice(),
  );
  readonly config = signal<ContactConfig | null>(null);
  readonly price = bookPrice;
  private readonly prepared = signal<PublicBook[]>([]);
  readonly verifyEnquiry = async () => {
    const codes = this.selected().filter((code) => this.store.codes().includes(code));
    if (!codes.length) return '';
    const fresh = await firstValueFrom(this.api.lookup(codes));
    const books = codes
      .map((code) => fresh.find((b) => b.bookCode === code))
      .filter((b): b is PublicBook => !!b && this.eligible(b, this.clock.now()));
    if (!books.length) return '';
    return (
      'Tôi muốn hỏi mua các cuốn sách sau:\n' +
      books
        .map(
          (b) =>
            `${b.bookCode} | ${b.title} | ${bookPrice(effectiveBook(b, this.clock.now()))} | ${this.origin}/sach/${b.slug}`,
        )
        .join('\n') +
      '\nNhờ tiệm xác nhận còn sách và giá cụ thể. Liên hệ không giữ sách.'
    );
  };

  private readonly enquiryMode = signal(false);
  private readonly requests = new Subject<LookupRequest>();
  private readonly expired = new Set<string>();
  private returnFocus: HTMLElement | null = null;
  readonly rows = computed(() =>
    this.store.codes().map((code) => {
      const book = this.books()[code];
      return {
        code,
        book: book ? effectiveBook(book, this.clock.now()) : null,
        front: book?.media.find((m) => m.role === 'FRONT'),
      };
    }),
  );
  readonly enquiry = computed(() => {
    const books = this.prepared(),
      codes = this.store.codes(),
      now = this.clock.now();
    if (
      this.loading() ||
      this.error() ||
      !this.enquiryMode() ||
      !books.length ||
      books.some(
        (b) =>
          !codes.includes(b.bookCode) ||
          !this.selected().includes(b.bookCode) ||
          !this.eligible(b, now),
      )
    )
      return '';
    return (
      'Tôi muốn hỏi mua các cuốn sách sau:\n' +
      books
        .map((b) => `${b.bookCode} | ${b.title} | ${bookPrice(b)} | ${this.origin}/sach/${b.slug}`)
        .join('\n') +
      '\nNhờ tiệm xác nhận còn sách và giá cụ thể. Liên hệ không giữ sách.'
    );
  });

  constructor() {
    inject(PageMetadata).admin('Danh sách quan tâm | Mẹ Mây');
    this.api
      .contact()
      .pipe(takeUntilDestroyed())
      .subscribe({ next: (c) => this.config.set(c), error: () => {} });
    this.requests
      .pipe(
        switchMap((request) => {
          this.loading.set(true);
          this.error.set(false);
          this.prepared.set([]);
          return (
            request.codes.length ? this.api.lookup(request.codes) : of<PublicBook[]>([])
          ).pipe(
            map((books) => ({ request, books, error: false })),
            catchError(() => of({ request, books: [] as PublicBook[], error: true })),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => this.accept(result.request, result.books, result.error));
    effect(() => {
      const ready = this.store.ready(),
        codes = this.store.codes();
      if (ready)
        untracked(() => {
          const removed = this.selected().filter((c) => !codes.includes(c));
          this.selected.update((selected) => selected.filter((c) => codes.includes(c)));
          if (removed.length)
            this.notice.set(
              'Một số cuốn đã bị xóa khỏi danh sách và không còn trong nội dung hỏi mua.',
            );
          this.refresh();
        });
    });
    effect(() => {
      const now = this.clock.now(),
        books = Object.values(this.books());
      const expired = books.filter(
        (b) =>
          b.saleEndsAt &&
          now >= Date.parse(b.saleEndsAt) &&
          !this.expired.has(b.bookCode + b.saleEndsAt),
      );
      if (expired.length)
        untracked(() => {
          for (const b of expired) this.expired.add(b.bookCode + b.saleEndsAt);
          this.notice.set('Ưu đãi đã kết thúc. Đang xác nhận lại giá với tiệm.');
          this.refresh();
        });
    });
    const foreground = () => {
      if (this.store.ready() && this.document.visibilityState !== 'hidden') this.refresh();
    };
    this.document.addEventListener('visibilitychange', foreground);
    this.destroy.onDestroy(() => this.document.removeEventListener('visibilitychange', foreground));
  }
  private eligible(book: PublicBook, now = this.clock.now()) {
    return (
      book.availability === 'AVAILABLE' &&
      book.priceMinVnd !== null &&
      book.priceMinVnd > 0 &&
      book.priceMaxVnd !== null &&
      book.priceMaxVnd >= book.priceMinVnd &&
      (!book.saleEndsAt || now < Date.parse(book.saleEndsAt))
    );
  }
  selectable(code: string) {
    const book = this.books()[code];
    return !!book && this.eligible(book) && !this.loading() && !this.error();
  }
  toggleSelection(code: string, checked: boolean) {
    if (!this.selectable(code)) return;
    this.enquiryMode.set(false);
    this.prepared.set([]);
    this.notice.set('');
    this.selected.update((codes) =>
      checked ? [...new Set([...codes, code])] : codes.filter((c) => c !== code),
    );
  }
  selectAll() {
    if (this.loading() || this.error()) return;
    this.enquiryMode.set(false);
    this.prepared.set([]);
    this.notice.set('');
    this.selected.set(this.store.codes().filter((c) => this.selectable(c)));
  }
  clearSelection() {
    this.selected.set([]);
    this.enquiryMode.set(false);
    this.prepared.set([]);
  }
  refresh() {
    this.prepared.set([]);
    this.requests.next({ codes: [...this.store.codes()], prepare: false });
  }
  prepare() {
    if (this.loading() || this.error() || !this.selected().length) return;
    this.returnFocus = this.document.activeElement as HTMLElement | null;
    this.notice.set('');
    this.enquiryMode.set(true);
    this.requests.next({
      codes: this.store.codes().filter((c) => this.selected().includes(c)),
      prepare: true,
    });
  }
  onDialogClosed() {
    this.enquiryMode.set(false);
    this.prepared.set([]);
    if (!this.selected().length) this.document.getElementById('wishlist-heading')?.focus();
  }

  private accept(request: LookupRequest, incoming: PublicBook[], failed: boolean) {
    this.loading.set(false);
    this.error.set(failed);
    const currentCodes = this.store.codes();
    const books = request.prepare ? { ...this.books() } : ({} as Record<string, PublicBook>);
    for (const code of request.codes) delete books[code];
    for (const b of incoming)
      if (currentCodes.includes(b.bookCode) && request.codes.includes(b.bookCode))
        books[b.bookCode] = b;
    this.books.set(books);
    if (failed) {
      return;
    }
    const oldSelection = this.selected();
    const selected = oldSelection.filter(
      (c) => currentCodes.includes(c) && !!books[c] && this.eligible(books[c]),
    );
    this.selected.set(selected);
    if (selected.length < oldSelection.length)
      this.notice.set(
        'Một số cuốn đã hết hàng hoặc không còn hiển thị, đã được loại khỏi nội dung hỏi mua.',
      );
    if (this.enquiryMode()) {
      this.prepared.set(currentCodes.filter((c) => selected.includes(c)).map((c) => books[c]));
      if (request.prepare && selected.length && !this.dialog.dialog.nativeElement.open)
        this.dialog.open(this.returnFocus);
    }
  }
}
