import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it } from 'vitest';
import { WishlistButton } from './wishlist-button';
import { WishlistStore, WISHLIST_STORAGE, WISHLIST_KEY } from './wishlist-store';

describe('Accessible wishlist heart', () => {
  afterEach(() => { TestBed.resetTestingModule(); localStorage.clear(); });
  function setup(saved: string[] = []) {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(saved));
    TestBed.configureTestingModule({ providers: [provideRouter([]),
      { provide: WISHLIST_STORAGE, useValue: () => localStorage }] });
    const f = TestBed.createComponent(WishlistButton);
    f.componentRef.setInput('bookCode', 'MM-000001');
    f.componentRef.setInput('title', 'Moon');
    const store = TestBed.inject(WishlistStore); store.initialize(); f.detectChanges();
    const button = f.nativeElement.querySelector('button') as HTMLButtonElement;
    return { f, store, button };
  }
  it('shows compact labels with accessible add/remove state and no anchor parent', () => {
    const { f, button, store } = setup();
    expect(button.getAttribute('aria-label')).toBe('Lưu vào danh sách quan tâm: Moon — MM-000001');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.querySelector('.heart-label .visible')?.textContent?.trim()).toBe('Quan tâm');
    button.click(); f.detectChanges();
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Bỏ khỏi danh sách quan tâm: Moon — MM-000001');
    expect(button.querySelector('.heart-label .visible')?.textContent?.trim()).toBe('Đã quan tâm');
    expect(button.closest('a')).toBeNull();
    button.click(); f.detectChanges();
    expect(store.codes()).toEqual([]);
  });
  it('animates only a successful user add, resets after animation and can animate a later add', () => {
    const { f, button } = setup();
    const icon = button.querySelector('svg');
    expect(icon).toBeTruthy();
    expect(icon!.classList.contains('wiggle')).toBe(false);
    button.click(); f.detectChanges();
    expect(icon!.classList.contains('wiggle')).toBe(true);
    expect(icon!.getAttribute('fill')).toBe('currentColor');
    icon!.dispatchEvent(new Event('animationend')); f.detectChanges();
    expect(icon!.classList.contains('wiggle')).toBe(false);
    button.click(); f.detectChanges();
    expect(icon!.getAttribute('fill')).toBe('none');
    expect(icon!.classList.contains('wiggle')).toBe(false);
    button.click(); f.detectChanges();
    expect(icon!.classList.contains('wiggle')).toBe(true);
  });
  it('restores a saved filled heart without playing the interaction animation', () => {
    const { button } = setup(['MM-000001']);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.querySelector('svg')?.getAttribute('fill')).toBe('currentColor');
    expect(button.querySelector('svg')?.classList.contains('wiggle')).toBe(false);
  });
  it('does not animate or claim saved when the wishlist is already full', () => {
    const saved = Array.from({ length: 100 }, (_, i) => 'MM-' + String(i + 2).padStart(6, '0'));
    const { f, button, store } = setup(saved);
    button.click(); f.detectChanges();
    expect(store.has('MM-000001')).toBe(false);
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.querySelector('svg')?.classList.contains('wiggle')).toBe(false);
    expect(store.warning()).toContain('100');
  });
});
