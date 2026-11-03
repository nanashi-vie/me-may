import { Component, RESPONSE_INIT, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, combineLatest, map, of, startWith, Subject, switchMap, tap } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { PublicApi } from '../public-api';
import { AgeGroup, CategoryCode, CatalogueFilter, Page, PublicBook, Taxonomy } from '../public.models';
import {
  categoryLabel,
  DEFAULT_AGE_GROUPS,
  DEFAULT_CATEGORIES,
  filterParams,
  readFilters,
} from '../catalogue-state';
import { BookCard } from '../book-card/book-card';
import { PublicError } from '../public-error';
import { PublicClock } from '../public-clock';
import { PageMetadata } from '../../../core/page-metadata';
import { TaxonomyOption } from '../../admin/books/book.models';

@Component({
  selector: 'app-catalogue-page',
  imports: [FormsModule, RouterLink, BookCard, PublicError],
  templateUrl: './catalogue-page.html',
  styleUrl: './catalogue-page.scss',
})
export class CataloguePage {
  readonly api = inject(PublicApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly refreshRequests = new Subject<void>();
  private readonly response = inject(RESPONSE_INIT, { optional: true });
  private readonly meta = inject(PageMetadata);
  readonly loading = signal(true);
  readonly error = signal(0);
  readonly page = signal<Page<PublicBook> | null>(null);
  readonly title = signal('Tất cả sách');
  readonly isCollection = signal(false);
  readonly taxonomy = signal<Taxonomy | null>(null);
  readonly categories = computed<TaxonomyOption<CategoryCode>[]>(() => {
    const list = this.taxonomy()?.categories;
    return list?.length ? list : DEFAULT_CATEGORIES;
  });
  readonly ageGroups = computed<TaxonomyOption<AgeGroup>[]>(() => {
    const list = this.taxonomy()?.ageGroups;
    return list?.length ? list : DEFAULT_AGE_GROUPS;
  });
  readonly applied = signal<CatalogueFilter>(readFilters(this.route.snapshot.queryParamMap));
  readonly now = inject(PublicClock).now;
  private expired = '';
  draft: CatalogueFilter = readFilters(this.route.snapshot.queryParamMap);

  constructor() {
    effect(() => {
      const p = this.page(),
        now = this.now();
      const key = p?.items
        .filter((b) => b.saleEndsAt && now >= Date.parse(b.saleEndsAt))
        .map((b) => b.slug + b.saleEndsAt)
        .join(',');
      if (key && this.expired !== key) {
        this.expired = key;
        this.retry();
      }
    });
    this.api
      .taxonomy()
      .pipe(takeUntilDestroyed())
      .subscribe({ next: (t) => this.taxonomy.set(t), error: () => {} });
    combineLatest([
      this.route.paramMap,
      this.route.queryParamMap,
      this.refreshRequests.pipe(startWith(undefined)),
    ])
      .pipe(
        tap(([params, p]) => {
          const f = readFilters(p);
          this.isCollection.set(!!params.get('slug'));
          this.applied.set(f);
          this.draft = { ...f, age: [...f.age] };
          if (!params.get('slug')) {
            this.title.set(f.category ? categoryLabel(f.category, this.categories()) : 'Tất cả sách');
          }
          this.loading.set(true);
          this.error.set(0);
        }),
        switchMap(([p]) =>
          this.api
            .books(readFilters(this.route.snapshot.queryParamMap), p.get('slug') || undefined)
            .pipe(
              map((data) => ({ data, error: 0 })),
              catchError((e: HttpErrorResponse) =>
                of({ data: null, error: e.status === 404 ? 404 : 503 }),
              ),
            ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ data, error }) => {
        this.loading.set(false);
        this.error.set(error);
        if (error) {
          if (this.response) this.response.status = error;
          this.meta.unavailable(error);
          return;
        }
        const result = data!;
        if ('books' in result) {
          this.title.set(result.collection.name);
          this.page.set(result.books);
        } else {
          const cat = this.applied().category;
          this.title.set(cat ? categoryLabel(cat, this.categories()) : 'Tất cả sách');
          this.page.set(result);
        }
        this.meta.set(
          this.title() + ' | Mẹ Mây',
          'Sách ngoại văn đã qua sử dụng, ảnh thật và tình trạng rõ ràng.',
          this.router.url,
        );
      });
  }

  categoryParams(category: string): Params {
    if (this.isCollection()) return category ? { category } : {};
    return filterParams({ ...this.applied(), category, binding: '', page: 1 });
  }

  bindingParams(binding: string): Params {
    return filterParams({ ...this.applied(), binding, page: 1 });
  }

  toggleAge(code: string, event: Event) {
    this.draft.age = (event.target as HTMLInputElement).checked
      ? [...this.draft.age, code]
      : this.draft.age.filter((a) => a !== code);
  }

  changeSort(sort: string) {
    this.draft.sort = sort;
    const f = { ...this.applied(), sort, page: 1 };
    void this.router.navigate([], { relativeTo: this.route, queryParams: filterParams(f) });
  }

  clearQuery() {
    this.draft.q = '';
    const f = { ...this.applied(), q: '', page: 1 };
    void this.router.navigate([], { relativeTo: this.route, queryParams: filterParams(f) });
  }

  apply(page = 1) {
    const f = { ...this.draft, page };
    if (f.category !== 'PICTURE_BOOK') f.binding = '';
    void this.router.navigate([], { relativeTo: this.route, queryParams: filterParams(f) });
  }

  reset() {
    this.draft = readFilters({ get: () => null, getAll: () => [] } as never);
    this.apply();
  }

  retry() {
    this.refreshRequests.next();
  }
}
