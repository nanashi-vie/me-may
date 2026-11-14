import { Component, inject, input, signal } from '@angular/core';
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
    (click)="toggle()"
  >
    <svg class="heart-icon" [class.wiggle]="wiggle()" aria-hidden="true" focusable="false"
      width="20" height="20" viewBox="0 0 24 24"
      [attr.fill]="store.has(bookCode()) ? 'currentColor' : 'none'"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      (animationend)="wiggle.set(false)">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
    </svg>
    <span class="heart-label" aria-hidden="true">
      <span [class.visible]="!store.has(bookCode())">Quan tâm</span>
      <span [class.visible]="store.has(bookCode())">Đã quan tâm</span>
    </span>
  </button>`,
  styles: `
    :host {
      display: flex;
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
      gap: 0.35rem;
      white-space: nowrap;
    }
    .heart[aria-pressed='true'] {
      color: var(--red);
      border-color: var(--red);
    }
    .heart-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      transform-origin: center;
    }
    .heart-label { display: grid; }
    .heart-label > span { grid-area: 1 / 1; visibility: hidden; }
    .heart-label > .visible { visibility: visible; }
    .wiggle { animation: wishlist-wiggle 0.5s ease-in-out; }
    @keyframes wishlist-wiggle {
      0%, 100% { transform: rotate(0deg); }
      25%, 75% { transform: rotate(-10deg); }
      50% { transform: rotate(10deg); }
    }
    @media (prefers-reduced-motion: reduce) { .wiggle { animation: none; } }
  `,
})
export class WishlistButton {
  readonly bookCode = input.required<string>();
  readonly title = input.required<string>();
  readonly store = inject(WishlistStore);
  readonly wiggle = signal(false);

  toggle() {
    const wasSaved = this.store.has(this.bookCode());
    this.store.toggle(this.bookCode());
    this.wiggle.set(!wasSaved && this.store.has(this.bookCode()));
  }
}
