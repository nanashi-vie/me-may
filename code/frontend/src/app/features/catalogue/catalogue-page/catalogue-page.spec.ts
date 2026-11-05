import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject, of } from 'rxjs';
import { vi } from 'vitest';
import { CataloguePage } from './catalogue-page';
import { BookCard } from '../book-card/book-card';
import { PublicApi } from '../public-api';
import { PublicBook, Page } from '../public.models';
describe('Catalogue route responses', () => {
  it('back/forward query changes cancel obsolete results', async () => {
    const first = new Subject<Page<PublicBook>>(),
      second = new Subject<Page<PublicBook>>();
    const books = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'sach', component: CataloguePage }]),
        {
          provide: PublicApi,
          useValue: {
            books,
            taxonomy: () => of({ categories: [], ageGroups: [], bindings: [], readingLevels: [] }),
          },
        },
      ],
    });
    const h = await RouterTestingHarness.create();
    const c = await h.navigateByUrl('/sach?q=first', CataloguePage);
    await h.navigateByUrl('/sach?q=second', CataloguePage);
    first.next({ items: [], page: 0, size: 20, totalElements: 99, totalPages: 5 });
    expect(c.page()).toBeNull();
    second.next({ items: [], page: 0, size: 20, totalElements: 2, totalPages: 1 });
    expect(c.page()?.totalElements).toBe(2);
    expect(c.draft.q).toBe('second');
    expect(c.loading()).toBe(false);
  });
  it('backend failure remains error rather than empty catalogue', async () => {
    const result = new Subject<Page<PublicBook>>();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'sach', component: CataloguePage }]),
        {
          provide: PublicApi,
          useValue: {
            books: () => result,
            taxonomy: () => of({ categories: [], ageGroups: [], bindings: [], readingLevels: [] }),
          },
        },
      ],
    });
    const h = await RouterTestingHarness.create();
    const c = await h.navigateByUrl('/sach', CataloguePage);
    result.error({ status: 500 });
    h.detectChanges();
    expect(c.error()).toBe(503);
    expect(h.routeNativeElement?.textContent).toContain('Chưa tải được dữ liệu');
    expect(h.routeNativeElement?.textContent).not.toContain('Chưa có cuốn phù hợp');
  });
});

describe('Retry stays with the URL request stream', () => {
  it('late retry cannot replace newer filter results', async () => {
    const retry = new Subject<Page<PublicBook>>(),
      next = new Subject<Page<PublicBook>>();
    const books = vi
      .fn()
      .mockReturnValueOnce(of({ items: [], page: 0, size: 20, totalElements: 1, totalPages: 1 }))
      .mockReturnValueOnce(retry)
      .mockReturnValueOnce(next);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'sach', component: CataloguePage }]),
        {
          provide: PublicApi,
          useValue: {
            books,
            taxonomy: () => of({ categories: [], ageGroups: [], bindings: [], readingLevels: [] }),
          },
        },
      ],
    });
    const h = await RouterTestingHarness.create();
    const c = await h.navigateByUrl('/sach?q=first', CataloguePage);
    c.retry();
    await h.navigateByUrl('/sach?q=second', CataloguePage);
    next.next({ items: [], page: 0, size: 20, totalElements: 2, totalPages: 1 });
    retry.next({ items: [], page: 0, size: 20, totalElements: 99, totalPages: 5 });
    expect(c.page()?.totalElements).toBe(2);
  });
  it('retry ignores unapplied draft filters', async () => {
    const books = vi.fn((_f: unknown) =>
      of({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }),
    );
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'sach', component: CataloguePage }]),
        {
          provide: PublicApi,
          useValue: {
            books,
            taxonomy: () => of({ categories: [], ageGroups: [], bindings: [], readingLevels: [] }),
          },
        },
      ],
    });
    const h = await RouterTestingHarness.create();
    const c = await h.navigateByUrl('/sach?q=applied', CataloguePage);
    c.draft.q = 'not-applied';
    c.retry();
    expect((books.mock.calls[1][0] as { q: string }).q).toBe('applied');
  });
});

