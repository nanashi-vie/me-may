import {
  AgeGroup,
  CategoryCode,
  Binding,
  ReadingLevel,
  Availability,
  Page,
  Taxonomy,
} from '../admin/books/book.models';
export type { Page, Taxonomy, AgeGroup, CategoryCode, Binding };
export interface PublicVariant { id: string; name: string | null; available: boolean; }
export interface PublicBook {
  variants: PublicVariant[];
  id: string;
  bookCode: string;
  slug: string;
  title: string;
  publisher: string | null;
  author: string | null;
  ageGroups: AgeGroup[];
  categoryCode: CategoryCode;
  binding: Binding | null;
  conditionGrade: string | null;
  conditionNote: string;
  priceMinVnd: number | null;
  priceMaxVnd: number | null;
  salePriceVnd: number | null;
  weightG: number | null;
  saleEndsAt: string | null;
  description: string | null;
  readingLevel: ReadingLevel | null;
  readingVideoUrl: string | null;
  availability: Availability;
  media: { role: string; alt: string | null; contentPath: string }[];
}
export interface Collection {
  slug: string;
  name: string;
}
export interface HomeData {
  shelves: { title: string; href: string; books: PublicBook[] }[];
}
export interface ContactConfig {
  hotlineUrl: string | null;
  groupUrl: string | null;
}
export interface FlashSale {
  serverNow: string;
  endsAt: string | null;
  items: PublicBook[];
}
export interface Campaign {
  version: number;
  enabled: boolean;
  startsAt: string | null;
  endsAt: string | null;
  items: { bookCode: string; salePriceVnd: number }[];
}
export interface CatalogueFilter {
  q: string;
  category: string;
  binding: string;
  age: string[];
  sort: string;
  page: number;
}
