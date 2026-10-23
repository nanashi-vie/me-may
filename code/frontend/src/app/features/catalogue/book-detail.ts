import { Component, RESPONSE_INIT, inject, signal, effect } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, map, of, switchMap } from 'rxjs';
import { PublicApi, PUBLIC_SITE_ORIGIN } from './public-api';
import { PublicBook, ContactConfig } from './public.models';
import { bookTitle, effectiveBook } from './catalogue-state';
import { PageMetadata } from '../../core/page-metadata';
import { PublicError } from './public-error';
import { ContactDialog } from './contact-dialog';
import { PublicClock } from './public-clock';
import {
  AGE_LABELS,
  READING_LABELS,
  PRICE_NOTE,
  READING_NOTE,
  formatPrice,
} from '../admin/books/book-copy';
@Component({
  selector: 'app-book-detail',
  imports: [RouterLink, PublicError, ContactDialog],
  templateUrl: './book-detail.html',
  styleUrl: './book-detail.scss',
})
export class BookDetail {
  readonly api = inject(PublicApi);
  readonly clock = inject(PublicClock);
  private readonly route = inject(ActivatedRoute);
  private readonly meta = inject(PageMetadata);
  private readonly response = inject(RESPONSE_INIT, { optional: true });
  readonly origin = inject(PUBLIC_SITE_ORIGIN);
  readonly book = signal<PublicBook | null>(null);
  readonly loading = signal(true);
  readonly error = signal(0);
  readonly config = signal<ContactConfig | null>(null);
  private expiredSlug = '';
  readonly title = bookTitle;
  readonly price = formatPrice;
  readonly ages = AGE_LABELS;
  readonly levels = READING_LABELS;
  readonly priceNote = PRICE_NOTE;
  readonly readingNote = READING_NOTE;
  constructor() {
    this.api
      .contact()
      .pipe(takeUntilDestroyed())
      .subscribe({ next: (c) => this.config.set(c), error: () => {} });
    this.route.paramMap
      .pipe(
        switchMap((p) => {
          this.loading.set(true);
          this.error.set(0);
          return this.api.detail(p.get('slug')!).pipe(
            map((b) => ({ b, error: 0 })),
            catchError((e) => of({ b: null, error: e.status === 404 ? 404 : 503 })),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((r) => this.accept(r.b, r.error));
    effect(() => {
      const b = this.book(),
        now = this.clock.now();
      if (
        b?.saleEndsAt &&
        now >= Date.parse(b.saleEndsAt) &&
        this.expiredSlug !== b.slug + b.saleEndsAt
      ) {
        this.expiredSlug = b.slug + b.saleEndsAt;
        this.refresh();
      }
    });
  }
  display() {
    return this.book() ? effectiveBook(this.book()!, this.clock.now()) : null;
  }
  accept(b: PublicBook | null, error = 0) {
    this.loading.set(false);
    this.error.set(error);
    this.book.set(b);
    if (error) {
      if (this.response) this.response.status = error;
      this.meta.unavailable(error);
      return;
    }
    if (b)
      this.meta.set(
        bookTitle(b) + ' | Mẹ Mây',
        b.description?.slice(0, 180) || `${b.title} — ${b.conditionNote}`,
        '/sach/' + b.slug,
        b.media[0]?.contentPath,
      );
  }
  refresh() {
    this.api.detail(this.route.snapshot.paramMap.get('slug')!).subscribe({
      next: (b) => this.accept(b),
      error: (e) => {
        if (e.status === 404) this.accept(null, 404);
        else {
          this.loading.set(false);
          this.error.set(503);
        }
      },
    });
  }
}
