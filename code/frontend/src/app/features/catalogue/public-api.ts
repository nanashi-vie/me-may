import { DOCUMENT, isPlatformServer } from '@angular/common';
import { inject, Injectable, InjectionToken, TransferState, makeStateKey, PLATFORM_ID } from '@angular/core';
import { Observable, tap, map, of, defer, shareReplay } from 'rxjs';
import { PublicClock } from './public-clock';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  CatalogueFilter,
  Collection,
  ContactConfig,
  FlashSale,
  HomeData,
  Page,
  PublicBook,
  Taxonomy,
} from './public.models';
export const PUBLIC_API_ORIGIN = new InjectionToken<string>('Public backend origin', {
  providedIn: 'root',
  factory: () => '',
});
export const PUBLIC_SITE_STATE = makeStateKey<string>('memay-public-site-origin');
export const PUBLIC_SITE_ORIGIN = new InjectionToken<string>('Public site origin', {
  providedIn: 'root',
  factory: () =>
    inject(TransferState).get(
      PUBLIC_SITE_STATE,
      inject(DOCUMENT).location?.origin ?? 'http://localhost:4200',
    ),
});
@Injectable({ providedIn: 'root' })
export class PublicApi {
  private readonly http = inject(HttpClient);
  private readonly clock = inject(PublicClock);
  private readonly origin = inject(PUBLIC_API_ORIGIN);
  private readonly state = inject(TransferState);
  private readonly server = isPlatformServer(inject(PLATFORM_ID));
  private readonly metadata = new Map<string, { expires: number; value: Observable<unknown> }>();

  invalidateMetadata() {
    this.metadata.clear();
    for (const path of ['/taxonomy', '/collections', '/contact'])
      this.state.remove(makeStateKey('memay-public:' + path));
  }

  private shared<T>(path: string): Observable<T> {
    const existing = this.metadata.get(path);
    if (existing && existing.expires > Date.now()) return existing.value as Observable<T>;
    const entry = { expires: Infinity, value: of(null) as Observable<unknown> };
    entry.value = this.get<T>(path, undefined, true).pipe(
      tap({
        next: () => entry.expires = Date.now() + 60000,
        error: () => { if (this.metadata.get(path) === entry) this.metadata.delete(path); },
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.metadata.set(path, entry);
    return entry.value as Observable<T>;
  }

  private get<T>(path: string, params?: HttpParams, transfer = false): Observable<T> {
    const key = makeStateKey<{ body: T; serverNow: string | null }>(
      'memay-public:' + path + (params ? '?' + params.toString() : ''));
    return defer(() => {
      if (transfer && !this.server && this.state.hasKey(key)) {
        const entry = this.state.get(key, { body: null as T, serverNow: null });
        this.state.remove(key);
        if (entry.serverNow) this.clock.align(entry.serverNow);
        return of(entry.body);
      }
      return this.request<T>(path, params).pipe(tap(value => {
        if (transfer && this.server) this.state.set(key, {
          body: value,
          serverNow: this.clock.now() ? new Date(this.clock.now()).toISOString() : null,
        });
      }));
    });
  }

  private request<T>(path: string, params?: HttpParams) {
    return this.http
      .get<T>(this.origin + '/api/v1' + path, {
        params,
        transferCache: false,
        credentials: 'omit',
        timeout: 10000,
        observe: 'response',
      })
      .pipe(
        tap((r) => {
          const time = r.headers.get('X-Memay-Server-Time');
          if (time) this.clock.align(time);
        }),
        map((r) => r.body as T),
      );
  }
  books(
    f: CatalogueFilter,
    collection?: string,
  ): Observable<Page<PublicBook> | { collection: Collection; books: Page<PublicBook> }> {
    let params = new HttpParams().set('sort', f.sort).set('page', f.page - 1);
    for (const k of ['q', 'category', 'binding'] as const) if (f[k]) params = params.set(k, f[k]);
    for (const age of f.age) params = params.append('age', age);
    return collection
      ? this.get<{ collection: Collection; books: Page<PublicBook> }>(
          '/collections/' + encodeURIComponent(collection),
          params, true,
        )
      : this.get<Page<PublicBook>>('/books', params, true);
  }
  detail(slug: string) {
    return this.get<PublicBook>('/books/' + encodeURIComponent(slug));
  }
  lookup(codes: string[]) {
    let params = new HttpParams();
    for (const code of codes) params = params.append('code', code);
    return this.get<PublicBook[]>('/books/lookup', params);
  }
  home() {
    return this.get<HomeData>('/home', undefined, true);
  }
  taxonomy() {
    return this.shared<Taxonomy>('/taxonomy');
  }
  collections() {
    return this.shared<Collection[]>('/collections');
  }
  contact() {
    return this.shared<ContactConfig>('/contact');
  }
  sale() {
    return this.get<FlashSale>('/flash-sale');
  }
}
