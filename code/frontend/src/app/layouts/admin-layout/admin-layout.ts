import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { PageMetadata } from '../../core/page-metadata';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterLink, RouterOutlet],
  templateUrl: './admin-layout.html',
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
