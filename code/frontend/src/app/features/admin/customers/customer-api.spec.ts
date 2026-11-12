import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting,HttpTestingController} from '@angular/common/http/testing';
import {CustomerApi} from './customer-api';
describe('Customer API',()=>{
 function setup(){TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});return {api:TestBed.inject(CustomerApi),http:TestBed.inject(HttpTestingController)};}
 it('sends version and csrf and preserves duplicate conflicts',()=>{
  const {api,http}=setup();let error:any;
  const body={fullName:'Lan',phone:null,defaultAddress:null,zaloName:null,tiktokId:null,threadsId:'@lan',note:null};
  api.update('4',3,body).subscribe({error:e=>error=e});
  http.expectOne('/api/v1/auth/csrf').flush({token:'t',headerName:'X-CSRF-TOKEN'});
  const r=http.expectOne('/api/v1/admin/customers/4');expect(r.request.method).toBe('PUT');expect(r.request.body).toEqual({...body,version:3});expect(r.request.withCredentials).toBe(true);expect(r.request.transferCache).toBe(false);expect(r.request.headers.get('X-CSRF-TOKEN')).toBe('t');
  r.flush({error:'CUSTOMER_PHONE_DUPLICATE',duplicates:{items:[],page:0,size:20,totalElements:1,totalPages:1}},{status:409,statusText:'Conflict'});
  expect(error.error.duplicates.totalElements).toBe(1);http.verify();
 });
 it('encodes plus-phone query and does not retry failed creates',()=>{
  const {api,http}=setup();api.duplicates('+84987123456','4',1,20).subscribe();
  const r=http.expectOne(r=>r.url.endsWith('/customers/duplicates'));expect(r.request.params.get('phone')).toBe('+84987123456');expect(r.request.params.get('excludeId')).toBe('4');r.flush({items:[]});
  api.create({fullName:'Lan',phone:null,defaultAddress:null,zaloName:null,tiktokId:null,threadsId:null,note:null}).subscribe({error:()=>{}});
  http.expectOne('/api/v1/auth/csrf').flush({token:'t',headerName:'X-CSRF-TOKEN'});
  http.expectOne('/api/v1/admin/customers').flush({},{status:500,statusText:'Error'});http.expectNone('/api/v1/admin/customers');http.verify();
 });
});
