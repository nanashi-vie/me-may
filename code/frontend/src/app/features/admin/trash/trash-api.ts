import { inject, Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { AdminHttp } from '../../../core/auth/admin-http';

export type TrashKind = 'books' | 'customers' | 'orders';
export interface TrashSelection {
  id: string;
  version: number;
}
export interface TrashItem extends TrashSelection {
  code: string;
  name: string | null;
  deletedAt: string;
  expiresAt: string;
}
export interface TrashPageResult {
  items: TrashItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
type RawItem = TrashItem & { bookCode?: string; title?: string | null };

@Injectable({ providedIn: 'root' })
export class TrashApi {
  private readonly http = inject(AdminHttp);
  list(kind: TrashKind, page: number) {
    return this.http
      .get<Omit<TrashPageResult, 'items'> & { items: RawItem[] }>(`/${kind}/trash`, new HttpParams().set('page', page))
      .pipe(
        map((result): TrashPageResult => ({
          ...result,
          items: result.items.map(({ bookCode, title, ...item }) =>
            kind === 'books' ? { ...item, code: bookCode ?? '', name: title ?? null } : item,
          ),
        })),
      );
  }
  selection(kind: TrashKind) {
    return this.http.get<TrashSelection[]>(`/${kind}/trash/selection`);
  }
  change(kind: TrashKind, id: string, version: number, trashed: boolean) {
    return this.http.mutate<void>('PATCH', `/${kind}/${encodeURIComponent(id)}/trash`, { version, trashed });
  }
  purge(kind: TrashKind, items: readonly TrashSelection[]) {
    return kind === 'books'
      ? this.http.mutate<void>('POST', '/books/trash/bulk', { items, permanent: true })
      : this.http.mutate<void>('POST', `/${kind}/trash/purge`, { items });
  }
}
