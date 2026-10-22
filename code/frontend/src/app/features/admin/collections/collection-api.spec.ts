import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting,HttpTestingController } from '@angular/common/http/testing';
import { CollectionApi } from './collection-api';
describe('CollectionApi',()=>{
 it('updates editable fields and version only',()=>{TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});const api=TestBed.inject(CollectionApi),http=TestBed.inject(HttpTestingController);api.update('4',3,{name:'A',sortOrder:1,active:false}).subscribe();http.expectOne('/api/v1/auth/csrf').flush({token:'t',headerName:'X-CSRF-TOKEN'});const r=http.expectOne('/api/v1/admin/collections/4');expect(r.request.body).toEqual({version:3,name:'A',sortOrder:1,active:false});r.flush({});http.verify();});
});
