import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { PageMetadata } from '../core/page-metadata';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterLink, RouterOutlet],
  template: `<div class="admin-shell">
    <aside>
      <a class="brand" routerLink="/admin">Mẹ Mây</a>
      <nav aria-label="Quản trị">
        <a routerLink="/admin">Tổng quan</a><a routerLink="/admin/sach">Sách</a>
        @if (auth.user()?.role === 'OWNER') {
          <a routerLink="/admin/bo-suu-tap">Bộ sưu tập</a
          ><a routerLink="/admin/flash-sale">Flash Sale</a>
        }
        <a routerLink="/">Xem website</a>
      </nav>
    </aside>
    <div>
      <header class="admin-header">
        <span>{{ auth.user()?.email }} · {{ auth.user()?.role }}</span
        ><button class="secondary" (click)="logout()" [disabled]="busy()">Đăng xuất</button>
      </header>
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
      <main class="admin-content"><router-outlet /></main>
    </div>
  </div>`,
})
export class AdminLayout {
  constructor() {
    inject(PageMetadata).admin('Quản trị | Mẹ Mây');
  }
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly busy = signal(false);
  readonly error = signal('');
  logout() {
    this.busy.set(true);
    this.auth.logout().subscribe({
      next: () => {
        this.busy.set(false);
        void this.router.navigateByUrl('/admin/dang-nhap');
      },
      error: () => {
        this.busy.set(false);
        this.error.set('Chưa đăng xuất được. Vui lòng thử lại.');
      },
    });
  }
}
