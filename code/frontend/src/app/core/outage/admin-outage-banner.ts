import { Component, computed, inject, signal } from '@angular/core';
import { BackendStatus } from './backend-status';

/** Sticky admin notice; never covers tables or forms. */
@Component({
  selector: 'app-admin-outage-banner',
  template: `
    @if (outage(); as o) {
      <div class="admin-outage" role="alert">
        <span class="dot" aria-hidden="true"></span>
        <span>
          <b>Máy chủ không phản hồi từ {{ time() }} ({{ o.code ? 'mã ' + o.code : 'mất kết nối' }})</b>
          — thay đổi chưa lưu sẽ không gửi được. Trang tự kết nối lại.
        </span>
        <button type="button" (click)="retry()">{{ checking() ? 'Đang kiểm tra…' : 'Thử lại' }}</button>
      </div>
    }
  `,
  styles: `
    .admin-outage {
      position: sticky;
      top: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 20px;
      background: #fef3f2;
      border-bottom: 1px solid #fecdca;
      color: #912018;
      font-family: var(--font-sans);
      font-size: 14px;
    }
    .dot { width: 10px; height: 10px; border-radius: 50%; background: #d92d20; flex: none; }
    @media (prefers-reduced-motion: no-preference) {
      .dot { animation: pulse 1.6s ease-in-out infinite; }
    }
    @keyframes pulse { 50% { opacity: 0.35; } }
    b { font-weight: 800; }
    button {
      margin-left: auto;
      font: inherit;
      font-weight: 700;
      color: #912018;
      background: #fff;
      border: 1px solid #fda29b;
      border-radius: 6px;
      padding: 4px 12px;
      cursor: pointer;
      white-space: nowrap;
    }
  `,
})
export class AdminOutageBanner {
  private readonly status = inject(BackendStatus);
  protected readonly outage = this.status.outage;
  protected readonly checking = signal(false);
  protected readonly time = computed(() => {
    const since = this.outage()?.since;
    return since
      ? new Date(since).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })
      : '';
  });

  protected retry() {
    this.checking.set(true);
    this.status.check();
    setTimeout(() => this.checking.set(false), 1500);
  }
}
