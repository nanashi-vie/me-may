import { PublicSkeleton } from '../public-skeleton/public-skeleton';
import { publicPicture } from '../catalogue-state';
import { bookPrice, bookTitle, countdownParts, discountPercent, effectiveBook, enquiryText } from '../catalogue-state';
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
import { PublicApi, PUBLIC_SITE_ORIGIN } from '../public-api';
import { PublicBook, ContactConfig } from '../public.models';
import { PageMetadata } from '../../../core/page-metadata';
import { PublicError } from '../public-error';
import { ContactDialog } from '../contact-dialog/contact-dialog';
import { PublicClock } from '../public-clock';
import { WishlistButton } from '../../wishlist/wishlist-button';
import { BookCard } from '../book-card/book-card';
import { RelatedBooks } from '../public.models';
import {
  AGE_LABELS,
  READING_LABELS,
  PRICE_NOTE,
  READING_NOTE,
  formatPrice,
  formatPriceRange,
  MEDIA_LABELS,
} from '../../admin/books/book-copy';
@Component({
  selector: 'app-book-detail',
  imports: [PublicSkeleton, RouterLink, PublicError, ContactDialog, WishlistButton, BookCard],
  templateUrl: './book-detail.html',
  styleUrl: './book-detail.scss',
})
export class BookDetail {
  readonly picture = publicPicture;
  readonly failedImages = signal<ReadonlySet<string>>(new Set());

  imageFailed(src: string | undefined) {
    if (src) this.failedImages.update(failed => new Set(failed).add(src));
  }
  readonly api = inject(PublicApi);
  readonly selectedMedia = signal(0);
  readonly related = signal<RelatedBooks | null>(null);
  mainMedia() {
    const m = this.book()?.media ?? [];
    return m[Math.min(this.selectedMedia(), m.length - 1)] ?? null;
  }
  selectMedia(i: number) {
    this.selectedMedia.set(i);
  }
  scrollShelf(el: HTMLElement, dir: number) {
    el.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: 'smooth' });
  }
  onContact(contact: ContactDialog) {
    if(this.canContact()) contact.open();
  }
  canContact() { return !!this.book() && !this.verifying(); }
  readonly verifyContact = async () => {
    const current=this.book();
    if(!current) return '';
    const fresh=await firstValueFrom(this.api.detail(current.slug));
    if(this.book()?.id!==current.id || fresh.id!==current.id ||
       fresh.slug!==this.route.snapshot.paramMap.get('slug')) return '';
    this.accept(fresh);
    return enquiryText(effectiveBook(fresh,this.clock.now() || Date.now()),this.origin+'/sach/'+fresh.slug);
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
  readonly countdownParts = countdownParts;
  readonly discount = discountPercent;
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
          const slug = p.get('slug')!;
          this.loading.set(!this.book() || this.book()?.slug !== slug);
          this.verifying.set(true);
          this.error.set(0);
          return this.api.detail(slug).pipe(
            switchMap((b) =>
              (this.api.related ? this.api.related(slug) : of<RelatedBooks>({ samePublisherBooks: [], sameCategoryBooks: [] })).pipe(
                map((rel) => ({ b, rel, error: 0 })),
                catchError(() => of({ b, rel: { samePublisherBooks: [], sameCategoryBooks: [] }, error: 0 })),
              ),
            ),
            catchError((e) => of({ b: null, rel: null, error: e.status === 404 ? 404 : 503 })),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((r) => {
        this.related.set(r.rel);
        this.accept(r.b, r.error);
      });
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
  saleRemaining() {
    const ends = this.display()?.saleEndsAt;
    return ends ? Math.max(0, Date.parse(ends) - (this.clock.now() || Date.now())) : 0;
  }
  private shareImage(book: PublicBook) {
    const cover = book.media.find(media => media.role === 'FRONT');
    if (!cover) return undefined;
    return cover.imageVariants ? publicPicture(cover).src : cover.contentPath;
  }

  accept(b: PublicBook | null, error = 0) {
    this.loading.set(false);
    this.verifying.set(false);
    if(b) b={...b,conditionNote:null,conditionGrade:null,variants:[]};
    if (this.server && b) this.state.set(this.stateKey, b);
    this.error.set(error);
    const previous=this.book();
    this.book.set(b);
    if (!b || b.id !== previous?.id) {
      this.selectedMedia.set(0);
      this.failedImages.set(new Set());
    }
    if (error) {
      this.related.set(null);
      if (this.response) this.response.status = error;
      this.meta.unavailable(error);
      return;
    }
    if (b)
      this.meta.set(
        bookTitle(b) + ' | Mẹ Mây',
        b.description?.slice(0, 180) || b.title,
        '/sach/' + b.slug,
        this.shareImage(b),
      );
  }
  refresh() {
    this.refreshRequests.next();
  }
}
