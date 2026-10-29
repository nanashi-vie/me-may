import { formatPriceRange } from './book-copy';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BookApi } from './book-api';
import { Availability, BookFilter, BookSummary, Page, Publication } from './book.models';
import { AVAILABILITY_LABELS, PUBLICATION_LABELS } from './book-copy';
@Component({
  selector: 'app-book-list',
  imports: [RouterLink, ReactiveFormsModule, DatePipe],
  templateUrl: './book-list.html',
  styleUrl: './book-list.scss',
})
export class BookList {
  readonly price = formatPriceRange;
  private readonly api = inject(BookApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  readonly filters = new FormGroup({
    q: new FormControl('', { nonNullable: true }),
    publication: new FormControl('', { nonNullable: true }),
    availability: new FormControl('', { nonNullable: true }),
  });
  readonly result = signal<Page<BookSummary> | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly labels = PUBLICATION_LABELS;
  readonly availabilityLabels = AVAILABILITY_LABELS;
  private sequence = 0;
  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((p) => {
      const publication = p.get('publication'),
        availability = p.get('availability');
      this.filters.setValue({
        q: p.get('q') ?? '',
        publication: publication ?? '',
        availability: availability ?? '',
      });
      const filter: BookFilter = {
        q: p.get('q') ?? '',
        page: Math.max(0, Number(p.get('page')) || 0),
        publication: ['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(publication ?? '')
          ? (publication as Publication)
          : undefined,
        availability: ['AVAILABLE', 'SOLD'].includes(availability ?? '')
          ? (availability as Availability)
          : undefined,
      };
      const seq = ++this.sequence;
      this.loading.set(true);
      this.error.set('');
      this.api
        .list(filter)
        .pipe(takeUntilDestroyed(this.destroy))
        .subscribe({
          next: (r) => {
            if (seq === this.sequence) {
              this.result.set(r);
              this.loading.set(false);
            }
          },
          error: () => {
            if (seq === this.sequence) {
              this.error.set('Chưa tải được danh sách. Kiểm tra phiên đăng nhập và thử lại.');
              this.loading.set(false);
            }
          },
        });
    });
  }
  search(page = 0) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ...this.filters.getRawValue(), page },
      queryParamsHandling: 'merge',
    });
  }
}
