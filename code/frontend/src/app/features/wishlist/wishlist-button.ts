import { Component, inject, input } from '@angular/core';
import { WishlistStore } from './wishlist-store';

@Component({
  selector: 'app-wishlist-button',
  template: `<button
    type="button"
    class="heart secondary"
    [disabled]="!store.ready()"
    [attr.aria-pressed]="store.has(bookCode())"
    [attr.aria-label]="
      (store.has(bookCode()) ? 'Bỏ khỏi danh sách quan tâm: ' : 'Lưu vào danh sách quan tâm: ') +
      title() +
      ' — ' +
      bookCode()
    "
    (click)="store.toggle(bookCode())"
  >
    <span aria-hidden="true">{{ store.has(bookCode()) ? '♥' : '♡' }}</span>
    {{ store.has(bookCode()) ? 'Đã thêm vào danh sách' : 'Thêm vào danh sách quan tâm' }}
  </button>`,
  styles: `
    :host {
      display: block;
    }
    .heart {
      min-height: 44px;
      margin-top: var(--heart-gap, 0.6rem);
      width: var(--heart-width, 100%);
      font-size: 0.78rem;
      line-height: 1.25;
      padding: 0.45rem 0.5rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      word-break: break-word;
    }
    .heart[aria-pressed='true'] {
      color: var(--red);
      border-color: var(--red);
    }
    .heart span {
      font-size: 1.15rem;
      vertical-align: middle;
      margin-right: 0.25rem;
      flex-shrink: 0;
    }
  `,
})
export class WishlistButton {
  readonly bookCode = input.required<string>();
  readonly title = input.required<string>();
  readonly store = inject(WishlistStore);
}
