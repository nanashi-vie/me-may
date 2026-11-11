import { inject, Injectable, InjectionToken } from '@angular/core';
import { XhrFactory } from '@angular/common';
import { HttpClient, HttpEvent, HttpParams, HttpXhrBackend } from '@angular/common/http';
import { Observable, switchMap, catchError, defer, throwError } from 'rxjs';
import { PublicApi } from '../../features/catalogue/public-api';
import { tap } from 'rxjs';
import { AuthService, CsrfResponse } from './auth.service';
export const ADMIN_UPLOAD_HTTP = new InjectionToken<HttpClient>('Admin upload XHR', {
  providedIn: 'root',
  factory: () => new HttpClient(new HttpXhrBackend(inject(XhrFactory))),
});
@Injectable({ providedIn: 'root' })
export class AdminHttp {
  private readonly http = inject(HttpClient);
  private readonly publicApi = inject(PublicApi);
  private readonly auth=inject(AuthService);
  private guarded<T>(source:Observable<T>):Observable<T> {
    return defer(()=>{const epoch=this.auth.epoch();return source.pipe(catchError(error=>{
      if(error.status===401 && epoch===this.auth.epoch())this.auth.invalidateSession();
      return throwError(()=>error);
    }));});
  }
  private readonly uploadHttp = inject(ADMIN_UPLOAD_HTTP);
  private readonly options = { withCredentials: true, transferCache: false } as const;
  get<T>(path: string, params?: HttpParams): Observable<T> {
    return this.guarded(this.http.get<T>('/api/v1/admin' + path, { ...this.options, params }));
  }
  download(path:string,params?:HttpParams):Observable<Blob> {
    return this.guarded(this.http.get('/api/v1/admin'+path,{...this.options,params,responseType:'blob'}));
  }
  downloadResponse(path: string, params: HttpParams) {
    return this.guarded(this.http.get('/api/v1/admin' + path, {
      ...this.options, params, responseType: 'blob', observe: 'response',
    }));
  }
  mutate<T>(
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
  ): Observable<T> {
    return this.guarded(this.withCsrf((csrf) =>
        this.http.request<T>(method, '/api/v1/admin' + path, {
          ...this.options,
          body,
          headers: { [csrf.headerName]: csrf.token },
        }),
    ).pipe(tap(() => this.publicApi.invalidateMetadata())));
  }
  upload<T>(path: string, body: FormData): Observable<HttpEvent<T>> {
    return this.guarded(this.withCsrf((csrf) =>
        this.uploadHttp.post<T>('/api/v1/admin' + path, body, {
          ...this.options,
          headers: { [csrf.headerName]: csrf.token },
          observe: 'events',
          reportProgress: true,
        }),
    ));
  }
  private withCsrf<T>(send: (csrf: CsrfResponse) => Observable<T>): Observable<T> {
    return defer(() => {
      const epoch = this.auth.epoch();
      return this.auth.csrf().pipe(switchMap(csrf => send(csrf).pipe(
        catchError(error => {
          if (epoch === this.auth.epoch() && error.status === 403 && error.error?.error === 'csrf_invalid')
            return this.auth.refreshCsrf(csrf).pipe(switchMap(send));
          return throwError(() => error);
        }),
      )));
    });
  }
}
