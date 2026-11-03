import { Component, DestroyRef, RESPONSE_INIT, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { PageMetadata } from '../../../core/page-metadata';
import { BookCard } from '../book-card/book-card';
import { countdown, countdownParts } from '../catalogue-state';
import { PublicApi } from '../public-api';
import { PublicClock } from '../public-clock';
import { PublicError } from '../public-error';
import { FlashSale } from '../public.models';

@Component({
  selector: 'app-flash-sale-page',
  imports: [RouterLink, BookCard, PublicError],
  templateUrl: './flash-sale-page.html',
  styleUrl: './flash-sale-page.scss',
})
export class FlashSalePage {
  private readonly response = inject(RESPONSE_INIT, { optional: true });
  private readonly meta = inject(PageMetadata);
  private readonly api = inject(PublicApi);
  private readonly destroy = inject(DestroyRef);
  private request?: Subscription;
  readonly clock = inject(PublicClock);
  readonly sale = signal<FlashSale | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly countdown = countdown;
  readonly countdownParts = countdownParts;
  private expired = '';
  constructor() {
    inject(PageMetadata).set(
      'Flash Sale | Mẹ Mây',
      'Ưu đãi có thời hạn cho những cuốn sách ngoại văn tại tiệm.',
      '/flash-sale',
    );
    this.load();
    effect(() => {
      const s = this.sale();
      if (s?.endsAt && this.clock.now() >= Date.parse(s.endsAt) && this.expired !== s.endsAt) {
        this.expired = s.endsAt;
        this.sale.set(null);
        this.load();
      }
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
  load() {
    this.loading.set(true);
    this.error.set(false);
    this.request?.unsubscribe();
    this.request = this.api
      .sale()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (s) => {
          this.meta.set(
            'Flash Sale | Mẹ Mây',
            'Ưu đãi có thời hạn cho những cuốn sách ngoại văn tại tiệm.',
            '/flash-sale',
          );
          this.clock.align(s.serverNow);
          this.sale.set(s);
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
}
