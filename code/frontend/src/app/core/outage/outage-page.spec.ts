import { TestBed } from '@angular/core/testing';
import { RESPONSE_INIT } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { OutagePage, SHOP_ZALO_URL } from './outage-page';

describe('OutagePage', () => {
  it('tells visitors the shop is paused, links Zalo and answers 503 for crawlers', () => {
    const response: ResponseInit = { status: 200 };
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: RESPONSE_INIT, useValue: response }],
    });
    const fixture = TestBed.createComponent(OutagePage);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('h1')?.textContent).toBe('Tiệm đang tạm nghỉ một chút');
    expect(root.textContent).toContain('Hệ thống Mẹ Mây đang được bảo trì. Tiệm sẽ mở lại sớm.');
    const cta = root.querySelector<HTMLAnchorElement>('a.outage-cta')!;
    expect(cta.textContent?.trim()).toBe('Liên hệ với tiệm');
    expect(cta.getAttribute('href')).toBe(SHOP_ZALO_URL);
    expect(SHOP_ZALO_URL).toBe('https://zalo.me/0703260005');
    expect(root.querySelector('.outage-retry')?.textContent?.trim()).toBe('Thử lại ngay');
    expect(response.status).toBe(503);
    const headers = new Headers(response.headers);
    expect(headers.get('retry-after')).toBe('300');
    expect(headers.get('cache-control')).toBe('no-store');
    expect(TestBed.inject(Title).getTitle()).toBe('Tiệm tạm nghỉ | Mẹ Mây');
    expect(TestBed.inject(Meta).getTag('name="robots"')?.content).toContain('noindex');
  });
});
