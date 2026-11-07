import { Component, inject, signal, computed, effect, RESPONSE_INIT, DestroyRef, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PublicSkeleton } from '../catalogue/public-skeleton/public-skeleton';
import { PublicApi } from '../catalogue/public-api';
import { ContactConfig, FlashSale, HomeData } from '../catalogue/public.models';
import { PublicClock } from '../catalogue/public-clock';
import { countdown, countdownParts } from '../catalogue/catalogue-state';
import { BookCard } from '../catalogue/book-card/book-card';
import { PublicError } from '../catalogue/public-error';
import { PageMetadata } from '../../core/page-metadata';
import { HowToBuyDialog } from './how-to-buy-dialog/how-to-buy-dialog';
import { ShippingPromoDialog } from './shipping-promo-dialog/shipping-promo-dialog';

@Component({
  selector: 'app-home-page',
  imports: [PublicSkeleton, RouterLink, BookCard, PublicError, HowToBuyDialog, ShippingPromoDialog],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
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
  readonly contact = signal<ContactConfig | null>(null);
  readonly groupUrl = computed(() => this.contact()?.groupUrl || '');
  readonly countdown = countdown;
  readonly countdownParts = countdownParts;
  readonly shelfIndices = signal<Record<string, number>>({});
  readonly shelfEdges = signal<Record<string, { atStart: boolean; atEnd: boolean }>>({});
  private expired = '';
  constructor() {
    inject(PageMetadata).set(
      'Mẹ Mây — Sách ngoại văn cho bé',
      'Những cuốn sách ngoại văn đã qua sử dụng, ảnh thật và tình trạng rõ ràng.',
      '/',
    );
    this.load();
    this.loadSale();
    this.loadContact();
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
  loadContact() {
    if (typeof this.api.contact !== 'function') return;
    this.api
      .contact()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (c) => this.contact.set(c),
        error: () => this.contact.set(null),
      });
  }

  openShippingPromo(trigger?: HTMLElement | null) {
    this.shippingPromoDialog?.open(trigger);
  }

  openHowToBuy(trigger?: HTMLElement | null) {
    this.howToBuyDialog?.open(trigger);
  }

  isAtStart(key: string): boolean {
    const edge = this.shelfEdges()[key];
    if (edge) return edge.atStart;
    return (this.shelfIndices()[key] ?? 0) <= 0;
  }

  isAtEnd(key: string, total: number): boolean {
    const maxIdx = Math.max(0, Math.min(total, 10) - 5);
    const edge = this.shelfEdges()[key];
    if (edge) return edge.atEnd;
    return (this.shelfIndices()[key] ?? 0) >= maxIdx;
  }

  scrollShelf(track: HTMLElement, dir: -1 | 1, key: string, total: number) {
    const cappedTotal = Math.min(total, 10);
    const maxIdx = Math.max(0, cappedTotal - 5);
    const currentIdx = this.shelfIndices()[key] ?? 0;
    const nextIdx = Math.max(0, Math.min(maxIdx, currentIdx + dir));
    this.shelfIndices.update((m) => ({ ...m, [key]: nextIdx }));

    const firstItem = track.querySelector('.carousel-item') as HTMLElement | null;
    const styles = typeof getComputedStyle === 'function' ? getComputedStyle(track) : null;
    const gap = parseFloat(styles?.columnGap || styles?.gap || '12.8') || 12.8;
    const itemWidth =
      firstItem?.getBoundingClientRect().width ||
      (track.clientWidth > 0 ? (track.clientWidth - gap * 4) / 5 : 220);
    const step = itemWidth + gap;

    if (typeof track.scrollBy === 'function') {
      track.scrollBy({ left: dir * step, behavior: 'smooth' });
    } else {
      track.scrollLeft += dir * step;
    }

    this.shelfEdges.update((m) => ({
      ...m,
      [key]: { atStart: nextIdx <= 0, atEnd: nextIdx >= maxIdx },
    }));
  }

  onShelfScroll(track: HTMLElement, key: string, total: number) {
    if (track.scrollWidth > track.clientWidth) {
      const atStart = track.scrollLeft <= 4;
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      this.shelfEdges.update((m) => ({ ...m, [key]: { atStart, atEnd } }));
      const firstItem = track.querySelector('.carousel-item') as HTMLElement | null;
      const styles = typeof getComputedStyle === 'function' ? getComputedStyle(track) : null;
      const gap = parseFloat(styles?.columnGap || styles?.gap || '12.8') || 12.8;
      const step = (firstItem?.getBoundingClientRect().width || 200) + gap;
      if (step > 0) {
        const maxIdx = Math.max(0, Math.min(total, 10) - 5);
        const approxIdx = Math.max(0, Math.min(maxIdx, Math.round(track.scrollLeft / step)));
        this.shelfIndices.update((m) => ({ ...m, [key]: approxIdx }));
      }
    }
  }
}
