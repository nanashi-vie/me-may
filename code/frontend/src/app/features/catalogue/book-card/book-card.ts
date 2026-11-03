import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatPriceRange } from '../../admin/books/book-copy';
import { WishlistButton } from '../../wishlist/wishlist-button';
import { bookPrice, discountPercent, effectiveBook } from '../catalogue-state';
import { PublicBook } from '../public.models';

@Component({
  selector: 'app-book-card',
  imports: [RouterLink, WishlistButton],
  templateUrl: './book-card.html',
  styleUrl: './book-card.scss',
})
export class BookCard {
  readonly book = input.required<PublicBook>();
  readonly now = input(0);
  readonly current = computed(() => effectiveBook(this.book(), this.now()));
  readonly front = computed(() => this.book().media.find((m) => m.role === 'FRONT'));
  readonly range = formatPriceRange;
  readonly price = bookPrice;
  readonly discount = discountPercent;
}
