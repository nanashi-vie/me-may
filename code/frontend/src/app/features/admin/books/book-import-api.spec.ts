import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { BookImportApi } from './book-import-api';
import { AuthService } from '../../../core/auth/auth.service';
describe('BookImportApi transport',()=>{
  beforeEach(()=>TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting(),{provide:AuthService,useValue:{epoch:signal(0),invalidateSession:vi.fn()}}]}));
  afterEach(()=>TestBed.inject(HttpTestingController).verify());
  it('sends exact selected file and fingerprint using authenticated CSRF multipart',()=>{
    const api=TestBed.inject(BookImportApi),http=TestBed.inject(HttpTestingController),file=new File(['csv'],'books.csv');
    api.confirm(file,'digest').subscribe();http.expectOne('/api/v1/auth/csrf').flush({headerName:'X-CSRF-TOKEN',token:'qa'});
    const request=http.expectOne('/api/v1/admin/book-imports/confirm');expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.get('X-CSRF-TOKEN')).toBe('qa');expect(request.request.headers.has('Content-Type')).toBe(false);
    expect(request.request.body.get('file')).toBe(file);expect(request.request.body.get('fingerprint')).toBe('digest');request.flush({});
  });
  it('downloads templates as private blobs without treating bytes as JSON',()=>{
    TestBed.inject(BookImportApi).template('xlsx').subscribe(value=>expect(value).toBeInstanceOf(Blob));
    const request=TestBed.inject(HttpTestingController).expectOne('/api/v1/admin/book-imports/templates?format=xlsx');
    expect(request.request.responseType).toBe('blob');expect(request.request.withCredentials).toBe(true);request.flush(new Blob(['xlsx']));
  });
});
