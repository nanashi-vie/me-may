import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';
import { outageCode } from '../outage/backend-status';

export function adminGuard(_destination?: string) {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.refresh().pipe(
    map(user => user ? true : router.parseUrl('/admin/dang-nhap')),
    // Server down is not a logout: stay put and let the outage banner explain.
    catchError(error => of(outageCode(error) !== null ? true : router.parseUrl('/admin/dang-nhap'))),
  );
}
export const requireAdmin: CanActivateFn = () => adminGuard();
