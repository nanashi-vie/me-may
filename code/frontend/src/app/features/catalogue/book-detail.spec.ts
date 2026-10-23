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
