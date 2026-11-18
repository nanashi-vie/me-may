import { Component, computed, input, output } from '@angular/core';

/** Zero-based page indices; work stays bounded even for very large catalogues. */
export function pageTokens(page: number, totalPages: number): (number | 'gap')[] {
  if (totalPages <= 0) return [];
  const start = Math.max(0, Math.min(page - 2, totalPages - 5));
  const nearby = Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  const pages = [...new Set([0, ...nearby, totalPages - 1])];
  const tokens: (number | 'gap')[] = [];
  for (const current of pages) {
    const previous = tokens.at(-1);
    if (typeof previous === 'number' && current - previous > 1) {
      tokens.push(current - previous === 2 ? previous + 1 : 'gap');
    }
    tokens.push(current);
  }
  return tokens;
}

@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.html',
  styleUrl: './pagination.scss',
})
export class Pagination {
  readonly page = input(0);
  readonly totalPages = input(0);
  readonly disabled = input(false);
  readonly label = input('Phân trang');
  readonly pageChange = output<number>();
  readonly tokens = computed(() => pageTokens(this.page(), this.totalPages()));

  select(page: number) {
    if (
      this.disabled() ||
      !Number.isInteger(page) ||
      page < 0 ||
      page >= this.totalPages() ||
      page === this.page()
    )
      return;
    this.pageChange.emit(page);
  }
}
