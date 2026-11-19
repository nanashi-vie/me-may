import { DOCUMENT } from '@angular/common';
import {
  Component,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { formatPrice, formatPriceRange } from '../../features/admin/books/book-copy';
import { publicPicture } from '../../features/catalogue/catalogue-state';
import { PublicApi } from '../../features/catalogue/public-api';
import { BookSuggestion, SearchSuggestions } from '../../features/catalogue/public.models';

export const SEARCH_HISTORY_KEY = 'memay.searchHistory.v1';
export const SEARCH_HISTORY_LIMIT = 8;
export const SEARCH_DEBOUNCE_MS = 300;

export interface HighlightSegment {
  text: string;
  match: boolean;
}

export function splitHighlight(text: string, query: string): HighlightSegment[] {
  const q = query.trim();
  if (!q) return [{ text, match: false }];
  const lowerText = text.toLocaleLowerCase();
  const lowerQ = q.toLocaleLowerCase();
  const idx = lowerText.indexOf(lowerQ);
  if (idx === -1) return [{ text, match: false }];
  const parts: HighlightSegment[] = [];
  if (idx > 0) parts.push({ text: text.slice(0, idx), match: false });
  parts.push({ text: text.slice(idx, idx + q.length), match: true });
  if (idx + q.length < text.length) parts.push({ text: text.slice(idx + q.length), match: false });
  return parts;
}

type NavItem =
  | { kind: 'history'; value: string }
  | { kind: 'keyword'; value: string }
  | { kind: 'book'; book: BookSuggestion }
  | { kind: 'all'; value: string };

@Component({
  selector: 'app-search-bar',
  templateUrl: './search-bar.html',
  styleUrl: './search-bar.scss',
  host: {
    class: 'header-search',
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
  },
})
export class SearchBar {
  readonly initialQuery = input('');
  readonly query = signal('');
  readonly focused = signal(false);
  readonly history = signal<string[]>([]);
  readonly loading = signal(false);
  readonly suggestions = signal<SearchSuggestions>({ keywords: [], books: [] });
  readonly activeIndex = signal(-1);
  readonly failedCovers = signal<Record<string, boolean>>({});

  readonly trimmedQuery = computed(() => this.query().trim());
  readonly showHistory = computed(() => this.trimmedQuery().length === 0 && this.history().length > 0);
  readonly showSuggestions = computed(() => this.trimmedQuery().length > 0);
  readonly panelOpen = computed(() => this.focused() && (this.showHistory() || this.showSuggestions()));

  readonly navItems = computed<NavItem[]>(() => {
    if (this.showHistory()) {
      return this.history().map((value) => ({ kind: 'history', value }));
    }
    if (this.showSuggestions()) {
      const s = this.suggestions();
      const items: NavItem[] = [
        ...s.keywords.map((value) => ({ kind: 'keyword' as const, value })),
        ...s.books.map((book) => ({ kind: 'book' as const, book })),
        { kind: 'all', value: this.trimmedQuery() },
      ];
      return items;
    }
    return [];
  });

  readonly hasAnySuggestion = computed(
    () => this.suggestions().keywords.length > 0 || this.suggestions().books.length > 0,
  );

  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly inputRef = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  private readonly router = inject(Router);
  private readonly api = inject(PublicApi);
  private readonly doc = inject(DOCUMENT);
  private readonly queryStream = new Subject<string>();

  readonly highlight = splitHighlight;
  readonly formatPrice = formatPrice;
  readonly formatPriceRange = formatPriceRange;

  constructor() {
    effect(() => {
      const next = this.initialQuery();
      this.query.set(next);
    });

    afterNextRender(() => {
      this.loadHistory();
    });

    this.queryStream
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        switchMap((term) => {
          if (!term) {
            this.loading.set(false);
            return of<SearchSuggestions>({ keywords: [], books: [] });
          }
          this.loading.set(true);
          return this.api.suggest(term).pipe(
            catchError(() => of<SearchSuggestions>({ keywords: [], books: [] })),
            tap(() => this.loading.set(false)),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.suggestions.set(result);
        this.activeIndex.set(-1);
      });
  }

  onFocus() {
    this.focused.set(true);
    this.activeIndex.set(-1);
    const term = this.trimmedQuery();
    if (term && !this.hasAnySuggestion() && !this.loading()) {
      this.queryStream.next(term);
    }
  }

  onInput(value: string) {
    this.query.set(value);
    this.focused.set(true);
    this.activeIndex.set(-1);
    const term = value.trim();
    if (!term) {
      this.loading.set(false);
      this.suggestions.set({ keywords: [], books: [] });
      this.queryStream.next('');
      return;
    }
    this.loading.set(true);
    this.queryStream.next(term);
  }

  clearInput() {
    this.query.set('');
    this.loading.set(false);
    this.suggestions.set({ keywords: [], books: [] });
    this.activeIndex.set(-1);
    this.queryStream.next('');
    this.focused.set(true);
    this.inputRef()?.nativeElement.focus();
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (this.panelOpen()) {
        event.preventDefault();
        this.close();
      }
      return;
    }
    const items = this.navItems();
    if (!this.panelOpen() || items.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex.update((i) => (i + 1) % items.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex.update((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (event.key === 'Enter' && this.activeIndex() >= 0) {
      const selected = items[this.activeIndex()];
      if (selected) {
        event.preventDefault();
        if (selected.kind === 'book') this.selectBook(selected.book);
        else this.submitQuery(selected.value);
      }
    }
  }

  onSubmit(event: Event) {
    event.preventDefault();
    this.submitQuery(this.query());
  }

  submitQuery(raw: string) {
    const term = raw.trim();
    this.query.set(term);
    if (term) this.saveHistory(term);
    this.close();
    this.inputRef()?.nativeElement.blur();
    void this.router.navigate(['/sach'], {
      queryParams: term ? { q: term } : {},
    });
  }

  selectBook(book: BookSuggestion) {
    const term = this.trimmedQuery();
    if (term) this.saveHistory(term);
    this.close();
    this.inputRef()?.nativeElement.blur();
    void this.router.navigate(['/sach', book.slug]);
  }

  removeHistoryItem(term: string, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const updated = this.history().filter(
      (item) => item.toLocaleLowerCase() !== term.toLocaleLowerCase(),
    );
    this.history.set(updated);
    this.persistHistory(updated);
    this.activeIndex.set(-1);
  }

  clearHistory(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.history.set([]);
    this.persistHistory([]);
    this.activeIndex.set(-1);
  }

  onVisualSearchClick(event: Event) {
    event.preventDefault();
  }

  coverPicture(book: BookSuggestion) {
    if (!book.cover || this.failedCovers()[book.slug]) return null;
    const picture = publicPicture(book.cover);
    return picture.src ? picture : null;
  }

  onCoverError(slug: string) {
    this.failedCovers.update((prev) => ({ ...prev, [slug]: true }));
  }

  hasActiveSale(book: BookSuggestion): boolean {
    if (book.salePriceVnd === null) return false;
    if (book.saleEndsAt && Date.now() >= Date.parse(book.saleEndsAt)) return false;
    return true;
  }

  keywordNavIndex(idx: number): number {
    return idx;
  }

  bookNavIndex(idx: number): number {
    return this.suggestions().keywords.length + idx;
  }

  allNavIndex(): number {
    return this.suggestions().keywords.length + this.suggestions().books.length;
  }

  onDocumentPointerDown(event: Event) {
    if (!this.focused()) return;
    const host = this.hostRef.nativeElement;
    if (event.target instanceof Node && !host.contains(event.target)) {
      this.close();
    }
  }

  close() {
    this.focused.set(false);
    this.activeIndex.set(-1);
  }

  private loadHistory() {
    try {
      const raw = this.doc.defaultView?.localStorage?.getItem(SEARCH_HISTORY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed
          .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          .map((item) => item.trim())
          .slice(0, SEARCH_HISTORY_LIMIT);
        this.history.set(cleaned);
      }
    } catch {
      // Ignore storage access or malformed JSON errors.
    }
  }

  private saveHistory(term: string) {
    const lower = term.toLocaleLowerCase();
    const next = [
      term,
      ...this.history().filter((item) => item.toLocaleLowerCase() !== lower),
    ].slice(0, SEARCH_HISTORY_LIMIT);
    this.history.set(next);
    this.persistHistory(next);
  }

  private persistHistory(items: string[]) {
    try {
      if (items.length === 0) {
        this.doc.defaultView?.localStorage?.removeItem(SEARCH_HISTORY_KEY);
      } else {
        this.doc.defaultView?.localStorage?.setItem(SEARCH_HISTORY_KEY, JSON.stringify(items));
      }
    } catch {
      // Keep in-memory history when storage is unavailable.
    }
  }
}
