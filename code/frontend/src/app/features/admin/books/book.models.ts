export type Publication = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type Availability = 'AVAILABLE' | 'SOLD';
export type MediaRole = 'FRONT' | 'BACK' | 'INSIDE';
export type Binding = 'PAPERBACK' | 'HARDCOVER';
export type CategoryCode =
  | 'BOARD_BOOK'
  | 'PICTURE_BOOK'
  | 'ENCYCLOPEDIA_SCIENCE'
  | 'HISTORY'
  | 'CHAPTER'
  | 'STORY_COLLECTION';
export type AgeGroup = 'AGE_0_3' | 'AGE_4_6' | 'AGE_7_9' | 'AGE_10_PLUS';
export type ReadingLevel = 'PRE_A1' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export interface BookWrite {
  title: string | null;
  isbn: string | null;
  publisher: string | null;
  author: string | null;
  language: string | null;
  binding: Binding | null;
  conditionGrade: 'VERY_GOOD' | 'GOOD' | 'FAIR' | null;
  conditionNote: string | null;
  priceVnd: number | null;
  description: string | null;
  categoryCode: CategoryCode | null;
  ageGroups: AgeGroup[];
  readingLevel: ReadingLevel | null;
  readingLevelBasis: string | null;
  readingVideoUrl: string | null;
  collectionIds: string[];
}
export interface MediaView {
  id: string;
  role: MediaRole;
  alt: string | null;
  sourceRef: string | null;
  contentPath: string;
}
export interface BookDetail extends BookWrite {
  id: string;
  bookCode: string;
  slug: string;
  version: number;
  publication: Publication;
  availability: Availability;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  media: MediaView[];
}
export interface BookSummary {
  id: string;
  bookCode: string;
  title: string | null;
  priceVnd: number | null;
  publication: Publication;
  availability: Availability;
  version: number;
  updatedAt: string;
  frontContentPath: string | null;
}
export interface BookFilter {
  q?: string;
  publication?: Publication;
  availability?: Availability;
  page?: number;
  size?: number;
}
export interface Page<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
export interface PreviewBook {
  bookCode: string;
  slug: string;
  title: string | null;
  publisher: string | null;
  author: string | null;
  ageGroups: AgeGroup[];
  categoryCode: CategoryCode | null;
  binding: Binding | null;
  conditionGrade: string | null;
  conditionNote: string | null;
  priceVnd: number | null;
  description: string | null;
  readingLevel: ReadingLevel | null;
  readingVideoUrl: string | null;
  availability: Availability;
  media: Omit<MediaView, 'sourceRef'>[];
}
export interface AuditSummary {
  id: string;
  actorId: string;
  action: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  aggregateVersion: number;
  createdAt: string;
}
export interface TaxonomyOption<T extends string = string> {
  code: T;
  label: string;
  sortOrder: number;
}
export interface Taxonomy {
  categories: TaxonomyOption<CategoryCode>[];
  ageGroups: TaxonomyOption<AgeGroup>[];
  bindings: TaxonomyOption<Binding>[];
  readingLevels: TaxonomyOption<ReadingLevel>[];
}
export interface AdminApiError {
  error: string;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  currentVersion?: number;
}
