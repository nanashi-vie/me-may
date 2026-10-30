import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, of, switchMap, tap, throwError, map } from 'rxjs';

export interface CurrentAdmin { id: number; email: string; role: 'OWNER' | 'STAFF'; }
interface CsrfResponse { headerName: string; token: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platform = inject(PLATFORM_ID);
  private readonly currentUser = signal<CurrentAdmin | null>(null);
  readonly user = this.currentUser.asReadonly();
  private readonly sessionEpoch=signal(0);
  readonly epoch=this.sessionEpoch.asReadonly();
  invalidateSession() {this.currentUser.set(null);this.sessionEpoch.update(value=>value+1);}
  private accept(user:CurrentAdmin) {
    const before=this.currentUser();
    if(before?.id!==user.id || before?.role!==user.role)this.sessionEpoch.update(value=>value+1);
    this.currentUser.set(user);
  }
  private readonly options = { withCredentials: true, transferCache: false } as const;

  refresh() {
    if (!isPlatformBrowser(this.platform)) return of(null);
    const epoch=this.epoch();
    return this.http.get<CurrentAdmin>('/api/v1/auth/me', this.options).pipe(
      map(user => {if(epoch!==this.epoch())return this.currentUser();this.accept(user);return user;}),
      catchError((error: HttpErrorResponse) => {
        if(epoch===this.epoch())this.invalidateSession();
        return error.status === 401 ? of(null) : throwError(() => error);
      }),
    );
  }

  login(email: string, password: string) {
    this.invalidateSession();
    const epoch=this.epoch();
    return this.csrf().pipe(switchMap(csrf => this.http.post<CurrentAdmin>(
      '/api/v1/auth/login', new HttpParams().set('username', email).set('password', password),
      { ...this.options, headers: { [csrf.headerName]: csrf.token } },
    )), tap(user => {if(epoch===this.epoch())this.accept(user);}));
  }

  logout() {
    this.invalidateSession();
    return this.csrf().pipe(switchMap(csrf => this.http.post<void>(
      '/api/v1/auth/logout', null,
      { ...this.options, headers: { [csrf.headerName]: csrf.token } },
    )));
  }

  private csrf() {
    return this.http.get<CsrfResponse>('/api/v1/auth/csrf', this.options);
  }
}
