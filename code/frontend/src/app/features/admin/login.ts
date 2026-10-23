import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { PageMetadata } from '../../core/page-metadata';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login', imports: [ReactiveFormsModule, RouterLink],
  template: `<main class="login-page"><a class="brand" routerLink="/">Mẹ Mây</a>
    <section class="login-panel"><p class="eyebrow">Dành cho chủ tiệm và nhân viên</p><h1>Đăng nhập quản trị</h1>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <fieldset [disabled]="loading()"><legend class="sr-only">Thông tin đăng nhập</legend>
      <label for="email">Email</label><input id="email" type="email" formControlName="email" autocomplete="username" required />
      <label for="password">Mật khẩu</label><input id="password" type="password" formControlName="password" autocomplete="current-password" required />
      <button type="submit" [disabled]="form.invalid || loading()">{{ loading() ? 'Đang đăng nhập…' : 'Đăng nhập' }}</button>
      </fieldset>
      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
    </form></section><a routerLink="/">Về trang chủ</a></main>`,
})
export class Login {
  constructor(){inject(PageMetadata).admin("Đăng nhập quản trị | Mẹ Mây");}
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]], password: ['', Validators.required],
  });

  submit() {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    const {email, password} = this.form.getRawValue();
    this.auth.login(email, password).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false))).subscribe({
      next: () => { this.form.controls.password.reset(); void this.router.navigateByUrl('/admin'); },
      error: (error: HttpErrorResponse) => {
        this.form.controls.password.reset();
        this.error.set(error.status === 401 ? 'Email hoặc mật khẩu không đúng.' : 'Chưa kết nối được hệ thống. Vui lòng thử lại.');
      },
    });
  }
}
