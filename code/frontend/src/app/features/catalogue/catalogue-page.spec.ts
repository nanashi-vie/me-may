import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject, of } from 'rxjs';
import { vi } from 'vitest';
import { CataloguePage } from './catalogue-page';
import { PublicApi } from './public-api';
import { PublicBook, Page } from './public.models';
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
