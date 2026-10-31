import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting,HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { BookImport } from './book-import';
import { BookImportApi } from './book-import-api';
describe('BookImport login with real auth epochs',()=>{
  const owner={id:1,email:'owner@qa.test',role:'OWNER'};
  beforeEach(()=>TestBed.configureTestingModule({providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting(),
    {provide:BookImportApi,useValue:{options:()=>of({taxonomy:{categories:[],ageGroups:[],bindings:[],readingLevels:[]},collections:[]})}}]}));
  afterEach(()=>TestBed.inject(HttpTestingController).verify());
  function setup(){
    const auth=TestBed.inject(AuthService),http=TestBed.inject(HttpTestingController);auth.refresh().subscribe();http.expectOne('/api/v1/auth/me').flush(owner);
    const f=TestBed.createComponent(BookImport);f.detectChanges();const c=f.componentInstance;const file=new File(['csv'],'books.csv');c.select(file);
    auth.invalidateSession();c.needsLogin.set(true);f.detectChanges();c.loginForm.setValue({email:owner.email,password:'qa-password'});
    return {auth,http,f,c,file};
  }
  it('keeps login locked through its own epoch invalidation and recovers the selected file',()=>{
    const {http,f,c,file}=setup();c.loginAgain();http.expectOne('/api/v1/auth/csrf').flush({headerName:'X-CSRF-TOKEN',token:'qa'});
    const login=http.expectOne('/api/v1/auth/login');f.detectChanges();expect(f.nativeElement.querySelector('button[type=submit]').disabled).toBe(true);
    c.loginAgain();http.expectNone('/api/v1/auth/csrf');login.flush(owner);f.detectChanges();
    expect(c.needsLogin()).toBe(false);expect(c.selectedFile()).toBe(file);expect(c.canConfirm()).toBe(false);
  });
  it('a superseded success cannot hide recovery after the latest login fails',()=>{
    const {auth,http,f,c,file}=setup();c.loginAgain();http.expectOne('/api/v1/auth/csrf').flush({headerName:'X-CSRF-TOKEN',token:'qa'});
    const old=http.expectOne('/api/v1/auth/login');
    auth.login('other@qa.test','other').subscribe({error:()=>{}});http.expectOne('/api/v1/auth/csrf').flush({headerName:'X-CSRF-TOKEN',token:'qa'});
    const latest=http.expectOne('/api/v1/auth/login');old.flush(owner);latest.flush({}, {status:401,statusText:'Unauthorized'});f.detectChanges();
    expect(auth.user()).toBeNull();expect(c.needsLogin()).toBe(true);expect(c.selectedFile()).toBe(file);
    expect(f.nativeElement.querySelector('input[formControlName="password"]')).not.toBeNull();
  });
});
