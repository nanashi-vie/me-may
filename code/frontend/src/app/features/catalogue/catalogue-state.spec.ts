import { convertToParamMap } from '@angular/router';
import {
  readFilters,
  filterParams,
  bookTitle,
  enquiryText,
  countdown,
  effectiveBook,
} from './catalogue-state';
import { PublicBook } from './public.models';
const book: PublicBook = {
  id: '1',
  bookCode: 'MM-000001',
  slug: 'mm-000001',
  title: 'A book',
  publisher: null,
  author: 'Author',
  ageGroups: ['AGE_4_6'],
  categoryCode: 'BOARD_BOOK',
  binding: null,
  conditionGrade: null,
  conditionNote: 'Thực tế',
  priceMinVnd:10000,priceMaxVnd:10000,weightG:250,salePriceVnd:7000,
  saleEndsAt: '2026-10-23T13:00:00Z',
  description: null,
  readingLevel: null,
  readingVideoUrl: null,
  availability: 'AVAILABLE',
  variants: [{id:'default',name:null,available:true}],
  media: [],
};
describe('Public catalogue state', () => {
  it('normalizes invalid filters and keeps picture binding only with picture books', () => {
    expect(
      readFilters(
        convertToParamMap({
          category: 'BOARD_BOOK',
          binding: 'HARDCOVER',
          age: ['AGE_4_6', 'BAD', 'AGE_4_6'],
          page: '-2',
          sort: 'bad',
        }),
      ),
    ).toEqual({
      q: '',
      category: 'BOARD_BOOK',
      binding: '',
      age: ['AGE_4_6'],
      sort: 'newest',
      page: 1,
    });
    expect(readFilters(convertToParamMap({ page: '2.5', category: 'INVALID' })).page).toBe(1);
    expect(
      filterParams({ ...readFilters(convertToParamMap({})), q: 'MM-000001', page: 2 }),
    ).toEqual({ q: 'MM-000001', page: 2 });
  });
  it('joins only populated title fields without excess separators', () => {
    expect(bookTitle(book)).toBe('A book | Author | 4–6');
  });
  it('uses actual purpose and confirmed price for enquiry', () => {
    expect(enquiryText(book, 'http://localhost:4200/sach/mm-000001')).toContain('7.000 VNĐ');
    expect(
      enquiryText({ ...book, availability: 'SOLD' }, 'http://localhost:4200/sach/mm-000001'),
    ).toContain('sách tương đương');
  });
  it('does not claim sale prices after expiry while awaiting server refresh', () => {
    expect(effectiveBook(book, Date.parse('2026-10-23T13:00:00Z')).priceMinVnd).toBeNull();
    expect(effectiveBook(book, Date.parse('2026-10-23T12:00:00Z')).salePriceVnd).toBe(7000);
    expect(countdown(90061000)).toBe('25:01:01');
    expect(countdown(-1)).toBe('00:00:00');
  });
});
