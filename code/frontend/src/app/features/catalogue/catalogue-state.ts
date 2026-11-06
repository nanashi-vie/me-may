import { ParamMap, Params } from '@angular/router';
import { AgeGroup, CategoryCode, CatalogueFilter, PublicBook } from './public.models';
import { AGE_LABELS, CATEGORY_LABELS, formatPrice, formatPriceRange } from '../admin/books/book-copy';
import { TaxonomyOption } from '../admin/books/book.models';
export const DEFAULT_CATEGORIES: TaxonomyOption<CategoryCode>[] = Object.entries(CATEGORY_LABELS).map(
  ([code, label], sortOrder) => ({ code: code as CategoryCode, label, sortOrder }),
);
export const DEFAULT_AGE_GROUPS: TaxonomyOption<AgeGroup>[] = Object.entries(AGE_LABELS).map(
  ([code, label], sortOrder) => ({ code: code as AgeGroup, label, sortOrder }),
);
export function categoryLabel(code: string, list: TaxonomyOption<CategoryCode>[] = DEFAULT_CATEGORIES) {
  return list.find((c) => c.code === code)?.label || CATEGORY_LABELS[code as CategoryCode] || 'Tất cả sách';
}
export function readFilters(p: ParamMap): CatalogueFilter {
  const category = (p.get('category') || '') in CATEGORY_LABELS ? p.get('category')! : '';
  const page = Number(p.get('page') || 1);
  return {
    q: (p.get('q') || '').trim().slice(0, 200),
    category,
    binding:
      category === 'PICTURE_BOOK' && ['PAPERBACK', 'HARDCOVER'].includes(p.get('binding') || '')
        ? p.get('binding')!
        : '',
    age: [...new Set(p.getAll('age').filter((a) => a in AGE_LABELS))],
    sort: ['price_asc', 'price_desc'].includes(p.get('sort') || '') ? p.get('sort')! : 'newest',
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}
export function filterParams(f: CatalogueFilter): Params {
  return {
    ...(f.q ? { q: f.q } : {}),
    ...(f.category ? { category: f.category } : {}),
    ...(f.category === 'PICTURE_BOOK' && f.binding ? { binding: f.binding } : {}),
    ...(f.age.length ? { age: f.age } : {}),
    ...(f.sort !== 'newest' ? { sort: f.sort } : {}),
    ...(f.page > 1 ? { page: f.page } : {}),
  };
}
export function bookTitle(b: PublicBook) {
  return [b.title, b.publisher, b.author, b.ageGroups.map((a) => AGE_LABELS[a]).join(', ')]
    .filter(Boolean)
    .join(' | ');
}
export function enquiryText(b: PublicBook, url: string) {
  return `${b.availability === 'SOLD' ? 'Tôi muốn được tư vấn sách tương đương cuốn' : 'Tôi muốn hỏi thêm và xem ảnh/video thật của cuốn'}:\n${b.bookCode} | ${b.title}\nGiá tham khảo: ${bookPrice(b)}\n${url}\nNhờ tiệm xác nhận tình trạng và giá cụ thể.`;
}
export function countdownParts(ms: number): [string, string, string] {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map((n) =>
    String(n).padStart(2, '0'),
  ) as [string, string, string];
}
export function countdown(ms: number) {
  return countdownParts(ms).join(':');
}
export function discountPercent(b: PublicBook): number | null {
  if (b.salePriceVnd === null || !b.priceMaxVnd || b.salePriceVnd >= b.priceMaxVnd) return null;
  const pct = Math.round((1 - b.salePriceVnd / b.priceMaxVnd) * 100);
  return pct > 0 ? pct : null;
}
export function effectiveBook(b: PublicBook, now: number): PublicBook {
  return b.saleEndsAt && now >= Date.parse(b.saleEndsAt)
    ? { ...b, priceMinVnd: null, priceMaxVnd: null, salePriceVnd: null }
    : b;
}

export function bookPrice(b: PublicBook) { return b.salePriceVnd !== null ? formatPrice(b.salePriceVnd) : formatPriceRange(b.priceMinVnd,b.priceMaxVnd); }

export function publicMediaUrl(media: PublicBook['media'][number], size: 320 | 640, format: 'jpg' | 'webp') {
  const params = new URLSearchParams({ size: String(size), format });
  if (media.cacheKey) params.set('v', media.cacheKey);
  return media.contentPath + '?' + params.toString();
}
