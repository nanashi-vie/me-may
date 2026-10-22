import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, of, switchMap, tap, throwError } from 'rxjs';

export interface CurrentAdmin { id: number; email: string; role: 'OWNER' | 'STAFF'; }
interface CsrfResponse { headerName: string; token: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platform = inject(PLATFORM_ID);
  private readonly currentUser = signal<CurrentAdmin | null>(null);
  readonly user = this.currentUser.asReadonly();
  private readonly options = { withCredentials: true, transferCache: false } as const;

  refresh() {
    if (!isPlatformBrowser(this.platform)) return of(null);
    return this.http.get<CurrentAdmin>('/api/v1/auth/me', this.options).pipe(
      tap(user => this.currentUser.set(user)),
      catchError((error: HttpErrorResponse) => {
        this.currentUser.set(null);
        return error.status === 401 ? of(null) : throwError(() => error);
      }),
    );
  }

  login(email: string, password: string) {
    return this.csrf().pipe(switchMap(csrf => this.http.post<CurrentAdmin>(
      '/api/v1/auth/login', new HttpParams().set('username', email).set('password', password),
      { ...this.options, headers: { [csrf.headerName]: csrf.token } },
    )), tap(user => this.currentUser.set(user)));
  }

  logout() {
    return this.csrf().pipe(switchMap(csrf => this.http.post<void>(
      '/api/v1/auth/logout', null,
      { ...this.options, headers: { [csrf.headerName]: csrf.token } },
    )), tap(() => this.currentUser.set(null)));
  }

  private csrf() {
    return this.http.get<CsrfResponse>('/api/v1/auth/csrf', this.options);
  }
}
