import { Component, inject, input } from '@angular/core';
import { WishlistStore } from './wishlist-store';

@Component({
  selector: 'app-wishlist-button',
  template: `<button type="button" class="heart secondary" [disabled]="!store.ready()"
    [attr.aria-pressed]="store.has(bookCode())"
    [attr.aria-label]="(store.has(bookCode()) ? 'Bỏ khỏi danh sách quan tâm: ' : 'Lưu vào danh sách quan tâm: ') + title() + ' — ' + bookCode()"
    (click)="store.toggle(bookCode())">
    <span aria-hidden="true">{{ store.has(bookCode()) ? '♥' : '♡' }}</span>
    {{ store.has(bookCode()) ? 'Đã quan tâm' : 'Quan tâm' }}
  </button>`,
  styles: `:host { display: block; } .heart { min-height: 44px; margin-top: .6rem; font-size: .82rem; padding: .5rem .65rem; }
    .heart[aria-pressed="true"] { color: var(--red); border-color: var(--red); }
    .heart span { font-size: 1.2rem; vertical-align: middle; margin-right: .25rem; }`,
})
export class WishlistButton {
  readonly bookCode = input.required<string>();
  readonly title = input.required<string>();
  readonly store = inject(WishlistStore);
}