describe('Catalogue category sidebar, binding chips, age apply, and collection links', () => {
  const emptyPage: Page<PublicBook> = { items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 };

  it('updates title/<title> by category, shows binding chips only for PICTURE_BOOK, preserves q/age/sort on category links, applies age, and clears q', async () => {
    const books = vi.fn(() => of(emptyPage));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'sach', component: CataloguePage },
          { path: 'bo-suu-tap/:slug', component: CataloguePage },
        ]),
        {
          provide: PublicApi,
          useValue: {
            books,
            taxonomy: () => of({ categories: [], ageGroups: [], bindings: [], readingLevels: [] }),
          },
        },
      ],
    });
    const h = await RouterTestingHarness.create();
    const router = TestBed.inject(Router);
    const title = TestBed.inject(Title);

    const c = await h.navigateByUrl(
      '/sach?category=PICTURE_BOOK&binding=HARDCOVER&q=usborne&age=AGE_4_6&sort=price_asc&page=2',
      CataloguePage,
    );
    h.detectChanges();
    const el = h.routeNativeElement!;

    expect(c.title()).toBe('Picture book');
    expect(title.getTitle()).toBe('Picture book | Mẹ Mây');
    expect(el.querySelectorAll('.binding-chips a').length).toBe(3);
    expect(el.querySelector('.search-query-bar')?.textContent).toContain('usborne');

    // Category link preserves q, age, sort and resets page & binding
    expect(c.categoryParams('BOARD_BOOK')).toEqual({
      q: 'usborne',
      category: 'BOARD_BOOK',
      age: ['AGE_4_6'],
      sort: 'price_asc',
    });

    // Switching away from PICTURE_BOOK hides binding chips and updates title
    await h.navigateByUrl('/sach?category=BOARD_BOOK&q=usborne', CataloguePage);
    h.detectChanges();
    expect(c.title()).toBe('Board book');
    expect(title.getTitle()).toBe('Board book | Mẹ Mây');
    expect(el.querySelector('.binding-chips')).toBeNull();

    // Age checkbox requires Apply button
    c.toggleAge('AGE_0_3', { target: { checked: true } } as unknown as Event);
    c.apply();
    await h.fixture.whenStable();
    expect(router.url).toContain('age=AGE_0_3');

    // Clear q keeps other filters
    c.clearQuery();
    await h.fixture.whenStable();
    expect(router.url).not.toContain('q=usborne');
    expect(router.url).toContain('category=BOARD_BOOK');
  });

  it('links categories on collection page cleanly to /sach?category= without marking active category', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'sach', component: CataloguePage },
          { path: 'bo-suu-tap/:slug', component: CataloguePage },
        ]),
        {
          provide: PublicApi,
          useValue: {
            books: () => of({ collection: { slug: 'mua-he', name: 'Mùa hè' }, books: emptyPage }),
            taxonomy: () => of({ categories: [], ageGroups: [], bindings: [], readingLevels: [] }),
          },
        },
      ],
    });
    const h = await RouterTestingHarness.create();
    const c = await h.navigateByUrl('/bo-suu-tap/mua-he?age=AGE_4_6', CataloguePage);
    h.detectChanges();
    const el = h.routeNativeElement!;

    expect(c.title()).toBe('Mùa hè');
    expect(c.categoryParams('HISTORY')).toEqual({ category: 'HISTORY' });
    expect(el.querySelector('.category-links a.active')).toBeNull();
  });
  it('locks book-card cover frame to 4:5 aspect ratio with overflow hidden and card border', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const f = TestBed.createComponent(BookCard);
    f.componentRef.setInput('book', {
      id: '1',
      bookCode: 'MM-000001',
      slug: 'mm-000001',
      title: 'Book',
      publisher: null,
      author: null,
      ageGroups: [],
      categoryCode: 'BOARD_BOOK',
      binding: null,
      conditionGrade: null,
      conditionNote: 'Good',
      priceMinVnd: 10000,
      priceMaxVnd: 10000,
      weightG: 200,
      salePriceVnd: null,
      saleEndsAt: null,
      description: null,
      readingLevel: null,
      readingVideoUrl: null,
      availability: 'AVAILABLE',
      variants: [{ id: '1', name: null, available: true }],
      media: [{ role: 'FRONT', contentPath: '/cover.jpg', alt: 'Cover' }],
    });
    f.detectChanges();
    const card = f.nativeElement.querySelector('.book-card') as HTMLElement;
    const cover = card.querySelector('.cover-link') as HTMLElement;
    expect(getComputedStyle(card).borderTopStyle).toBe('solid');
    expect(getComputedStyle(cover).aspectRatio).toBe('4/5');
    expect(getComputedStyle(cover).overflow).toBe('hidden');
  });
});
