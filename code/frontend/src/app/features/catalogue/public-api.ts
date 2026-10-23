import { inject, Injectable, InjectionToken, TransferState, makeStateKey } from '@angular/core';
import { Observable, tap, map } from 'rxjs';
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
  factory: () => inject(TransferState).get(PUBLIC_SITE_STATE, 'http://localhost:4200'),
});
@Injectable({ providedIn: 'root' })
export class PublicApi {
  private readonly http = inject(HttpClient);
  private readonly clock = inject(PublicClock);
  private readonly origin = inject(PUBLIC_API_ORIGIN);
  private get<T>(path: string, params?: HttpParams) {
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
          params,
        )
      : this.get<Page<PublicBook>>('/books', params);
  }
  detail(slug: string) {
    return this.get<PublicBook>('/books/' + encodeURIComponent(slug));
  }
  home() {
    return this.get<HomeData>('/home');
  }
  taxonomy() {
    return this.get<Taxonomy>('/taxonomy');
  }
  collections() {
    return this.get<Collection[]>('/collections');
  }
  contact() {
    return this.get<ContactConfig>('/contact');
  }
  sale() {
    return this.get<FlashSale>('/flash-sale');
  }
}
