import { DOCUMENT } from '@angular/common';
import {
  Component,
  RESPONSE_INIT,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { PageMetadata } from '../page-metadata';
import { BackendStatus } from './backend-status';

export const SHOP_ZALO_URL = 'https://zalo.me/0703260005';
const THEME_KEY = 'memay.theme.v1';

/** Full-page public notice while the backend origin is unreachable. */
@Component({
  selector: 'app-outage-page',
  host: { '[attr.data-theme]': "dark() ? 'dark' : 'light'" },
  template: `
    <header class="outage-top">
      <img src="/favicon/web-app-manifest-192x192.png" alt="" width="44" height="44" />
      <div><b>Mẹ Mây</b><small>Sách ngoại văn cho bé</small></div>
    </header>
    <main class="outage-main">
      <section class="outage-card" aria-labelledby="outage-title">
        <svg viewBox="40 0 220 130" role="img" aria-label="Đám mây đang ngủ">
          <g class="cloud">
            <path
              d="M88 112c-16 0-24-10-24-21 0-12 10-20 21-20 2-15 14-25 29-25 11 0 20 5 25 14 5-4 11-6 18-6 16 0 28 12 28 27 12 1 21 10 21 21 0 6-3 10-8 10z"
              class="cloud-body"
            />
            <path d="M112 88q6 5 12 0M150 88q6 5 12 0" class="line" stroke-width="3" />
            <circle cx="108" cy="97" r="5" class="cheek" />
            <circle cx="168" cy="97" r="5" class="cheek" />
            <path d="M132 99q5 3 10 0" class="line" stroke-width="2.5" />
          </g>
          <g class="zz">
            <text x="200" y="52" font-size="22">z</text>
            <text x="216" y="34" font-size="28">z</text>
            <text x="236" y="16" font-size="34">Z</text>
          </g>
        </svg>
        <h1 id="outage-title">Tiệm đang tạm nghỉ một chút</h1>
        <p>Hệ thống Mẹ Mây đang được bảo trì. Tiệm sẽ mở lại sớm.</p>
        <a class="outage-cta" [href]="zaloUrl" target="_blank" rel="noopener">Liên hệ với tiệm</a>
        <div class="outage-note" role="status">
          Trang sẽ tự mở lại khi tiệm sẵn sàng ·
          <button class="outage-retry" type="button" (click)="retry()">
            {{ checking() ? 'Đang kiểm tra…' : 'Thử lại ngay' }}
          </button>
        </div>
      </section>
    </main>
  `,
  styleUrl: './outage-page.scss',
})
export class OutagePage {
  protected readonly zaloUrl = SHOP_ZALO_URL;
  protected readonly dark = signal(false);
  protected readonly checking = signal(false);
  private readonly status = inject(BackendStatus);

  constructor() {
    const response = inject(RESPONSE_INIT, { optional: true });
    if (response) {
      response.status = 503;
      const headers = new Headers(response.headers);
      headers.set('Retry-After', '300');
      headers.set('Cache-Control', 'no-store');
      headers.set('X-Memay-No-Cache', 'backend-unavailable');
      response.headers = headers;
    }
    inject(PageMetadata).admin('Tiệm tạm nghỉ | Mẹ Mây');
    this.status.reloadOnRecovery = true;
    const doc = inject(DOCUMENT);
    afterNextRender(() => {
      try {
        this.dark.set(doc.defaultView?.localStorage?.getItem(THEME_KEY) === 'dark');
      } catch {
        /* Storage can be blocked; light theme is fine. */
      }
    });
  }

  protected retry() {
    this.checking.set(true);
    this.status.check();
    setTimeout(() => this.checking.set(false), 1500);
  }
}
