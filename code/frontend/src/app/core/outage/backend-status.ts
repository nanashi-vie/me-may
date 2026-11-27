import { isPlatformBrowser } from '@angular/common';
import {
  HttpClient,
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import {
  DestroyRef,
  Injectable,
  PLATFORM_ID,
  TransferState,
  inject,
  makeStateKey,
  signal,
} from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { PUBLIC_API_ORIGIN } from '../../features/catalogue/public-api';

/** Cloudflare/gateway answers that mean the Dell origin itself is unreachable. */
const ORIGIN_DOWN = new Set([502, 504, 520, 521, 522, 523, 524, 530]);
export const OUTAGE_POLL_MS = 30000;
const OUTAGE_STATE = makeStateKey<{ since: number; code: number }>('memay-outage');

export interface Outage {
  since: number;
  /** Upstream HTTP status, or 0 when the request never got an answer. */
  code: number;
}

/** Only origin-unreachable answers count; app errors (500, other 503s) stay local. */
export function outageCode(error: unknown): number | null {
  if (!(error instanceof HttpErrorResponse)) return null;
  if (ORIGIN_DOWN.has(error.status)) return error.status;
  if (error.status === 503 && error.error?.error === 'backend_unavailable')
    return typeof error.error.upstreamStatus === 'number' ? error.error.upstreamStatus : 503;
  if (error.status === 0) return 0;
  return null;
}

@Injectable({ providedIn: 'root' })
export class BackendStatus {
  private readonly http = inject(HttpClient);
  private readonly apiOrigin = inject(PUBLIC_API_ORIGIN);
  private readonly state = inject(TransferState);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly current = signal<Outage | null>(this.state.get(OUTAGE_STATE, null));
  readonly outage = this.current.asReadonly();
  /** Public pages reload once the origin answers; admin pages just hide the banner. */
  reloadOnRecovery = false;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopPolling());
    if (this.current()) this.startPolling();
  }

  report(code: number) {
    // A visitor who lost their own connection is not a shop outage.
    if (code === 0 && this.browser && globalThis.navigator?.onLine === false) return;
    if (this.current()) return;
    const outage = { since: Date.now(), code };
    this.current.set(outage);
    if (!this.browser) this.state.set(OUTAGE_STATE, outage);
    this.startPolling();
  }

  /** Lightweight public endpoint; success means the origin is back. */
  check() {
    this.http
      .get(this.apiOrigin + '/api/v1/cache-policy', { transferCache: false, timeout: 10000 })
      .subscribe({ next: () => this.recover(), error: () => {} });
  }

  private recover() {
    if (!this.current()) return;
    this.stopPolling();
    if (this.reloadOnRecovery) {
      globalThis.location?.reload();
      return;
    }
    this.current.set(null);
  }

  private startPolling() {
    if (!this.browser || this.timer) return;
    this.timer = setInterval(() => this.check(), OUTAGE_POLL_MS);
  }

  private stopPolling() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

export const outageInterceptor: HttpInterceptorFn = (request, next) => {
  const status = inject(BackendStatus);
  return next(request).pipe(
    catchError((error) => {
      const code = outageCode(error);
      if (code !== null) status.report(code);
      return throwError(() => error);
    }),
  );
};
