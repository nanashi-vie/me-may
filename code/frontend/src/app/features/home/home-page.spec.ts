import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { HomePage } from './home-page';
import { PublicApi } from '../catalogue/public-api';

describe('HomePage banner info boxes', () => {
  function setup() {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: PublicApi,
          useValue: {
            home: () => of({ shelves: [] }),
            sale: () => of({ serverNow: new Date().toISOString(), endsAt: null, items: [] }),
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

  function communityLink(element: HTMLElement) {
    return element.querySelector<HTMLAnchorElement>(
      'a.info-box-item[aria-label="Cộng đồng Mẹ Mây trên Zalo"]',
    )!;
  }

  it('opens the desktop dialog and restores focus to the community link', async () => {
    const { fixture } = setup();
    const element = fixture.nativeElement as HTMLElement;
    const link = communityLink(element);
    const dialog = element.querySelector<HTMLDialogElement>('app-community-dialog dialog')!;
    dialog.showModal = () => dialog.setAttribute('open', '');
    dialog.close = () => {
      dialog.removeAttribute('open');
      dialog.dispatchEvent(new Event('close'));
    };
    const focus = vi.spyOn(link, 'focus');
    const userAgent = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Windows NT 10.0');
    try {
      const click = new MouseEvent('click', { bubbles: true, cancelable: true });
      link.dispatchEvent(click);
      expect(click.defaultPrevented).toBe(true);
      expect(dialog.open).toBe(true);
      expect(dialog.querySelector('a')?.href).toBe('https://zalo.me/g/mwzwwq694');
      await vi.waitFor(() => {
        fixture.detectChanges();
        expect(dialog.querySelector<HTMLImageElement>('.qr')?.src).toMatch(/^data:image\/gif;base64,/);
      });
      const webLink = dialog.querySelector('a')!;
      let prevented: boolean | undefined;
      dialog.addEventListener('click', (event) => {
        prevented = event.defaultPrevented;
        event.preventDefault();
      }, { once: true });
      webLink.click();
      expect(prevented).toBe(false);
      expect(dialog.open).toBe(true);
      dialog.querySelector('button')!.click();
      expect(dialog.open).toBe(false);
      expect(focus).toHaveBeenCalled();
    } finally {
      userAgent.mockRestore();
    }
  });

  it.each([
    ['Android', 5],
    ['iPhone', 5],
    ['iPad', 5],
    ['Macintosh', 5],
  ])('keeps the direct Zalo link on %s with %s touch points', (device, points) => {
    const { fixture } = setup();
    const link = communityLink(fixture.nativeElement);
    const userAgent = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(device);
    Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: points });
    try {
      // Capture whether Angular prevented navigation, then suppress jsdom navigation.
      let prevented: boolean | undefined;
      link.parentElement!.addEventListener('click', (event) => {
        prevented = event.defaultPrevented;
        event.preventDefault();
      }, { once: true });
      link.click();
      expect(prevented).toBe(false);
      expect(link.href).toBe('https://zalo.me/g/mwzwwq694');
      expect(link.target).toBe('_blank');
      expect(link.rel).toContain('noopener');
      expect(fixture.nativeElement.querySelector('app-community-dialog dialog').open).toBe(false);
    } finally {
      Reflect.deleteProperty(navigator, 'maxTouchPoints');
      userAgent.mockRestore();
    }
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

  it('opens shipping-promo dialog when clicking "Ưu đãi vận chuyển" box', () => {
    const { fixture, component } = setup();
    const el = fixture.nativeElement as HTMLElement;
    const button = el.querySelector('button.info-box-item[aria-label="Ưu đãi vận chuyển"]') as HTMLButtonElement;
    expect(button).toBeTruthy();

    expect(component.shippingPromoDialog).toBeTruthy();
    const openSpy = vi.spyOn(component.shippingPromoDialog!, 'open');

    button.click();
    expect(openSpy).toHaveBeenCalledWith(button);
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

