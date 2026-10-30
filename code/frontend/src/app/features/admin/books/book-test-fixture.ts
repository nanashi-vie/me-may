import { buildBookForm, toBookWrite } from './book-form';
import { BookDetail } from './book.models';
export function testBook(): BookDetail {
  return {
    ...toBookWrite(buildBookForm()),
    variants: [{id:'variant-1',name:null,stock:1}],
    totalStock: 1,
    id: '1',
    bookCode: 'MM-000001',
    slug: 'mm-000001',
    version: 0,
    publication: 'ARCHIVED',
    availability: 'AVAILABLE',
    publishedAt: null,
    createdAt: '2026-10-22T00:00:00Z',
    updatedAt: '2026-10-22T00:00:00Z',
    media: [],
  };
}
