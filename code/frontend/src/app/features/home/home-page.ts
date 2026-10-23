import { Component, inject, signal, effect, RESPONSE_INIT } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PublicApi } from '../catalogue/public-api';
import { FlashSale, HomeData } from '../catalogue/public.models';
import { PublicClock } from '../catalogue/public-clock';
import { countdown } from '../catalogue/catalogue-state';
import { BookCard } from '../catalogue/book-card';
import { PublicError } from '../catalogue/public-error';
import { PageMetadata } from '../../core/page-metadata';
@Component({
  selector: 'app-home-page',
  imports: [RouterLink, BookCard, PublicError],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  private readonly response = inject(RESPONSE_INIT, { optional: true });
  private readonly meta = inject(PageMetadata);
  private readonly api = inject(PublicApi);
  readonly clock = inject(PublicClock);
  readonly data = signal<HomeData | null>(null);
  readonly sale = signal<FlashSale | null>(null);
  readonly saleError = signal(false);
  readonly error = signal(false);
  readonly loading = signal(true);
  readonly countdown = countdown;
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
    this.api.home().subscribe({
      next: (d) => {
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
    this.api.sale().subscribe({
      next: (s) => {
        this.clock.align(s.serverNow);
        this.sale.set(s);
        this.saleError.set(false);
      },
      error: () => {
        this.sale.set(null);
        this.saleError.set(true);
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
}
