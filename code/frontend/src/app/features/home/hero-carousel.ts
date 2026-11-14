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
  readonly outgoing = signal<HeroBanner | null>(null);
  readonly direction = signal<'ltr' | 'rtl'>('rtl');
  private readonly doc = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private ready = false;
  private focused = false;
  private reducedMotion = false;
  private timer?: ReturnType<typeof setTimeout>;
  constructor() {
    const destroy = inject(DestroyRef);
    afterNextRender(() => {
      if (!this.browser || destroy.destroyed) return;
      this.ready = true;
      const preference = this.doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)');
      this.reducedMotion = preference?.matches ?? false;
      this.paused.set(this.reducedMotion);
      const visibility = () => {
        this.outgoing.set(null);
        this.schedule();
      };
      const motion = (event: MediaQueryListEvent) => {
        this.reducedMotion = event.matches;
        if (event.matches) {
          this.paused.set(true);
          this.outgoing.set(null);
        }
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
    this.outgoing.set(null);
    this.active.set(0);
    this.broken.set(new Set());
    this.schedule();
  }
  slides() {
    return this.banners.slice(0, 10).filter((b) => !this.broken().has(b.id));
  }
  current() {
    return this.slides()[this.active()] ?? null;
  }
  choose(index: number, direction: 'ltr' | 'rtl' = 'rtl') {
    const before = this.current();
    const count = this.slides().length;
    this.active.set(count ? (index + count) % count : 0);
    this.direction.set(direction);
    this.outgoing.set(
      this.ready && !this.reducedMotion && before && before.id !== this.current()?.id ? before : null,
    );
    this.schedule();
  }
  next(delta: number) {
    this.choose(this.active() + delta, delta < 0 ? 'ltr' : 'rtl');
  }
  finishTransition(event: AnimationEvent) {
    if (event.target === event.currentTarget) this.outgoing.set(null);
  }
  togglePause() {
    this.paused.update((p) => !p);
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
    this.outgoing.set(null);
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
      this.focused ||
      this.doc.hidden ||
      this.slides().length < 2
    )
      return;
    this.timer = setTimeout(() => this.next(1), 5000);
  }
}
