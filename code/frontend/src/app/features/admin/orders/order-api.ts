import { inject, Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { AdminHttp } from '../../../core/auth/admin-http';
import {
  CatalogCandidate,
  ItemWrite,
  MatchResult,
  MutationResult,
  OrderAction,
  OrderDetail,
  OrderFilter,
  OrderStats,
  OrderSummary,
  Page,
  PaymentWrite,
  ReasonRequest,
} from './order-models';
@Injectable({ providedIn: 'root' })
export class OrderApi {
  private readonly http = inject(AdminHttp);
  list(f: OrderFilter) {
    return this.http.get<Page<OrderSummary>>('/orders', this.params(f));
  }
  stats(f: OrderFilter) {
    return this.http.get<OrderStats>('/orders/stats', this.params(f));
  }
  detail(id: string) {
    return this.http.get<OrderDetail>(this.path(id));
  }
  catalog(q: string, page = 0, size = 20) {
    return this.http.get<Page<CatalogCandidate>>(
      '/orders/catalog',
      new HttpParams({ fromObject: { q, page, size } }),
    );
  }
  /** Lot names last used on outside books, newest first. */
  lots() {
    return this.http.get<string[]>('/orders/lots');
  }
  matches(title: string) {
    return this.http.get<MatchResult>(
      '/orders/catalog-match',
      new HttpParams().set('title', title),
    );
  }
  create(body: { customerId: string; fulfillmentType?: string; requestId: string }) {
    return this.send('POST', '/orders', body);
  }
  update(id: string, body: object) {
    return this.send('PUT', this.path(id), body);
  }
  addItem(id: string, body: ItemWrite) {
    return this.send('POST', this.path(id) + '/items', body);
  }
  updateItem(id: string, itemId: string, body: ItemWrite) {
    return this.send('PATCH', this.path(id) + '/items/' + encodeURIComponent(itemId), body);
  }
  removeItem(id: string, itemId: string, body: ReasonRequest) {
    return this.send('DELETE', this.path(id) + '/items/' + encodeURIComponent(itemId), body);
  }
  command(id: string, action: OrderAction, body: object) {
    return this.send(action === 'shipping' ? 'PATCH' : 'POST', this.path(id) + '/' + action, body);
  }
  /** One multipart request: the JSON command and its transfer receipt, if there is one. */
  recordPayment(id: string, body: PaymentWrite, proof: File | null) {
    const form = new FormData();
    form.append('payment', new Blob([JSON.stringify(body)], { type: 'application/json' }));
    if (proof) form.append('proof', proof);
    return this.http.mutate<MutationResult>('POST', this.path(id) + '/payments', form);
  }
  proofUrl(id: string, paymentId: string) {
    return '/api/v1/admin' + this.path(id) + '/payments/' + encodeURIComponent(paymentId) + '/proof';
  }
  voidPayment(id: string, paymentId: string, body: ReasonRequest) {
    return this.send(
      'POST',
      this.path(id) + '/payments/' + encodeURIComponent(paymentId) + '/void',
      body,
    );
  }
  private send(method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body: object) {
    const frozen = JSON.parse(JSON.stringify(body));
    return this.http.mutate<MutationResult>(method, path, frozen);
  }
  private path(id: string) {
    return '/orders/' + encodeURIComponent(id);
  }
  private params(f: OrderFilter) {
    let p = new HttpParams();
    for (const [key, value] of Object.entries(f))
      if (value !== undefined && value !== null && value !== '') p = p.set(key, String(value));
    return p;
  }
}
