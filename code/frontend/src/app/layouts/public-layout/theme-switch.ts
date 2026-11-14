import { DOCUMENT } from '@angular/common';
import { afterNextRender, Component, DestroyRef, effect, ElementRef, inject,
  InjectionToken, input, output, signal, viewChild } from '@angular/core';
import type { ThemeAnimation } from './theme-rive';

export const THEME_ANIMATION_LOADER = new InjectionToken<() => Promise<typeof import('./theme-rive')>>(
  'Deferred theme animation', { providedIn: 'root', factory: () => () => import('./theme-rive') },
);

@Component({
  selector: 'app-theme-switch',
  template: `<button type="button" role="switch" class="theme-switch"
    aria-label="Chế độ tối" [attr.aria-checked]="dark()"
    [title]="dark() ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'"
    (click)="darkChange.emit(!dark())">
    <canvas #canvas width="88" height="88" aria-hidden="true" [style.opacity]="ready() ? 1 : 0"></canvas>
    <svg [style.visibility]="ready() ? 'hidden' : null" viewBox="0 0 44 44" width="44" height="44" aria-hidden="true">
      <circle cx="22" cy="22" r="20" [attr.fill]="dark() ? '#24364b' : '#c6e3e4'" />
      @if (dark()) {
        <path d="M29 30a13 13 0 0 1-10-23 13 13 0 1 0 10 23" fill="#fff3b3" />
        <path d="m31 10 1 3 3 1-3 1-1 3-1-3-3-1 3-1z" fill="#fff3b3" />
      } @else {
        <circle cx="22" cy="20" r="11" fill="#ffe66c" />
        <path d="M5 31q15-10 34 0v4q-17 12-34 0z" fill="#778653" />
      }
    </svg>
  </button>`,
  styles: `:host { display:inline-flex; flex:0 0 44px; width:44px; height:44px; }
    .theme-switch { position:relative; display:grid; place-items:center; width:44px; height:44px;
      padding:0; border:0; border-radius:50%; background:transparent; color:inherit; }
    svg { display:block; }
    canvas { position:absolute; inset:0; width:44px; height:44px;
      border-radius:50%; pointer-events:none; }`,
})
export class ThemeSwitch {
  readonly dark = input(false);
  readonly darkChange = output<boolean>();
  readonly ready = signal(false);
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly doc = inject(DOCUMENT);
  private readonly loader = inject(THEME_ANIMATION_LOADER);
  private readonly destroyRef = inject(DestroyRef);
  private animation?: ThemeAnimation;
  private schedule?: () => void;

  constructor() {
    effect(() => { const dark = this.dark(); this.animation?.setDark(dark); });
    afterNextRender(() => this.initialize());
  }

  private initialize() {
    const win = this.doc.defaultView;
    if (!win) return;
    let dead = false;
    let idle: number | undefined;
    let timer: number | undefined;
    let loading = false;
    let attempted = false;
    let inView = true;
    const motion = win.matchMedia?.('(prefers-reduced-motion: reduce)');
    const visible = () => inView && this.doc.visibilityState !== 'hidden';
    const cancel = () => {
      if (idle !== undefined) win.cancelIdleCallback(idle);
      if (timer !== undefined) win.clearTimeout(timer);
      idle = timer = undefined;
    };
    const load = async () => {
      idle = timer = undefined;
      if (dead || motion?.matches || !visible() || loading || attempted) return;
      loading = true;
      attempted = true;
      try {
        const module = await this.loader();
        if (dead || motion?.matches) { attempted = false; return; }
        this.animation = module.mountThemeAnimation(this.canvas().nativeElement, this.dark(),
          (ready) => { if (!dead) this.ready.set(ready); });
        this.animation.setVisible(visible());
      } catch { this.ready.set(false); }
      finally { loading = false; }
    };
    this.schedule = () => {
      cancel();
      if (dead || motion?.matches || !visible() || attempted || loading || this.doc.readyState !== 'complete') return;
      if (win.requestIdleCallback) idle = win.requestIdleCallback(() => void load(), { timeout: 5000 });
      else timer = win.setTimeout(() => void load(), 1500);
    };
    const visibility = () => {
      this.animation?.setVisible(visible());
      if (visible()) this.schedule?.();
    };
    const changeMotion = () => {
      cancel();
      this.animation?.destroy();
      this.animation = undefined;
      attempted = false;
      this.ready.set(false);
      this.schedule?.();
    };
    const observer = typeof IntersectionObserver === 'undefined' ? undefined :
      new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; visibility(); });
    observer?.observe(this.canvas().nativeElement);
    motion?.addEventListener('change', changeMotion);
    this.doc.addEventListener('visibilitychange', visibility);
    win.addEventListener('load', this.schedule);
    this.schedule();
    this.destroyRef.onDestroy(() => {
      dead = true;
      cancel();
      observer?.disconnect();
      motion?.removeEventListener('change', changeMotion);
      this.doc.removeEventListener('visibilitychange', visibility);
      win.removeEventListener('load', this.schedule!);
      this.schedule = undefined;
      this.animation?.destroy();
    });
  }
}
