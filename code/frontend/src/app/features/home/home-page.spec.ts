import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { HomePage } from './home-page';
import { PublicApi } from '../catalogue/public-api';

describe('HomePage banner info boxes', () => {
  function setup(groupUrl = 'https://zalo.me/g/test-group') {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: PublicApi,
          useValue: {
            home: () => of({ shelves: [] }),
            sale: () => of({ serverNow: new Date().toISOString(), endsAt: null, items: [] }),
            contact: () => of({ hotlineUrl: 'https://zalo.me/0966075005', groupUrl }),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('renders all 4 banner info boxes beneath hero section', () => {
    const { fixture } = setup();
    const el = fixture.nativeElement as HTMLElement;
    const section = el.querySelector('.banner-info-boxes');
    expect(section).toBeTruthy();

    const items = el.querySelectorAll('.info-box-item');
    expect(items.length).toBe(4);

    const titles = Array.from(el.querySelectorAll('.box-title')).map((t) => t.textContent?.replace(/\s+/g, ' ').trim());
    expect(titles).toContain('ƯU ĐÃI VẬN CHUYỂN');
    expect(titles).toContain('CÁCH HỎI MUA SÁCH');
    expect(titles).toContain('CỘNG ĐỒNG MẸ MÂY');
    expect(titles).toContain('HOTLINE:');
  });

  it('binds Zalo group link from contact config to Community box', () => {
    const { fixture } = setup('https://zalo.me/g/memaycommunity');
    const el = fixture.nativeElement as HTMLElement;
    const communityLink = el.querySelector('a.info-box-item[aria-label="Cộng đồng Mẹ Mây trên Zalo"]') as HTMLAnchorElement;
    expect(communityLink).toBeTruthy();
    expect(communityLink.href).toBe('https://zalo.me/g/memaycommunity');
    expect(communityLink.target).toBe('_blank');
    expect(communityLink.rel).toContain('noopener');
  });

  it('renders both hotline numbers with direct tel: links', () => {
    const { fixture } = setup();
    const el = fixture.nativeElement as HTMLElement;
    const telLinks = el.querySelectorAll('.hotline-numbers .hotline-link');
    expect(telLinks.length).toBe(2);

    const link1 = telLinks[0] as HTMLAnchorElement;
    const link2 = telLinks[1] as HTMLAnchorElement;

    expect(link1.getAttribute('href')).toBe('tel:0966075005');
    expect(link1.textContent?.trim()).toBe('0966 075 005');

    expect(link2.getAttribute('href')).toBe('tel:0703260005');
    expect(link2.textContent?.trim()).toBe('0703 260 005');
  });

  it('opens how-to-buy dialog when clicking "Cách hỏi mua sách" box', () => {
    const { fixture, component } = setup();
    const el = fixture.nativeElement as HTMLElement;
    const button = el.querySelector('button.info-box-item[aria-label="Cách hỏi mua sách"]') as HTMLButtonElement;
    expect(button).toBeTruthy();

    expect(component.howToBuyDialog).toBeTruthy();
    const openSpy = vi.spyOn(component.howToBuyDialog!, 'open');

    button.click();
    expect(openSpy).toHaveBeenCalledWith(button);
  });
});

