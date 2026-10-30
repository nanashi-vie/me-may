import { bookPrice, enquiryText } from './catalogue-state';
import { firstValueFrom } from 'rxjs';
import {
  Component,
  RESPONSE_INIT,
  inject,
  signal,
  effect,
  TransferState,
  makeStateKey,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, map, of, switchMap, combineLatest, Subject, startWith } from 'rxjs';
import { PublicApi, PUBLIC_SITE_ORIGIN } from './public-api';
import { PublicBook, PublicVariant, ContactConfig } from './public.models';
import { bookTitle, effectiveBook } from './catalogue-state';
import { PageMetadata } from '../../core/page-metadata';
import { PublicError } from './public-error';
import { ContactDialog } from './contact-dialog';
import { PublicClock } from './public-clock';
import { WishlistButton } from '../wishlist/wishlist-button';
import {
  AGE_LABELS,
  READING_LABELS,
  PRICE_NOTE,
  READING_NOTE,
  formatPrice,
  formatPriceRange,
  MEDIA_LABELS,
} from '../admin/books/book-copy';
@Component({
  selector: 'app-book-detail',
  imports: [RouterLink, PublicError, ContactDialog, WishlistButton],
  templateUrl: './book-detail.html',
  styleUrl: './book-detail.scss',
})
export class BookDetail {
  readonly api = inject(PublicApi);
  readonly selectedVariantId = signal<string|null>(null);
  readonly variantNotice = signal('');
  selectedVariant(): PublicVariant | null {
    return this.book()?.variants.find(v=>v.id===this.selectedVariantId()) ?? null;
  }
  selectVariant(id: string) {
    if (this.verifying() || !this.book()?.variants.some(v=>v.id===id && v.available)) return;
    this.selectedVariantId.set(id); this.variantNotice.set('');
  }
  canContact() {
    const b=this.book();
    return !!b && !this.verifying() && (b.availability==='SOLD' || !!this.selectedVariant()?.available);
  }
  readonly verifyContact = async () => {
    const current = this.book(), selectedId=this.selectedVariantId();
    if (!current) return '';
    const fresh = await firstValueFrom(this.api.detail(current.slug));
    if (this.book()?.id !== current.id || this.selectedVariantId() !== selectedId ||
        fresh.id !== current.id || fresh.slug !== this.route.snapshot.paramMap.get('slug')) return '';
    const selected = fresh.variants.find(v=>v.id===selectedId);
    this.accept(fresh);
    if (fresh.availability !== 'SOLD' && !selected?.available) {
      this.selectedVariantId.set(null);
      this.variantNotice.set('Biến thể đã chọn đã hết hàng hoặc thay đổi. Vui lòng chọn lại tình trạng còn hàng.');
      return '';
    }
    return enquiryText(effectiveBook(fresh, this.clock.now() || Date.now()),
      this.origin + '/sach/' + fresh.slug, fresh.availability==='SOLD' ? undefined : selected);
  };

  readonly clock = inject(PublicClock);
  private readonly route = inject(ActivatedRoute);
  private readonly meta = inject(PageMetadata);
  private readonly response = inject(RESPONSE_INIT, { optional: true });
  readonly origin = inject(PUBLIC_SITE_ORIGIN);
  readonly book = signal<PublicBook | null>(null);
  readonly loading = signal(true);
  readonly verifying = signal(false);
  private readonly state = inject(TransferState);
  private readonly server = isPlatformServer(inject(PLATFORM_ID));
  private readonly stateKey = makeStateKey<PublicBook | null>('memay-detail-book');
  readonly error = signal(0);
  readonly config = signal<ContactConfig | null>(null);
  private readonly refreshRequests = new Subject<void>();
  private expiredSlug = '';
  readonly title = bookTitle;
  readonly price = bookPrice;
  readonly range = formatPriceRange;
  readonly mediaLabels: Record<string, string> = MEDIA_LABELS;
  readonly ages = AGE_LABELS;
  readonly levels = READING_LABELS;
  readonly priceNote = PRICE_NOTE;
  readonly readingNote = READING_NOTE;
  constructor() {
    const initial = this.state.get(this.stateKey, null);
    this.state.remove(this.stateKey);
    if (initial?.slug === this.route.snapshot.paramMap.get('slug')) this.accept(initial);
    this.api
      .contact()
      .pipe(takeUntilDestroyed())
      .subscribe({ next: (c) => this.config.set(c), error: () => {} });
    combineLatest([this.route.paramMap, this.refreshRequests.pipe(startWith(undefined))])
      .pipe(
        switchMap(([p]) => {
          this.loading.set(!this.book() || this.book()?.slug !== p.get('slug'));
          this.verifying.set(true);
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
    this.verifying.set(false);
    if (this.server && b) this.state.set(this.stateKey, b);
    this.error.set(error);
    const previous=this.book();
    this.book.set(b);
    if (!b || b.id !== previous?.id) { this.selectedVariantId.set(null); this.variantNotice.set(''); }
    if (b && this.selectedVariantId() && !b.variants.some(v=>v.id===this.selectedVariantId() && v.available)) {
      this.selectedVariantId.set(null);
      this.variantNotice.set('Biến thể đã chọn đã hết hàng. Vui lòng chọn lại.');
    }
    if (b && b.variants.length===1 && b.variants[0].available && !this.selectedVariantId())
      this.selectedVariantId.set(b.variants[0].id);
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
    this.refreshRequests.next();
  }
}
