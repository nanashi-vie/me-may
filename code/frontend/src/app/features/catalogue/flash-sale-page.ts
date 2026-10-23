import { Component, effect, inject, signal, RESPONSE_INIT } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicApi } from './public-api';
import { FlashSale } from './public.models';
import { BookCard } from './book-card';
import { PublicError } from './public-error';
import { PublicClock } from './public-clock';
import { countdown } from './catalogue-state';
import { PageMetadata } from '../../core/page-metadata';
@Component({
  selector: 'app-flash-sale-page',
  imports: [RouterLink, BookCard, PublicError],
  template: `<p class="breadcrumb"><a routerLink="/">Trang chủ</a> / Flash Sale</p>
    <header class="sale-heading">
      <p class="eyebrow">Ưu đãi của tiệm</p>
      <h1>Flash Sale</h1>
      @if (sale()?.endsAt) {
        <p>
          Kết thúc trong <strong>{{ countdown(remaining()) }}</strong>
        </p>
      }
      <p>Giá áp dụng trong thời gian đợt sale, tiệm xác nhận tình trạng khi trao đổi.</p>
    </header>
    @if (loading()) {
      <p role="status">Đang kiểm tra Flash Sale…</p>
    } @else if (error()) {
      <app-public-error (retry)="load()" />
    } @else if (sale()?.items?.length) {
      <div class="sale-grid">
        @for (b of sale()!.items; track b.id) {
          <app-book-card [book]="b" [now]="clock.now()" />
        }
      </div>
    } @else {
      <section class="empty">
        <h2>Hiện chưa có Flash Sale</h2>
        <a routerLink="/sach">Khám phá tất cả sách →</a>
      </section>
    }`,
  styles: `
    .breadcrumb {
      font-size: 0.85rem;
      margin: 1.5rem 0;
    }
    .sale-heading {
      padding: 2rem;
      background: var(--cream);
      margin-bottom: 2rem;
    }
    h1 {
      max-width: none;
    }
    .sale-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 1rem;
      margin-bottom: 3rem;
    }
    .empty {
      padding: 2rem 0 4rem;
    }
    @media (max-width: 850px) {
      .sale-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }
    @media (max-width: 560px) {
      .sale-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.5rem;
      }
    }
  `,
})
export class FlashSalePage {
  private readonly response = inject(RESPONSE_INIT, { optional: true });
  private readonly meta = inject(PageMetadata);
  private readonly api = inject(PublicApi);
  readonly clock = inject(PublicClock);
  readonly sale = signal<FlashSale | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly countdown = countdown;
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
    this.api.sale().subscribe({
      next: (s) => {
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
