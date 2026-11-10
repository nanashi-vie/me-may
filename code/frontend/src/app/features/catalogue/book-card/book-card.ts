import { publicPicture } from '../catalogue-state';
import { Component, computed, input, signal } from '@angular/core';
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
  readonly failedCover = signal<string | undefined>(undefined);
  readonly cover = computed(() => {
    const front = this.front();
    if (!front) return null;
    const picture = publicPicture(front);
    return picture.src && picture.src !== this.failedCover() ? picture : null;
  });
  readonly book = input.required<PublicBook>();
  readonly now = input(0);
  readonly current = computed(() => effectiveBook(this.book(), this.now()));
  readonly front = computed(() => this.book().media.find((m) => m.role === 'FRONT'));
  readonly range = formatPriceRange;
  readonly price = bookPrice;
  readonly discount = discountPercent;
}
