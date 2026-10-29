import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject, of } from 'rxjs';
import { vi } from 'vitest';
import { BookDetail } from './book-detail';
import { PublicApi } from './public-api';
import { PublicBook } from './public.models';
import { PageMetadata } from '../../core/page-metadata';
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
  priceVnd: 10000,
  originalPriceVnd: null,
  saleEndsAt: null,
  description: null,
  readingLevel: null,
  readingVideoUrl: null,
  availability: 'AVAILABLE',
  media: [],
};
describe('Detail refresh and public origin', () => {
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
    fresh.next({ ...a, priceVnd: 30000 }); h.detectChanges();
    expect(c.book()?.priceVnd).toBe(30000);
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
});
