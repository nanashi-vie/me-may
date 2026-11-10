import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject, of } from 'rxjs';
import { vi } from 'vitest';
import { BookDetail } from './book-detail';
import { PublicApi } from '../public-api';
import { PublicBook } from '../public.models';
import { PageMetadata } from '../../../core/page-metadata';
import { TransferState, makeStateKey } from '@angular/core';
const a: PublicBook = {
  id: '1',
  bookCode: 'MM-000001',
  slug: 'mm-000001',
  title: 'First',
  publisher: null,
  author: null,
  ageGroups: [],
  categoryCode: 'BOARD_BOOK',
  binding: null,
  conditionGrade: null,
  conditionNote: 'Actual',
  priceMinVnd: 10000, priceMaxVnd:10000, weightG:250,
  salePriceVnd: null,
  saleEndsAt: null,
  description: null,
  readingLevel: null,
  readingVideoUrl: null,
  availability: 'AVAILABLE',
  variants: [{id:'default',name:null,available:true}],
  media: [],
};
describe('Detail refresh and public origin', () => {
  it('shows all features below the title and handles old books without features',async()=>{
    TestBed.configureTestingModule({providers:[provideRouter([{path:'sach/:slug',component:BookDetail}]),
      {provide:PublicApi,useValue:{detail:()=>of({...a,features:[{code:'SPIN',label:'Xoay chuyển'},{code:'TOUCH',label:'Chạm & cảm nhận'}]}),contact:()=>of({hotlineUrl:null,groupUrl:null})}}]});
    const h=await RouterTestingHarness.create();const c=await h.navigateByUrl('/sach/mm-000001',BookDetail);
    expect(Array.from(h.routeNativeElement!.querySelectorAll('.book-features li')).map(n=>n.textContent?.trim())).toEqual(['Xoay chuyển','Chạm & cảm nhận']);
    c.accept(a);h.detectChanges();expect(h.routeNativeElement!.querySelector('.book-features')).toBeNull();
  });
  const variants=[{id:'high',name:'Độ mới cao',available:true},{id:'corner',name:'Có cấn góc',available:true}];
  it('contacts without a selection and hides private condition data', async()=>{
    TestBed.configureTestingModule({providers:[provideRouter([{path:'sach/:slug',component:BookDetail}]),
      {provide:PublicApi,useValue:{detail:()=>of({...a,variants,conditionNote:'PRIVATE_NOTE_SENTINEL'}),contact:()=>of({hotlineUrl:null,groupUrl:null})}}]});
    const h=await RouterTestingHarness.create();const c=await h.navigateByUrl('/sach/mm-000001',BookDetail);
    expect(c.canContact()).toBe(true);expect(await c.verifyContact()).not.toContain('Biến thể:');
    expect(h.routeNativeElement!.querySelector('#variant-selector')).toBeNull();
    expect(h.routeNativeElement!.textContent).not.toContain('PRIVATE_NOTE_SENTINEL');
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).not.toContain('PRIVATE_NOTE_SENTINEL');
  });
  it('refreshes availability before copying and stops contact for missing books',async()=>{
    let current={...a,variants};
    TestBed.configureTestingModule({providers:[provideRouter([{path:'sach/:slug',component:BookDetail}]),
      {provide:PublicApi,useValue:{detail:()=>of(current),contact:()=>of({hotlineUrl:null,groupUrl:null})}}]});
    const h=await RouterTestingHarness.create();const c=await h.navigateByUrl('/sach/mm-000001',BookDetail);
    current={...current,availability:'SOLD'};
    expect(await c.verifyContact()).toContain('tư vấn sách tương đương');
    c.accept(null,404);expect(c.canContact()).toBe(false);expect(await c.verifyContact()).toBe('');
  });
  it('does not return an old enquiry when navigation overtakes verification', async()=>{
    const pending=new Subject<PublicBook>();
    const detail=vi.fn().mockReturnValueOnce(of({...a,variants})).mockReturnValueOnce(pending)
      .mockReturnValue(of({...a,id:'2',slug:'mm-000002',bookCode:'MM-000002',variants}));
    TestBed.configureTestingModule({providers:[provideRouter([{path:'sach/:slug',component:BookDetail}]),
      {provide:PublicApi,useValue:{detail,contact:()=>of({hotlineUrl:null,groupUrl:null})}}]});
    const h=await RouterTestingHarness.create();const c=await h.navigateByUrl('/sach/mm-000001',BookDetail);
    const text=c.verifyContact();await h.navigateByUrl('/sach/mm-000002',BookDetail);pending.next({...a,variants});
    expect(await text).toBe('');
  });
  it('reserves a portrait gallery frame while keeping the entire source visible', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'sach/:slug', component: BookDetail }]),
        {
          provide: PublicApi,
          useValue: {
            detail: () => of({
              ...a,
              media: [{ role: 'FRONT', contentPath: '/cover.jpg', alt: 'Bìa sách' }],
            }),
            contact: () => of({ hotlineUrl: null, groupUrl: null }),
          },
        },
      ],
    });
    const h = await RouterTestingHarness.create();
    await h.navigateByUrl('/sach/mm-000001', BookDetail);
    const frame = h.routeNativeElement!.querySelector('figure') as HTMLElement;
    const image = frame.querySelector('img') as HTMLImageElement;
    expect(getComputedStyle(frame).aspectRatio).toBe('3/4');
    expect(getComputedStyle(image).objectFit).toBe('contain');
  });
  it('keeps the SSR book visible while verifying fresh data, then removes a hidden book', async () => {
    const fresh = new Subject<PublicBook>();
    TestBed.configureTestingModule({ providers: [
      provideRouter([{ path: 'sach/:slug', component: BookDetail }]),
      { provide: PublicApi, useValue: { detail: () => fresh, contact: () => of({hotlineUrl:null,groupUrl:null}) } },
    ] });
    TestBed.inject(TransferState).set(makeStateKey<PublicBook | null>('memay-detail-book'), a);
    const h = await RouterTestingHarness.create();
    const c = await h.navigateByUrl('/sach/mm-000001', BookDetail);
    expect(h.routeNativeElement!.querySelector('h1')?.textContent).toContain('First');
    expect(h.routeNativeElement!.querySelector('.loading')).toBeNull();
    expect(h.routeNativeElement!.querySelector<HTMLButtonElement>('.contact-actions > button')?.disabled).toBe(true);
    fresh.error({ status: 404 });
    h.detectChanges();
    expect(c.book()).toBeNull();
    expect(h.routeNativeElement!.textContent).not.toContain('First');
    expect(TestBed.inject(TransferState).hasKey(makeStateKey('memay-detail-book'))).toBe(false);
  });
  it('retains the same gallery during refresh and applies the new price', async () => {
    const fresh = new Subject<PublicBook>();
    const detail = vi.fn().mockReturnValueOnce(of(a)).mockReturnValueOnce(fresh);
    TestBed.configureTestingModule({ providers: [
      provideRouter([{ path: 'sach/:slug', component: BookDetail }]),
      { provide: PublicApi, useValue: { detail, contact: () => of({hotlineUrl:null,groupUrl:null}) } },
    ] });
    const h = await RouterTestingHarness.create();
    const c = await h.navigateByUrl('/sach/mm-000001', BookDetail);
    const heading = h.routeNativeElement!.querySelector('h1');
    c.refresh(); h.detectChanges();
    expect(h.routeNativeElement!.querySelector('h1')).toBe(heading);
    fresh.next({ ...a, priceMinVnd: 30000, priceMaxVnd:30000, weightG:250 }); h.detectChanges();
    expect(c.book()?.priceMinVnd).toBe(30000);
  });
  it('late refresh cannot replace a newly opened book', async () => {
    const retry = new Subject<PublicBook>(),
      next = new Subject<PublicBook>();
    const detail = vi
      .fn()
      .mockReturnValueOnce(of(a))
      .mockReturnValueOnce(retry)
      .mockReturnValueOnce(next);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'sach/:slug', component: BookDetail }]),
        {
          provide: PublicApi,
          useValue: { detail, contact: () => of({ hotlineUrl: null, groupUrl: null }) },
        },
      ],
    });
    const h = await RouterTestingHarness.create();
    const c = await h.navigateByUrl('/sach/mm-000001', BookDetail);
    c.refresh();
    await h.navigateByUrl('/sach/mm-000002', BookDetail);
    next.next({ ...a, id: '2', slug: 'mm-000002', bookCode: 'MM-000002', title: 'Second' });
    retry.next(a);
    expect(c.book()?.bookCode).toBe('MM-000002');
  });
  it('hydrates the configured public site origin for metadata', () => {
    TestBed.inject(TransferState).set(
      makeStateKey<string>('memay-public-site-origin'),
      'http://127.0.0.1:4000',
    );
    TestBed.inject(PageMetadata).set('Book', 'Description', '/sach/mm-000001');
    expect(document.querySelector<HTMLLinkElement>('link[rel=canonical]')?.href).toBe(
      'http://127.0.0.1:4000/sach/mm-000001',
    );
  });
  it('renders Flash Sale banner, 3 countdown boxes, and discount badge on BookDetail when sale is active', async () => {
    const saleBook: PublicBook = {
      ...a,
      priceMinVnd: 35000,
      priceMaxVnd: 40000,
      salePriceVnd: 18000,
      saleEndsAt: '2099-12-31T23:59:59Z',
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'sach/:slug', component: BookDetail }]),
        {
          provide: PublicApi,
          useValue: {
            detail: () => of(saleBook),
            contact: () => of({ hotlineUrl: null, groupUrl: null }),
          },
        },
      ],
    });
    const h = await RouterTestingHarness.create();
    await h.navigateByUrl('/sach/mm-000001', BookDetail);
    const el = h.routeNativeElement!;
    expect(el.querySelector('.detail-flash-bar')).not.toBeNull();
    expect(el.querySelectorAll('.detail-flash-bar .time-box').length).toBe(3);
    expect(el.querySelector('.pricing .discount')?.textContent?.trim()).toBe('-55%');
    expect(el.querySelector('.pricing del')?.textContent).toContain('35.000 - 40.000 đ');
  });
  it('groups one main image with thumbnails and actions, and opens contact directly', async () => {
    const media = ['FRONT', 'BACK', 'SPINE'].map((role) => ({ role, contentPath: '/' + role + '.jpg', alt: role }));
    const variants = [{ id: 'high', name: 'Độ mới cao', available: true }, { id: 'corner', name: 'Có cấn góc', available: true }];
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'sach/:slug', component: BookDetail }]),
        {
          provide: PublicApi,
          useValue: {
            detail: () => of({ ...a, media, variants }),
            contact: () => of({ hotlineUrl: null, groupUrl: null }),
          },
        },
      ],
    });
    const h = await RouterTestingHarness.create();
    const c = await h.navigateByUrl('/sach/mm-000001', BookDetail);
    const el = h.routeNativeElement!;
    expect(el.querySelectorAll('.gallery figure').length).toBe(1);
    const thumbs = el.querySelectorAll<HTMLButtonElement>('.thumbs button');
    expect(thumbs.length).toBe(3);
    thumbs[1].click();
    h.detectChanges();
    expect(el.querySelector('.gallery figure img')?.getAttribute('src')).toBe('/BACK.jpg?size=640&format=jpg');
    expect(thumbs[1].getAttribute('aria-pressed')).toBe('true');
    expect(el.querySelector('.media-col .contact-actions app-wishlist-button')).not.toBeNull();
    const modal=el.querySelector('dialog')!;modal.showModal=vi.fn();
    el.querySelector<HTMLButtonElement>('.contact-actions > button')!.click();
    h.detectChanges();
    expect(modal.showModal).toHaveBeenCalledOnce();
  });
  it('uses available LOCAL variants and preserves Cloudinary sizes within the same gallery', async () => {
    const local = {
      role: 'FRONT', alt: 'Bìa', contentPath: '/front-480',
      imageVariants: [
        { url: '/front-480', size: 480, format: 'jpg' as const, width: 360, height: 480 },
        { url: '/front-1400', size: 1400, format: 'jpg' as const, width: 1050, height: 1400 },
      ],
    };
    const legacy = { role: 'BACK', alt: 'Mặt sau', contentPath: '/back' };
    TestBed.configureTestingModule({ providers: [
      provideRouter([{ path: 'sach/:slug', component: BookDetail }]),
      { provide: PublicApi, useValue: {
        detail: () => of({ ...a, media: [local, legacy] }),
        contact: () => of({ hotlineUrl: null, groupUrl: null }),
      } },
    ] });
    const h = await RouterTestingHarness.create();
    await h.navigateByUrl('/sach/mm-000001', BookDetail);
    const page = h.routeNativeElement!;
    const main = () => page.querySelector('.gallery figure img');
    expect(main()?.getAttribute('src')).toBe('/front-1400');
    expect(page.querySelector('.thumbs img')?.getAttribute('src')).toBe('/front-480');
    main()?.dispatchEvent(new Event('error'));
    h.detectChanges();
    expect(page.querySelector('.media-placeholder')).not.toBeNull();
    page.querySelectorAll<HTMLButtonElement>('.thumbs button')[1].click();
    h.detectChanges();
    expect(main()?.getAttribute('src')).toBe('/back?size=640&format=jpg');
  });
  it('renders related publisher and category shelves with see-more links', async () => {
    const bookWithPub: PublicBook = { ...a, publisher: 'Kim Đồng', categoryCode: 'PICTURE_BOOK' };
    const relatedPubBook: PublicBook = { ...a, id: '2', bookCode: 'MM-000002', slug: 'mm-000002', title: 'Pub Book', publisher: 'Kim Đồng' };
    const relatedCatBook: PublicBook = { ...a, id: '3', bookCode: 'MM-000003', slug: 'mm-000003', title: 'Cat Book', publisher: 'Nhã Nam', categoryCode: 'PICTURE_BOOK' };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'sach/:slug', component: BookDetail }]),
        {
          provide: PublicApi,
          useValue: {
            detail: () => of(bookWithPub),
            contact: () => of({ hotlineUrl: null, groupUrl: null }),
            related: () => of({ samePublisherBooks: [relatedPubBook], sameCategoryBooks: [relatedCatBook] }),
          },
        },
      ],
    });
    const h = await RouterTestingHarness.create();
    await h.navigateByUrl('/sach/mm-000001', BookDetail);
    const el = h.routeNativeElement!;
    const dividers = el.querySelectorAll('.section-divider');
    expect(dividers.length).toBe(2);
    expect(dividers[0].textContent?.toUpperCase()).toContain('SÁCH CÙNG NHÀ XUẤT BẢN');
    expect(dividers[1].textContent?.toUpperCase()).toContain('SÁCH CÙNG THỂ LOẠI');

    const seeMoreLinks = el.querySelectorAll<HTMLAnchorElement>('.see-more-wrap a');
    expect(seeMoreLinks.length).toBe(2);
    expect(seeMoreLinks[0].getAttribute('href')).toContain('q=Kim%20%C4%90%E1%BB%93ng');
    expect(seeMoreLinks[1].getAttribute('href')).toContain('category=PICTURE_BOOK');
  });
  it('shows empty shelf notice when related lists are empty and hides see-more link', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'sach/:slug', component: BookDetail }]),
        {
          provide: PublicApi,
          useValue: {
            detail: () => of({ ...a, publisher: null }),
            contact: () => of({ hotlineUrl: null, groupUrl: null }),
            related: () => of({ samePublisherBooks: [], sameCategoryBooks: [] }),
          },
        },
      ],
    });
    const h = await RouterTestingHarness.create();
    await h.navigateByUrl('/sach/mm-000001', BookDetail);
    const el = h.routeNativeElement!;
    expect(el.textContent).toContain('Chưa có sách khác cùng nhà xuất bản.');
    expect(el.textContent).toContain('Chưa có sách khác cùng thể loại.');
    expect(el.querySelectorAll('.see-more-wrap a').length).toBe(0);
  });
  it('hides weightG on public detail, places Độ tuổi above Trình độ đọc, and shows the updated reading note', async () => {
    const metaBook: PublicBook = {
      ...a,
      weightG: 212,
      publisher: 'Twinkl',
      author: 'Jane Doe',
      binding: 'PAPERBACK',
      ageGroups: ['AGE_4_6'],
      readingLevel: 'A1',
      readingVideoUrl: 'https://example.com/video',
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'sach/:slug', component: BookDetail }]),
        {
          provide: PublicApi,
          useValue: {
            detail: () => of(metaBook),
            contact: () => of({ hotlineUrl: null, groupUrl: null }),
          },
        },
      ],
    });
    const h = await RouterTestingHarness.create();
    await h.navigateByUrl('/sach/mm-000001', BookDetail);
    const el = h.routeNativeElement!;
    const dts = Array.from(el.querySelectorAll('dl dt')).map((dt) => dt.textContent?.trim());
    expect(dts).toEqual(['Nhà xuất bản', 'Tác giả', 'Kiểu bìa', 'Độ tuổi', 'Trình độ đọc', 'Đọc tham khảo']);
    expect(el.querySelector('dl')?.textContent).not.toContain('Trọng lượng sách');
    expect(el.querySelector('dl')?.textContent).not.toContain('212 g');
    expect(el.querySelector('dl')?.textContent).toContain(
      'Độ tuổi & trình độ đọc là gợi ý tham khảo từ tiệm. Khách hàng tự kiểm tra mức độ phù hợp trước khi mua hàng.',
    );
  });
});
