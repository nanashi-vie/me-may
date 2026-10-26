import { ParamMap, Params } from '@angular/router';
import { CatalogueFilter, PublicBook } from './public.models';
import { AGE_LABELS, formatPrice } from '../admin/books/book-copy';
const categories = [
  'BOARD_BOOK',
  'PICTURE_BOOK',
  'ENCYCLOPEDIA_SCIENCE',
  'HISTORY',
  'CHAPTER',
  'STORY_COLLECTION',
];
export function readFilters(p: ParamMap): CatalogueFilter {
  const category = categories.includes(p.get('category') || '') ? p.get('category')! : '';
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
  return `${b.availability === 'SOLD' ? 'Tôi muốn được tư vấn sách tương đương cuốn' : 'Tôi muốn hỏi thêm và xem ảnh/video thật của cuốn'}:\n${b.bookCode} | ${b.title}\nGiá tham khảo: ${formatPrice(b.priceVnd)}\n${url}\nNhờ tiệm xác nhận tình trạng và giá cụ thể. Liên hệ không giữ sách.`;
}
export function countdown(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
}
export function effectiveBook(b: PublicBook, now: number): PublicBook {
  return b.saleEndsAt && now >= Date.parse(b.saleEndsAt)
    ? { ...b, priceVnd: null, originalPriceVnd: null }
    : b;
}
