import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService session boundary', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('gets CSRF before login, encodes the password, and stores only the returned user in memory', () => {
    auth.login('owner@test.local', 'a&b= c').subscribe();
    http.expectOne('/api/v1/auth/csrf').flush({headerName: 'X-CSRF-TOKEN', token: 'csrf-1'});
    const req = http.expectOne('/api/v1/auth/login');
    expect(req.request.headers.get('X-CSRF-TOKEN')).toBe('csrf-1');
    const posted = new URLSearchParams(req.request.body.toString());
    expect(posted.get('username')).toBe('owner@test.local');
    expect(posted.get('password')).toBe('a&b= c');
    req.flush({id: 1, email: 'owner@test.local', role: 'OWNER'});
    expect(auth.user()?.role).toBe('OWNER');
  });

  it('never creates an authenticated state when login fails', () => {
    auth.login('owner@test.local', 'wrong').subscribe({error: () => {}});
    http.expectOne('/api/v1/auth/csrf').flush({headerName: 'X-CSRF-TOKEN', token: 'csrf-1'});
    http.expectOne('/api/v1/auth/login').flush({error: 'invalid_credentials'}, {status: 401, statusText: 'Unauthorized'});
    expect(auth.user()).toBeNull();
  });

  it('clears a stale user when the server rejects a session', () => {
    auth.refresh().subscribe();
    http.expectOne('/api/v1/auth/me').flush({id: 2, email: 'staff@test.local', role: 'STAFF'});
    expect(auth.user()?.role).toBe('STAFF');
    auth.refresh().subscribe();
    http.expectOne('/api/v1/auth/me').flush({}, {status: 401, statusText: 'Unauthorized'});
    expect(auth.user()).toBeNull();
  });

  it('gets a fresh CSRF token before logout, then clears user state', () => {
    auth.refresh().subscribe();
    http.expectOne('/api/v1/auth/me').flush({id: 2, email: 'staff@test.local', role: 'STAFF'});
    auth.logout().subscribe();
    http.expectOne('/api/v1/auth/csrf').flush({headerName: 'X-CSRF-TOKEN', token: 'csrf-after-login'});
    const req = http.expectOne('/api/v1/auth/logout');
    expect(req.request.headers.get('X-CSRF-TOKEN')).toBe('csrf-after-login');
    req.flush(null);
    expect(auth.user()).toBeNull();
  });
  it('does not emit an old authenticated response after session invalidation',()=>{
    const values:any[]=[];auth.refresh().subscribe(v=>values.push(v));const old=http.expectOne('/api/v1/auth/me');
    auth.invalidateSession();old.flush({id:9,email:'old@test.local',role:'OWNER'});
    expect(auth.user()).toBeNull();expect(values).toEqual([null]);
  });
});
