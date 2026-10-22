import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AdminHttp, ADMIN_UPLOAD_HTTP } from './admin-http';
describe('AdminHttp', () => {
 let api: AdminHttp; let http: HttpTestingController;
 beforeEach(() => { TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting(),{provide:ADMIN_UPLOAD_HTTP,useExisting:HttpClient}]});api=TestBed.inject(AdminHttp);http=TestBed.inject(HttpTestingController); });
 afterEach(()=>http.verify());
 it('uses credentials and excludes SSR transfer cache',()=>{api.get('/books').subscribe();const r=http.expectOne('/api/v1/admin/books');expect(r.request.withCredentials).toBe(true);expect(r.request.transferCache).toBe(false);r.flush({});});
 it('fetches a fresh token for each mutation and propagates 401 without retry',()=>{let failures=0;api.mutate('POST','/books',{}).subscribe({error:()=>failures++});const csrf=http.expectOne('/api/v1/auth/csrf');csrf.flush({token:'new',headerName:'X-CSRF-TOKEN'});const r=http.expectOne('/api/v1/admin/books');expect(r.request.headers.get('X-CSRF-TOKEN')).toBe('new');r.flush({error:'unauthorized'},{status:401,statusText:'Unauthorized'});expect(failures).toBe(1);http.expectNone('/api/v1/auth/csrf');http.expectNone('/api/v1/admin/books');});
 it('uses multipart progress without setting Content-Type',()=>{const data=new FormData();data.set('version','0');api.upload('/books/1/media/FRONT',data).subscribe();http.expectOne('/api/v1/auth/csrf').flush({token:'t',headerName:'X-CSRF-TOKEN'});const r=http.expectOne('/api/v1/admin/books/1/media/FRONT');expect(r.request.body).toBe(data);expect(r.request.headers.has('Content-Type')).toBe(false);expect(r.request.reportProgress).toBe(true);expect(r.request.withCredentials).toBe(true);r.flush({});});
});
