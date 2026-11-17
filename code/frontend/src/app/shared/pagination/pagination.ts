import { Component, computed, input, output } from '@angular/core';

/** Zero-based page indices; work stays bounded even for very large catalogues. */
export function pageTokens(page: number, totalPages: number, slots: 5 | 7): (number | 'gap')[] {
  if (totalPages <= 0) return [];
  if (totalPages <= slots) return Array.from({ length: totalPages }, (_, i) => i);
  const count = slots - 2;
  let pages: number[];
  if (page < slots - 3) {
    pages = [...Array.from({ length: count }, (_, i) => i), totalPages - 1];
  } else if (page >= totalPages - (slots - 3)) {
    pages = [0, ...Array.from({ length: count }, (_, i) => totalPages - count + i)];
  } else {
    const radius = (slots - 5) / 2;
    pages = [0, ...Array.from({ length: slots - 4 }, (_, i) => page - radius + i), totalPages - 1];
  }
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
  readonly wide = computed(() => pageTokens(this.page(), this.totalPages(), 7));
  readonly compact = computed(() => pageTokens(this.page(), this.totalPages(), 5));

  select(page: number) {
    if (this.disabled() || !Number.isInteger(page) || page < 0 || page >= this.totalPages() || page === this.page()) return;
    this.pageChange.emit(page);
  }
}
