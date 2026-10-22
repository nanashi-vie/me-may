import { inject, Injectable } from '@angular/core';
import { AdminHttp } from '../../../core/auth/admin-http';
export interface CollectionUpdate {name:string;sortOrder:number;active:boolean}
export interface CollectionCreate extends CollectionUpdate {slug:string}
export interface CollectionDto extends CollectionCreate {id:string;version:number;createdAt:string;updatedAt:string}
@Injectable({providedIn:'root'})
export class CollectionApi {
 private readonly http=inject(AdminHttp);
 list(){return this.http.get<CollectionDto[]>('/collections');}
 create(body:CollectionCreate){return this.http.mutate<CollectionDto>('POST','/collections',body);}
 update(id:string,version:number,body:CollectionUpdate){return this.http.mutate<CollectionDto>('PUT',`/collections/${id}`,{...body,version});}
}
