import {inject,Injectable} from '@angular/core';
import {HttpParams} from '@angular/common/http';
import {AdminHttp} from '../../../core/auth/admin-http';
import {CustomerDetail,CustomerSummary,CustomerMutation,CustomerStatus,CustomerFilter,DuplicateSummary,Page} from './customer-models';
@Injectable({providedIn:'root'})
export class CustomerApi {
 private readonly http=inject(AdminHttp);
 list(filter:CustomerFilter){return this.http.get<Page<CustomerSummary>>('/customers',new HttpParams({fromObject:{...filter}}));}
 detail(id:string){return this.http.get<CustomerDetail>(`/customers/${encodeURIComponent(id)}`);}
 duplicates(phone:string,excludeId?:string,page=0,size=20){let params=new HttpParams().set('phone',phone).set('page',page).set('size',size);if(excludeId)params=params.set('excludeId',excludeId);return this.http.get<Page<DuplicateSummary>>('/customers/duplicates',params);}
 create(body:CustomerMutation){return this.http.mutate<CustomerDetail>('POST','/customers',body);}
 update(id:string,version:number,body:CustomerMutation){return this.http.mutate<CustomerDetail>('PUT',`/customers/${encodeURIComponent(id)}`,{...body,version});}
 setStatus(id:string,version:number,status:CustomerStatus){return this.http.mutate<CustomerDetail>('PATCH',`/customers/${encodeURIComponent(id)}/status`,{status,version});}
}
