import { Component, input, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicBook } from './public.models';
import { formatPrice } from '../admin/books/book-copy';
import { effectiveBook } from './catalogue-state';
import { WishlistButton } from '../wishlist/wishlist-button';
@Component({
  selector: 'app-book-card',
  imports: [RouterLink, WishlistButton],
  template: ` <article class="book-card">
    <a [routerLink]="['/sach', book().slug]" class="cover-link" tabindex="-1" aria-hidden="true">
      @if (front()) {
        <img
          [src]="front()!.contentPath"
          [alt]="front()!.alt || book().title"
          loading="lazy"
          width="240"
          height="300"
        />
      }
    </a>
    <p class="book-code">{{ book().bookCode }}</p>
    <h3>
      <a [routerLink]="['/sach', book().slug]">{{ book().title }}</a>
    </h3>
    <p class="price">
      {{ price(current().priceVnd) }}
      @if (discount()) {
        <span class="discount">−{{ discount() }}%</span>
      }
    </p>
    @if (current().originalPriceVnd) {
      <del>{{ price(current().originalPriceVnd) }}</del>
    }
    @if (current().priceVnd === null) {
      <small>Đang chờ xác nhận giá</small>
    }
    <span class="stock" [class.sold]="book().availability === 'SOLD'">{{
      book().availability === 'SOLD' ? 'Hết hàng' : 'Còn hàng'
    }}</span>
    <app-wishlist-button [bookCode]="book().bookCode" [title]="book().title" />
  </article>`,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .book-card {
      height: 100%;
      display: flex;
      flex-direction: column;
      padding: 14px;
      background: #fff;
      border-radius: 7px;
    }
    .cover-link {
      display: grid;
      place-items: center;
      aspect-ratio: 4/5;
      background: #faf8f4;
    }
    .cover-link img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      max-height: 260px;
    }
    h3 {
      font-size: 1rem;
      line-height: 1.45;
      margin: 0.25rem 0 0.65rem;
      min-height: 2.9em;
    }
    h3 a {
      color: var(--ink);
      text-decoration: none;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .book-code {
      font-size: 0.75rem;
      color: var(--muted);
      margin: 0.7rem 0 0;
    }
    .price {
      font-weight: 750;
      color: var(--red);
      margin: auto 0 0;
    }
    .discount {
      font-size: 0.7rem;
      background: var(--red);
      color: #fff;
      padding: 0.2rem 0.3rem;
      border-radius: 3px;
    }
    del {
      font-size: 0.8rem;
      color: var(--muted);
    }
    .stock {
      font-size: 0.75rem;
      color: #365942;
      margin-top: 0.4rem;
    }
    .sold {
      color: #8e4b35;
    }
    @media (max-width: 480px) {
      .book-card {
        padding: 8px;
      }
      h3 {
        font-size: 0.9rem;
      }
    }
  `,
})
export class BookCard {
  readonly book = input.required<PublicBook>();
  readonly now = input(0);
  readonly current = computed(() => effectiveBook(this.book(), this.now()));
  readonly front = computed(() => this.book().media.find((m) => m.role === 'FRONT'));
  readonly discount = computed(() => {
    const b = this.current();
    return b.originalPriceVnd && b.priceVnd
      ? Math.floor((1 - b.priceVnd / b.originalPriceVnd) * 100)
      : 0;
  });
  readonly price = formatPrice;
}
