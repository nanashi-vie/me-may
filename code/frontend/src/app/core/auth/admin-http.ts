import { inject, Injectable, InjectionToken } from '@angular/core';
import { XhrFactory } from '@angular/common';
import { HttpClient, HttpEvent, HttpParams, HttpXhrBackend } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';
export const ADMIN_UPLOAD_HTTP=new InjectionToken<HttpClient>('Admin upload XHR',{providedIn:'root',factory:()=>new HttpClient(new HttpXhrBackend(inject(XhrFactory)))});
@Injectable({providedIn:'root'})
export class AdminHttp {
 private readonly http=inject(HttpClient);
 private readonly uploadHttp=inject(ADMIN_UPLOAD_HTTP);
 private readonly options={withCredentials:true,transferCache:false} as const;
 get<T>(path:string,params?:HttpParams):Observable<T>{return this.http.get<T>('/api/v1/admin'+path,{...this.options,params});}
 mutate<T>(method:'POST'|'PUT'|'PATCH'|'DELETE',path:string,body?:unknown):Observable<T>{return this.csrf().pipe(switchMap(csrf=>this.http.request<T>(method,'/api/v1/admin'+path,{...this.options,body,headers:{[csrf.headerName]:csrf.token}})));}
 upload<T>(path:string,body:FormData):Observable<HttpEvent<T>>{return this.csrf().pipe(switchMap(csrf=>this.uploadHttp.post<T>('/api/v1/admin'+path,body,{...this.options,headers:{[csrf.headerName]:csrf.token},observe:'events',reportProgress:true})));}
 private csrf(){return this.http.get<{headerName:string;token:string}>('/api/v1/auth/csrf',this.options);}
}
