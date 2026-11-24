import { Component, computed, ElementRef, input, signal, viewChild } from '@angular/core';
import { BookCard } from '../book-card/book-card';
import { PublicBook } from '../public.models';

const VISIBLE = 5;

/** Kệ sách ngang dùng chung cho Home và book-detail; thêm class `flat-cards` để bỏ viền thẻ. */
@Component({
  selector: 'app-book-carousel',
  imports: [BookCard],
  templateUrl: './book-carousel.html',
  styleUrl: './book-carousel.scss',
})
export class BookCarousel {
  readonly books = input.required<readonly PublicBook[]>();
  readonly label = input.required<string>();
  readonly now = input(0);
  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');
  private readonly maxIndex = computed(() => Math.max(0, this.books().length - VISIBLE));
  private readonly index = signal(0);
  readonly atStart = signal(true);
  readonly atEnd = signal(false);
  readonly hasNav = computed(() => this.maxIndex() > 0);

  scroll(dir: -1 | 1) {
    const el = this.track().nativeElement;
    const next = Math.max(0, Math.min(this.maxIndex(), this.index() + dir));
    this.index.set(next);
    const left = dir * this.step(el);
    if (typeof el.scrollBy === 'function') el.scrollBy({ left, behavior: 'smooth' });
    else el.scrollLeft += left;
    this.atStart.set(next <= 0);
    this.atEnd.set(next >= this.maxIndex());
  }

  onScroll() {
    const el = this.track().nativeElement;
    if (el.scrollWidth <= el.clientWidth) return;
    this.atStart.set(el.scrollLeft <= 4);
    this.atEnd.set(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
    const approx = Math.round(el.scrollLeft / this.step(el));
    this.index.set(Math.max(0, Math.min(this.maxIndex(), approx)));
  }

  private step(el: HTMLElement): number {
    const [first, second] = Array.from(el.children) as HTMLElement[];
    return second?.offsetLeft - first?.offsetLeft || 220;
  }
}
