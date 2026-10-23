import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';

export function adminGuard(_destination?: string) {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.refresh().pipe(
    map(user => user ? true : router.parseUrl('/admin/dang-nhap')),
    catchError(() => of(router.parseUrl('/admin/dang-nhap'))),
  );
}
export const requireAdmin: CanActivateFn = () => adminGuard();
