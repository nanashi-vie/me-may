import {
  Component,
  inject,
  signal,
  effect,
  RESPONSE_INIT,
  DestroyRef,
  ViewChild,
} from '@angular/core';
import { HeroCarousel } from './hero-carousel';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PublicSkeleton } from '../catalogue/public-skeleton/public-skeleton';
import { PublicApi } from '../catalogue/public-api';
import { FlashSale, HomeData } from '../catalogue/public.models';
import { PublicClock } from '../catalogue/public-clock';
import { countdown, countdownParts } from '../catalogue/catalogue-state';
import { BookCarousel } from '../catalogue/book-carousel/book-carousel';
import { PublicError } from '../catalogue/public-error';
import { PageMetadata } from '../../core/page-metadata';
import { HowToBuyDialog } from './how-to-buy-dialog/how-to-buy-dialog';
import { CommunityDialog, COMMUNITY_URL } from './community-dialog/community-dialog';
import { ShippingPromoDialog } from './shipping-promo-dialog/shipping-promo-dialog';

@Component({
  selector: 'app-home-page',
  imports: [
    HeroCarousel,
    PublicSkeleton,
    RouterLink,
    BookCarousel,
    PublicError,
    HowToBuyDialog,
    ShippingPromoDialog,
    CommunityDialog,
  ],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  @ViewChild('communityDialog') communityDialog?: CommunityDialog;
  @ViewChild('shippingPromoDialog') shippingPromoDialog?: ShippingPromoDialog;
  @ViewChild('howToBuyDialog') howToBuyDialog?: HowToBuyDialog;
  private readonly response = inject(RESPONSE_INIT, { optional: true });
  private readonly meta = inject(PageMetadata);
  private readonly api = inject(PublicApi);
  private readonly destroy = inject(DestroyRef);
  private homeRequest?: Subscription;
  private saleRequest?: Subscription;
  readonly clock = inject(PublicClock);
  readonly data = signal<HomeData | null>(null);
  readonly sale = signal<FlashSale | null>(null);
  readonly saleError = signal(false);
  readonly error = signal(false);
  readonly loading = signal(true);
  readonly groupUrl = COMMUNITY_URL;
  readonly countdown = countdown;
  readonly countdownParts = countdownParts;
  private expired = '';
  constructor() {
    inject(PageMetadata).set(
      'Mẹ Mây — Sách ngoại văn cho bé',
      'Những cuốn sách ngoại văn đã qua sử dụng, ảnh thật và tình trạng rõ ràng.',
      '/',
    );
    this.load();
    this.loadSale();
    effect(() => {
      const sale = this.sale();
      if (
        sale?.endsAt &&
        this.clock.now() >= Date.parse(sale.endsAt) &&
        this.expired !== sale.endsAt
      ) {
        this.expired = sale.endsAt;
        this.sale.set(null);
        this.loadSale();
        this.load();
      }
    });
  }
  load() {
    this.loading.set(true);
    this.error.set(false);
    this.homeRequest?.unsubscribe();
    this.homeRequest = this.api
      .home()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (d) => {
          this.meta.set(
            'Mẹ Mây — Sách ngoại văn cho bé',
            'Những cuốn sách ngoại văn đã qua sử dụng, ảnh thật và tình trạng rõ ràng.',
            '/',
          );
          this.data.set(d);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
          if (this.response) this.response.status = 503;
          this.meta.unavailable(503);
        },
      });
  }
  loadSale() {
    this.saleRequest?.unsubscribe();
    this.saleRequest = this.api
      .sale()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (s) => {
          this.clock.align(s.serverNow);
          this.sale.set(s);
          this.saleError.set(false);
        },
        error: () => {
          this.sale.set(null);
          this.saleError.set(true);
          if (this.response) {
            const headers = new Headers(this.response.headers);
            headers.set('X-Memay-No-Cache', 'sale-unavailable');
            this.response.headers = headers;
          }
        },
      });
  }
  remaining() {
    return this.sale()?.endsAt
      ? Math.max(
          0,
          Date.parse(this.sale()!.endsAt!) -
            (this.clock.now() || Date.parse(this.sale()!.serverNow)),
        )
      : 0;
  }
  openCommunity(event: MouseEvent): void {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;

    const trigger = event.currentTarget as HTMLAnchorElement;
    const view = trigger.ownerDocument.defaultView;
    if (!view) return;

    const { userAgent, maxTouchPoints } = view.navigator;
    // iPadOS can advertise itself as a Mac when requesting desktop sites.
    if (
      /Android|iPhone|iPad|iPod/i.test(userAgent) ||
      (/Macintosh/i.test(userAgent) && maxTouchPoints > 1)
    )
      return;

    const desktopOs = /Windows NT|Macintosh|X11|Linux|CrOS/i.test(userAgent);
    if (!desktopOs && view.matchMedia?.('(pointer: coarse) and (hover: none)').matches) return;

    if (this.communityDialog?.open(trigger)) event.preventDefault();
  }

  openShippingPromo(trigger?: HTMLElement | null) {
    this.shippingPromoDialog?.open(trigger);
  }

  openHowToBuy(trigger?: HTMLElement | null) {
    this.howToBuyDialog?.open(trigger);
  }
}
