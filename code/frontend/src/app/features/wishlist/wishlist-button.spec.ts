import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WishlistButton } from './wishlist-button';
import { WishlistStore, WISHLIST_STORAGE } from './wishlist-store';

describe('Accessible wishlist heart', () => {
  it('toggles one book with a labelled pressed state without an anchor parent', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: WISHLIST_STORAGE, useValue: () => localStorage }],
    });
    localStorage.clear();
    const f = TestBed.createComponent(WishlistButton);
    f.componentRef.setInput('bookCode', 'MM-000001');
    f.componentRef.setInput('title', 'Moon');
    TestBed.inject(WishlistStore).initialize();
    f.detectChanges();
    const button: HTMLButtonElement = f.nativeElement.querySelector('button');
    expect(button.getAttribute('aria-label')).toBe('Lưu vào danh sách quan tâm: Moon — MM-000001');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.textContent).toContain('Thêm vào danh sách quan tâm');
    button.click();
    f.detectChanges();
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Bỏ khỏi danh sách quan tâm: Moon — MM-000001');
    expect(button.textContent).toContain('Đã thêm vào danh sách');
    expect(button.closest('a')).toBeNull();
    button.click();
    expect(TestBed.inject(WishlistStore).codes()).toEqual([]);
  });
});
