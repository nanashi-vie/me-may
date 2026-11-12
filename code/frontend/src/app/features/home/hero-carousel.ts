import {
  Component,
  Input,
  OnChanges,
  PLATFORM_ID,
  inject,
  signal,
  afterNextRender,
  DestroyRef,
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HeroBanner } from '../catalogue/public.models';
const fallback: HeroBanner = {
  id: 'fallback',
  src: '/images/hero-banner-1584.webp',
  srcset: '/images/hero-banner-800.webp 800w, /images/hero-banner-1584.webp 1584w',
  width: 1584,
  height: 396,
  alt: 'Tiệm sách ngoại văn Mẹ Mây. Pre-loved books, endless stories. Sách đã qua sử dụng tuyển chọn cho 0–16 tuổi. Ảnh và tình trạng thật, giá rẻ, đa dạng thể loại.',
};
@Component({
  selector: 'app-hero-carousel',
  imports: [RouterLink],
  templateUrl: './hero-carousel.html',
  styleUrl: './hero-carousel.scss',
})
export class HeroCarousel implements OnChanges {
  @Input() banners: HeroBanner[] = [];
  readonly active = signal(0);
  readonly paused = signal(false);
  readonly broken = signal(new Set<string>());
  readonly fallbackBroken = signal(false);
  private readonly doc = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private ready = false;
  private hovering = false;
  private focused = false;
  private timer?: ReturnType<typeof setTimeout>;
  constructor() {
    const destroy = inject(DestroyRef);
    afterNextRender(() => {
      if (!this.browser || destroy.destroyed) return;
      this.ready = true;
      const preference = this.doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)');
      this.paused.set(preference?.matches ?? false);
      const visibility = () => this.schedule();
      const motion = (event: MediaQueryListEvent) => {
        if (event.matches) this.paused.set(true);
        this.schedule();
      };
      this.doc.addEventListener('visibilitychange', visibility);
      preference?.addEventListener('change', motion);
      destroy.onDestroy(() => {
        this.doc.removeEventListener('visibilitychange', visibility);
        preference?.removeEventListener('change', motion);
      });
      this.schedule();
    });
    destroy.onDestroy(() => {
      this.ready = false;
      this.clear();
    });
  }
  ngOnChanges() {
    this.active.set(0);
    this.broken.set(new Set());
    this.fallbackBroken.set(false);
    this.schedule();
  }
  slides() {
    return this.banners.slice(0, 10).filter((b) => !this.broken().has(b.id));
  }
  current() {
    return this.slides()[this.active()] ?? fallback;
  }
  choose(index: number) {
    const count = this.slides().length;
    this.active.set(count ? (index + count) % count : 0);
    this.schedule();
  }
  next(delta: number) {
    this.choose(this.active() + delta);
  }
  togglePause() {
    this.paused.update((p) => !p);
    this.schedule();
  }
  hover(value: boolean) {
    this.hovering = value;
    this.schedule();
  }
  focus(value: boolean) {
    this.focused = value;
    this.schedule();
  }
  focusOut(event: FocusEvent) {
    if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null))
      this.focus(false);
  }
  failed(id: string) {
    if (id === 'fallback') {
      this.fallbackBroken.set(true);
      return;
    }
    this.broken.update((b) => new Set([...b, id]));
    this.active.set(0);
    this.schedule();
  }
  private clear() {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
  }
  private schedule() {
    this.clear();
    if (
      !this.ready ||
      this.paused() ||
      this.hovering ||
      this.focused ||
      this.doc.hidden ||
      this.slides().length < 2
    )
      return;
    this.timer = setTimeout(() => this.next(1), 5000);
  }
}
