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
import { BookCarousel } from '../book-carousel/book-carousel';
import { RelatedBooks } from '../public.models';
import {
  AGE_LABELS,
  CATEGORY_LABELS,
  READING_LABELS,
  PRICE_NOTE,
  READING_NOTE,
  formatPrice,
  formatPriceRange,
  MEDIA_LABELS,
} from '../../admin/books/book-copy';
import { Breadcrumb, BreadcrumbItem } from '../../../shared/breadcrumb/breadcrumb';
@Component({
  selector: 'app-book-detail',
  imports: [PublicSkeleton, RouterLink, PublicError, ContactDialog, WishlistButton, BookCarousel, Breadcrumb],
  templateUrl: './book-detail.html',
  styleUrl: './book-detail.scss',
  host: { '(window:blur)': 'cancelLightboxDrag()' },
})
export class BookDetail {
  readonly picture = publicPicture;
  readonly failedImages = signal<ReadonlySet<string>>(new Set());
  readonly loupeSize = 150;
  readonly loupeZoom = 2.8;
  readonly loupe = signal<{
    visible: boolean;
    x: number;
    y: number;
    lensSize: number;
    popupSize: number;
    bgX: number;
    bgY: number;
    bgW: number;
    bgH: number;
  } | null>(null);
  readonly thumbCanScrollUp = signal(false);
  readonly thumbCanScrollDown = signal(false);
  readonly lightboxOpen = signal(false);
  readonly zoomScale = signal(1);
  readonly zoomPan = signal({ x: 0, y: 0 });
  readonly swipeOffsetX = signal(0);
  readonly lightboxDragging = signal(false);
  private stageTriggerEl: HTMLElement | null = null;
  private viewportBounds = { w: 480, h: 640 };
  private readonly activePointers = new Map<number, { x: number; y: number }>();
  private swipeStart: { id: number; x: number; y: number } | null = null;
  private movedDuringPointer = false;
  private suppressNextBackdropClick = false;
  private suppressTimer: ReturnType<typeof setTimeout> | null = null;
  private pinchStartDist = 0;
  private pinchStartScale = 1;
  private lastTapTime = 0;

