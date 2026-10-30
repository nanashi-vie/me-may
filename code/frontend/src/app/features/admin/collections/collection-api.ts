import { inject, Injectable } from '@angular/core';
import { AdminHttp } from '../../../core/auth/admin-http';
import { AdminSessionCache } from '../../../core/auth/admin-session-cache';
import { tap } from 'rxjs';
export interface CollectionUpdate {
  name: string;
  sortOrder: number;
  active: boolean;
}
export interface CollectionCreate extends CollectionUpdate {
  slug: string;
}
export interface CollectionDto extends CollectionCreate {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}
@Injectable({ providedIn: 'root' })
export class CollectionApi {
  private readonly http = inject(AdminHttp);
  private readonly cache=inject(AdminSessionCache);
  list() {
    return this.cache.get('collections',()=>this.http.get<CollectionDto[]>('/collections'),60000);
  }
  refresh(){this.cache.invalidate('collections');return this.list();}
  create(body: CollectionCreate) {
    return this.http.mutate<CollectionDto>('POST', '/collections', body).pipe(tap(()=>this.cache.invalidate('collections')));
  }
  update(id: string, version: number, body: CollectionUpdate) {
    return this.http.mutate<CollectionDto>('PUT', `/collections/${id}`, { ...body, version }).pipe(tap(()=>this.cache.invalidate('collections')));
  }
}
