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

  it('renders up to 10 books in shelf carousel and scrolls 1 book per click with disabled edge buttons', () => {
    const books = Array.from({ length: 10 }, (_, i) => ({
      id: String(i + 1),
      bookCode: `MM-0000${String(i + 1).padStart(2, '0')}`,
      slug: `book-${i + 1}`,
      title: `Book ${i + 1}`,
      publisher: null,
      author: null,
      ageGroups: ['AGE_4_6'],
      categoryCode: 'PICTURE_BOOK',
      binding: 'HARDCOVER',
      conditionGrade: null,
      conditionNote: null,
      priceMinVnd: 20000,
      priceMaxVnd: 20000,
      salePriceVnd: null,
      saleEndsAt: null,
      weightG: 200,
      description: null,
      readingLevel: null,
      readingVideoUrl: null,
      availability: 'AVAILABLE' as const,
      media: [],
      collectionSlugs: [],
      features: [],
    }));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: PublicApi,
          useValue: {
            home: () =>
              of({
                shelves: [{ title: 'Sách mới đăng', href: '/sach', books }],
              }),
            sale: () => of({ serverNow: new Date().toISOString(), endsAt: null, items: [] }),
            contact: () => of({ hotlineUrl: null, groupUrl: null }),
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const cards = el.querySelectorAll('.shelf .carousel-item');
    expect(cards.length).toBe(10);

    const prevBtn = el.querySelector('.shelf .carousel-nav.prev') as HTMLButtonElement;
    const nextBtn = el.querySelector('.shelf .carousel-nav.next') as HTMLButtonElement;
    expect(prevBtn).toBeTruthy();
    expect(nextBtn).toBeTruthy();
    expect(prevBtn.disabled).toBe(true);
    expect(nextBtn.disabled).toBe(false);

    const track = el.querySelector('.shelf .shelf-carousel') as HTMLElement;
    const scrollSpy = vi.fn();
    track.scrollBy = scrollSpy;

    nextBtn.click();
    fixture.detectChanges();
    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect(prevBtn.disabled).toBe(false);
    expect(nextBtn.disabled).toBe(false);

    for (let i = 0; i < 4; i++) {
      nextBtn.click();
      fixture.detectChanges();
    }
    expect(prevBtn.disabled).toBe(false);
    expect(nextBtn.disabled).toBe(true);

    prevBtn.click();
    fixture.detectChanges();
    expect(nextBtn.disabled).toBe(false);
  });
});