  imageFailed(src: string | undefined) {
    if (src) {
      this.failedImages.update((failed) => new Set(failed).add(src));
      this.hideLoupe(true);
    }
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
    this.hideLoupe(true);
    this.resetZoom();
  }
  scrollThumbs(listEl: HTMLElement, dir: -1 | 1) {
    const [first, second] = Array.from(listEl.children) as HTMLElement[];
    const step = second?.offsetTop - first?.offsetTop || 104;
    if (typeof listEl.scrollBy === 'function') {
      listEl.scrollBy({ top: dir * step, behavior: 'smooth' });
    } else {
      listEl.scrollTop = Math.max(0, listEl.scrollTop + dir * step);
    }
    this.updateThumbScrollState(listEl);
  }
  updateThumbScrollState(listEl: HTMLElement) {
    if (!listEl.clientHeight) {
      this.thumbCanScrollUp.set(listEl.scrollTop > 2);
      this.thumbCanScrollDown.set((this.book()?.media.length ?? 0) > 5);
      return;
    }
    this.thumbCanScrollUp.set(listEl.scrollTop > 2);
    this.thumbCanScrollDown.set(listEl.scrollTop + listEl.clientHeight < listEl.scrollHeight - 2);
  }
  onStagePointerMove(event: PointerEvent, stageEl: HTMLElement, imgEl: HTMLImageElement) {
    if ((event.pointerType && event.pointerType !== 'mouse') || this.lightboxOpen()) {
      this.hideLoupe(this.lightboxOpen());
      return;
    }
    const rect = imgEl.getBoundingClientRect();
    const stageRect = stageEl.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      this.hideLoupe();
      return;
    }
    let renderW = rect.width;
    let renderH = rect.height;
    let offsetX = 0;
    let offsetY = 0;
    if (imgEl.naturalWidth > 0 && imgEl.naturalHeight > 0) {
      const imgRatio = imgEl.naturalWidth / imgEl.naturalHeight;
      const boxRatio = rect.width / rect.height;
      if (imgRatio > boxRatio) {
        renderH = rect.height;
        renderW = rect.height * imgRatio;
        offsetX = (rect.width - renderW) / 2;
      } else {
        renderW = rect.width;
        renderH = rect.width / imgRatio;
        offsetY = (rect.height - renderH) / 2;
      }
    }
    if (
      event.clientX < rect.left ||
      event.clientX > rect.left + rect.width ||
      event.clientY < rect.top ||
      event.clientY > rect.top + rect.height
    ) {
      this.hideLoupe();
      return;
    }
    const visX = event.clientX - rect.left;
    const visY = event.clientY - rect.top;
    const lensSize = Math.min(this.loupeSize, rect.width, rect.height);
    const half = lensSize / 2;
    const clampedX = Math.min(Math.max(visX, half), Math.max(half, rect.width - half));
    const clampedY = Math.min(Math.max(visY, half), Math.max(half, rect.height - half));
    const imgLeft = clampedX - half - offsetX;
    const imgTop = clampedY - half - offsetY;
    const popupSize = Math.round(stageRect.height > 0 ? stageRect.height : lensSize * this.loupeZoom);
    const zoom = lensSize > 0 ? popupSize / lensSize : this.loupeZoom;
    this.loupe.set({
      visible: true,
      x: Math.round(rect.left - stageRect.left + clampedX) || 0,
      y: Math.round(rect.top - stageRect.top + clampedY) || 0,
      lensSize: Math.round(lensSize),
      popupSize,
      bgX: Math.round(-imgLeft * zoom) || 0,
      bgY: Math.round(-imgTop * zoom) || 0,
      bgW: Math.round(renderW * zoom),
      bgH: Math.round(renderH * zoom),
    });
  }
  hideLoupe(immediate = false) {
    const cur = this.loupe();
    if (!cur) return;
    if (immediate) {
      this.loupe.set(null);
    } else if (cur.visible) {
      this.loupe.set({ ...cur, visible: false });
    }
  }
  zoomPercent() {
    return Math.round(this.zoomScale() * 100);
  }
  lightboxTrackTransform() {
    return `translate3d(calc(${-this.selectedMedia()} * (100% + 24px) + ${this.swipeOffsetX()}px), 0, 0)`;
  }
  openLightbox(dialog: HTMLDialogElement, trigger?: HTMLElement) {
    const m = this.mainMedia();
    const src = m ? this.picture(m, true).src : undefined;
    if (!m || !src || this.failedImages().has(src)) return;
    this.stageTriggerEl = trigger ?? null;
    this.hideLoupe(true);
    this.clearSuppressClick();
    this.resetZoom();
    this.activePointers.clear();
    this.swipeStart = null;
    this.lightboxOpen.set(true);
    if (typeof dialog.showModal === 'function' && !dialog.open) {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }
  closeLightbox(dialog: HTMLDialogElement) {
    this.lightboxOpen.set(false);
    this.clearSuppressClick();
    this.resetZoom();
    this.activePointers.clear();
    this.swipeStart = null;
    if (typeof dialog.close === 'function' && dialog.open) {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
      this.stageTriggerEl?.focus();
      this.stageTriggerEl = null;
    }
  }
  onLightboxNativeClose() {
    this.lightboxOpen.set(false);
    this.clearSuppressClick();
    this.resetZoom();
    this.activePointers.clear();
    this.swipeStart = null;
    this.stageTriggerEl?.focus();
    this.stageTriggerEl = null;
  }
  onLightboxBackdropClick(event: MouseEvent, dialog: HTMLDialogElement) {
    if (this.suppressNextBackdropClick) {
      this.clearSuppressClick();
      return;
    }
    const target = event.target as HTMLElement | null;
    if (!target || target.closest('.lightbox-img, .lightbox-nav, .lightbox-top')) return;
    this.closeLightbox(dialog);
  }
  onLightboxKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.stepLightboxMedia(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.stepLightboxMedia(1);
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      this.stepZoom(0.5);
    } else if (event.key === '-') {
      event.preventDefault();
      this.stepZoom(-0.5);
    } else if (event.key === '0') {
      event.preventDefault();
      this.resetZoom();
    }
  }
  stepLightboxMedia(dir: -1 | 1) {
    const len = this.book()?.media.length ?? 0;
    if (len < 2) return;
    this.selectedMedia.update((i) => (i + dir + len) % len);
    this.resetZoom();
  }
  setZoom(nextScale: number) {
    const clamped = Math.min(3, Math.max(1, Math.round(nextScale * 100) / 100));
    this.zoomScale.set(clamped);
    if (clamped <= 1) {
      this.zoomPan.set({ x: 0, y: 0 });
    } else {
      this.zoomPan.update((p) => this.clampPan(p.x, p.y, clamped));
    }
  }
  stepZoom(delta: number) {
    this.setZoom(this.zoomScale() + delta);
  }
  resetZoom() {
    this.zoomScale.set(1);
    this.zoomPan.set({ x: 0, y: 0 });
    this.swipeOffsetX.set(0);
    this.lightboxDragging.set(false);
  }
  toggleZoom(event?: MouseEvent, viewportEl?: HTMLElement) {
    if (event && !(event.target as HTMLElement | null)?.closest('.lightbox-img')) return;
    if (this.zoomScale() > 1) {
      this.resetZoom();
      return;
    }
    const next = 2.5;
    if (event && viewportEl) {
      const rect = viewportEl.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        this.viewportBounds = { w: rect.width, h: rect.height };
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        this.zoomScale.set(next);
        this.zoomPan.set(this.clampPan(-dx * (next - 1), -dy * (next - 1), next));
        return;
      }
    }
    this.zoomScale.set(next);
    this.zoomPan.set({ x: 0, y: 0 });
  }
  onLightboxWheel(event: WheelEvent, viewportEl: HTMLElement) {
    event.preventDefault();
    const rect = viewportEl.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) this.viewportBounds = { w: rect.width, h: rect.height };
    this.stepZoom(event.deltaY < 0 ? 0.25 : -0.25);
  }
  onLightboxPointerDown(event: PointerEvent, viewportEl: HTMLElement) {
    if ((event.target as HTMLElement | null)?.closest('button')) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const rect = viewportEl.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) this.viewportBounds = { w: rect.width, h: rect.height };
    this.clearSuppressClick();
    this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.activePointers.size === 1) {
      this.swipeStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
      this.movedDuringPointer = false;
      this.lightboxDragging.set(false);
    } else if (this.activePointers.size === 2) {
      this.swipeStart = null;
      this.swipeOffsetX.set(0);
      this.lightboxDragging.set(false);
      this.pinchStartDist = this.pointerDistance();
      this.pinchStartScale = this.zoomScale();
    }
  }
  onLightboxPointerMove(event: PointerEvent, viewportEl?: HTMLElement) {
    const prev = this.activePointers.get(event.pointerId);
    if (!prev) return;
    if (event.pointerType === 'mouse' && event.buttons === 0) {
      this.onLightboxPointerUp(event, viewportEl);
      return;
    }
    this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.activePointers.size === 2) {
      this.movedDuringPointer = true;
      this.suppressNextBackdropClick = true;
      const dist = this.pointerDistance();
      if (this.pinchStartDist > 0) this.setZoom(this.pinchStartScale * (dist / this.pinchStartDist));
      return;
    }
    if (this.activePointers.size === 1) {
      const dx = event.clientX - prev.x;
      const dy = event.clientY - prev.y;
      const totalDx = this.swipeStart ? event.clientX - this.swipeStart.x : 0;
      const totalDy = this.swipeStart ? event.clientY - this.swipeStart.y : 0;
      if (Math.hypot(totalDx, totalDy) > 5) {
        this.movedDuringPointer = true;
        this.suppressNextBackdropClick = true;
      }
      if (this.zoomScale() > 1 || (this.swipeStart && Math.abs(totalDx) > 4)) {
        if (
          viewportEl &&
          typeof viewportEl.setPointerCapture === 'function' &&
          !viewportEl.hasPointerCapture?.(event.pointerId)
        ) {
          try {
            viewportEl.setPointerCapture(event.pointerId);
          } catch {}
        }
      }
      if (this.zoomScale() > 1) {
        this.lightboxDragging.set(true);
        this.zoomPan.update((p) => this.clampPan(p.x + dx, p.y + dy, this.zoomScale()));
      } else if (this.swipeStart && Math.abs(totalDx) > 4) {
        this.lightboxDragging.set(true);
        const idx = this.selectedMedia();
        const len = this.book()?.media.length ?? 0;
        const atEdge = len <= 1 || (idx === 0 && totalDx > 0) || (idx === len - 1 && totalDx < 0);
        this.swipeOffsetX.set(atEdge ? Math.round(totalDx * 0.28) : Math.round(totalDx));
      }
    }
  }
  onLightboxPointerUp(event: PointerEvent, viewportEl?: HTMLElement) {
    if (
      viewportEl &&
      typeof viewportEl.releasePointerCapture === 'function' &&
      viewportEl.hasPointerCapture?.(event.pointerId)
    ) {
      try {
        viewportEl.releasePointerCapture(event.pointerId);
      } catch {}
    }
    if (this.activePointers.size === 1 && this.swipeStart?.id === event.pointerId) {
      const totalDx = event.clientX - this.swipeStart.x;
      const totalDy = event.clientY - this.swipeStart.y;
      this.lightboxDragging.set(false);
      this.swipeOffsetX.set(0);
      if (this.zoomScale() === 1 && Math.abs(totalDx) > 48 && Math.abs(totalDx) > Math.abs(totalDy) * 1.2) {
        const idx = this.selectedMedia();
        const len = this.book()?.media.length ?? 0;
        if (totalDx < 0 && idx < len - 1) {
          this.selectedMedia.set(idx + 1);
          this.resetZoom();
        } else if (totalDx > 0 && idx > 0) {
          this.selectedMedia.set(idx - 1);
          this.resetZoom();
        }
      } else if (
        viewportEl &&
        event.pointerType === 'touch' &&
        !this.movedDuringPointer &&
        Math.hypot(totalDx, totalDy) < 12 &&
        (event.target as HTMLElement | null)?.closest('.lightbox-img')
      ) {
        const now = Date.now();
        if (now - this.lastTapTime < 300) {
          this.toggleZoom(event, viewportEl);
          this.lastTapTime = 0;
        } else {
          this.lastTapTime = now;
        }
      }
    }
    this.activePointers.delete(event.pointerId);
    if (this.activePointers.size < 2) this.pinchStartDist = 0;
    if (this.activePointers.size === 0) {
      this.lightboxDragging.set(false);
      this.swipeOffsetX.set(0);
      this.swipeStart = null;
      if (this.suppressNextBackdropClick) {
        this.suppressTimer = setTimeout(() => this.clearSuppressClick(), 60);
      }
    }
  }
  cancelLightboxDrag() {
    if (!this.activePointers.size && !this.lightboxDragging()) return;
    this.activePointers.clear();
    this.pinchStartDist = 0;
    this.swipeStart = null;
    this.lightboxDragging.set(false);
    this.swipeOffsetX.set(0);
    this.clearSuppressClick();
  }
  private clearSuppressClick() {
    this.suppressNextBackdropClick = false;
    if (this.suppressTimer) {
      clearTimeout(this.suppressTimer);
      this.suppressTimer = null;
    }
  }
  private pointerDistance() {
    const pts = [...this.activePointers.values()];
    if (pts.length < 2) return 0;
    return Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
  }
  private clampPan(x: number, y: number, scale: number) {
    const maxX = Math.max(0, ((scale - 1) * this.viewportBounds.w) / 2);
    const maxY = Math.max(0, ((scale - 1) * this.viewportBounds.h) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
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

  categoryName(code: string | null | undefined): string {
    return code ? (CATEGORY_LABELS[code as keyof typeof CATEGORY_LABELS] ?? '') : '';
  }

  bindingLabel(binding: string | null | undefined): string {
    if (binding === 'PAPERBACK') return 'Bìa mềm';
    if (binding === 'HARDCOVER') return 'Bìa cứng';
    return '';
  }

  breadcrumbs(b: PublicBook): BreadcrumbItem[] {
    const cat = this.categoryName(b.categoryCode);
    return [
      { label: 'Trang chủ', link: '/' },
      cat
        ? { label: cat, link: '/sach', queryParams: { category: b.categoryCode } }
        : { label: 'Tất cả sách', link: '/sach' },
      { label: b.title },
    ];
  }
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
      this.hideLoupe();
      this.resetZoom();
      this.thumbCanScrollUp.set(false);
      this.thumbCanScrollDown.set((b?.media.length ?? 0) > 5);
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
