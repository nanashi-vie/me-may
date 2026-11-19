import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PublicApi } from '../../features/catalogue/public-api';
import { SearchSuggestions } from '../../features/catalogue/public.models';
import {
  SEARCH_DEBOUNCE_MS,
  SEARCH_HISTORY_KEY,
  SearchBar,
  splitHighlight,
} from './search-bar';

describe('SearchBar', () => {
  const sampleSuggestions: SearchSuggestions = {
    keywords: ['Peppa Pig Goes Swimming', 'Ladybird'],
    books: [
      {
        bookCode: 'MM-000123',
        slug: 'peppa-pig-goes-swimming',
        title: 'Peppa Pig Goes Swimming',
        publisher: 'Ladybird',
        priceMinVnd: 85000,
        priceMaxVnd: 85000,
        salePriceVnd: 65000,
        saleEndsAt: null,
        availability: 'AVAILABLE',
        cover: {
          role: 'FRONT',
          alt: 'Peppa',
          contentPath: '/api/v1/books/peppa-pig-goes-swimming/media/FRONT',
        },
      },
    ],
  };

  async function setup(suggestMock = vi.fn(() => of<SearchSuggestions>(sampleSuggestions))) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PublicApi, useValue: { suggest: suggestMock } },
      ],
    });
    const fixture = TestBed.createComponent(SearchBar);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector('input#site-search') as HTMLInputElement;
    return { fixture, el, input, navigateSpy, suggestMock };
  }

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('splits highlight segments case-insensitively', () => {
    expect(splitHighlight('Tôi thấy hoa vàng', 'tôi')).toEqual([
      { text: 'Tôi', match: true },
      { text: ' thấy hoa vàng', match: false },
    ]);
    expect(splitHighlight('Board Book', 'xyz')).toEqual([{ text: 'Board Book', match: false }]);
  });

  it('renders pill search controls and visual search button is a silent no-op', async () => {
    const { el, navigateSpy } = await setup();
    expect(el.querySelector('.search-submit')).toBeTruthy();
    const visualBtn = el.querySelector('.search-visual-btn') as HTMLButtonElement;
    expect(visualBtn).toBeTruthy();
    expect(visualBtn.querySelector('svg[viewBox="0 0 485 485"]')).toBeTruthy();
    visualBtn.click();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('keeps panel closed on empty focus when no history exists, and shows history when present', async () => {
    const { fixture, el, input } = await setup();
    input.dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    expect(el.querySelector('.search-panel')).toBeNull();

    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(['usborne', 'peppa']));
    TestBed.resetTestingModule();
    const s2 = await setup();
    s2.input.dispatchEvent(new Event('focus'));
    s2.fixture.detectChanges();

    const rows = s2.el.querySelectorAll('.history-row');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('usborne');

    const removeBtn = rows[0].querySelector('.history-remove') as HTMLButtonElement;
    removeBtn.click();
    s2.fixture.detectChanges();
    expect(s2.el.querySelectorAll('.history-row').length).toBe(1);
    expect(JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]')).toEqual(['peppa']);

    const clearAllBtn = s2.el.querySelector('.panel-clear-all') as HTMLButtonElement;
    clearAllBtn.click();
    s2.fixture.detectChanges();
    expect(s2.el.querySelector('.search-panel')).toBeNull();
    expect(localStorage.getItem(SEARCH_HISTORY_KEY)).toBeNull();
  });

  it('saves submitted search to history with dedup and limit 8', async () => {
    localStorage.setItem(
      SEARCH_HISTORY_KEY,
      JSON.stringify(['k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7', 'k8']),
    );
    const { fixture, el, input, navigateSpy } = await setup();
    input.value = 'Peppa';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const form = el.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(navigateSpy).toHaveBeenCalledWith(['/sach'], { queryParams: { q: 'Peppa' } });
    const saved = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
    expect(saved.length).toBe(8);
    expect(saved[0]).toBe('Peppa');
    expect(saved).not.toContain('k8');
  });

  it('debounces 300ms before fetching suggestions and supports selecting keyword or book', async () => {
    vi.useFakeTimers();
    const { fixture, el, input, suggestMock, navigateSpy } = await setup();

    input.dispatchEvent(new Event('focus'));
    input.value = 'peppa';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 50);
    expect(suggestMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    fixture.detectChanges();
    expect(suggestMock).toHaveBeenCalledWith('peppa');

    const keywordRows = el.querySelectorAll('.keyword-row');
    expect(keywordRows.length).toBe(2);
    expect(keywordRows[0].querySelector('.match-bold')?.textContent).toBe('Peppa');

    const bookRows = el.querySelectorAll('.book-row');
    expect(bookRows.length).toBe(1);
    expect(bookRows[0].textContent).toContain('MM-000123');

    (bookRows[0] as HTMLElement).click();
    fixture.detectChanges();
    expect(navigateSpy).toHaveBeenCalledWith(['/sach', 'peppa-pig-goes-swimming']);
  });

  it('clears query with clear button and supports keyboard navigation', async () => {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(['board book', 'usborne']));
    const { fixture, el, input, navigateSpy } = await setup();

    input.dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();
    expect(el.querySelectorAll('.history-row')[0].classList.contains('active')).toBe(true);

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    expect(navigateSpy).toHaveBeenCalledWith(['/sach'], { queryParams: { q: 'board book' } });

    input.value = 'abc';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const clearBtn = el.querySelector('.search-clear') as HTMLButtonElement;
    expect(clearBtn).toBeTruthy();
    clearBtn.click();
    fixture.detectChanges();
    expect(input.value).toBe('');
  });
});

