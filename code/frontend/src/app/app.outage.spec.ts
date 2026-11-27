import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { App } from './app';
import { BackendStatus } from './core/outage/backend-status';

@Component({ template: '<p class="page">page</p>' })
class Page {}

describe('app outage view', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '', component: Page }, { path: 'admin/sach', component: Page }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }),
  );

  it('replaces public pages with the outage page', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.page')).not.toBeNull();
    TestBed.inject(BackendStatus).report(530);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-outage-page')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.page')).toBeNull();
  });

  it('keeps admin pages and shows the banner on top', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/admin/sach');
    TestBed.inject(BackendStatus).report(530);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('app-outage-page')).toBeNull();
    expect(root.querySelector('.page')).not.toBeNull();
    expect(root.querySelector('.admin-outage')?.textContent).toContain('(mã 530)');
    expect(root.querySelector('.admin-outage')?.textContent).toContain('thay đổi chưa lưu sẽ không gửi được');
  });
});
