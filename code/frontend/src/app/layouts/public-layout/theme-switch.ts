/*
 * From Uiverse.io by RiccardoRapelli - https://uiverse.io/RiccardoRapelli/jolly-chicken-91
 * MIT License, Copyright (c) RiccardoRapelli (Riccardo Rapelli)
 *
 * Adapted: native button role=switch thay checkbox, id → class, tôn trọng reduced motion.
 */
import { Component, input, output } from '@angular/core';

const STAR = 'M0 10C10 10 10 10 0 10C10 10 10 10 10 20C10 10 10 10 20 10C10 10 10 10 10 0C10 10 10 10 0 10Z';

@Component({
  selector: 'app-theme-switch',
  template: `<button type="button" role="switch" class="theme-switch" aria-label="Chế độ tối"
    [class.dark]="dark()" [attr.aria-checked]="dark()"
    [title]="dark() ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'"
    (click)="darkChange.emit(!dark())">
    <span class="slider" aria-hidden="true">
      <span class="sun-moon">
        @for (c of moonDots; track c) { <svg [class]="'moon-dot ' + c" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50"/></svg> }
        @for (c of rays; track c) { <svg [class]="'ray ' + c" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50"/></svg> }
        @for (c of clouds; track c) { <svg [class]="'cloud ' + c" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50"/></svg> }
      </span>
      <span class="stars">
        @for (c of stars; track c) { <svg [class]="'star ' + c" viewBox="0 0 20 20"><path [attr.d]="star"/></svg> }
      </span>
    </span>
  </button>`,
  styles: `:host { display:inline-flex; flex:0 0 60px; width:60px; height:44px; }
    .theme-switch { display:grid; place-items:center; width:60px; height:44px; padding:0;
      border:0; background:transparent; cursor:pointer; }
    .theme-switch:focus-visible { outline:2px solid currentColor; outline-offset:2px; border-radius:34px; }
    .slider { position:relative; display:block; width:60px; height:34px; overflow:hidden;
      border-radius:34px; background:#2196f3; transition:background-color .4s; isolation:isolate; }
    svg { position:absolute; display:block; }
    .sun-moon { position:absolute; left:4px; bottom:4px; width:26px; height:26px; border-radius:50%;
      background:#ffeb3b; transition:transform .4s, background-color .4s; }
    .dark .slider { background:#000; }
    .dark .sun-moon { transform:translateX(26px); background:#fff; }
    .moon-dot { opacity:0; fill:gray; z-index:4; transition:opacity .4s; }
    .dark .moon-dot { opacity:1; }
    .d1 { left:10px; top:3px; width:6px; height:6px; }
    .d2 { left:2px; top:10px; width:10px; height:10px; }
    .d3 { left:16px; top:18px; width:3px; height:3px; }
    .ray { z-index:-1; fill:#fff; opacity:.1; }
    .r1 { left:-8px; top:-8px; width:43px; height:43px; }
    .r2 { left:-13px; top:-13px; width:55px; height:55px; }
    .r3 { left:-18px; top:-18px; width:60px; height:60px; }
    .cloud { fill:#eee; animation:cloud 6s infinite; }
    .c1, .c2, .c3 { fill:#ccc; animation-delay:1s; }
    .c1 { left:30px; top:15px; width:40px; } .c2 { left:44px; top:10px; width:20px; }
    .c3 { left:18px; top:24px; width:30px; } .c4 { left:36px; top:18px; width:40px; }
    .c5 { left:48px; top:14px; width:20px; } .c6 { left:22px; top:26px; width:30px; }
    .stars { position:absolute; inset:0; transform:translateY(-32px); opacity:0;
      transition:transform .4s, opacity .4s; }
    .dark .stars { transform:none; opacity:1; }
    .star { fill:#fff; animation:twinkle 2s infinite; }
    .s1 { width:20px; top:2px; left:3px; animation-delay:.3s; }
    .s2 { width:6px; top:16px; left:3px; }
    .s3 { width:12px; top:20px; left:10px; animation-delay:.6s; }
    .s4 { width:18px; top:0; left:18px; animation-delay:1.3s; }
    @keyframes cloud { 40% { transform:translateX(4px); } 80% { transform:translateX(-4px); } }
    @keyframes twinkle { 40% { transform:scale(1.2); } 80% { transform:scale(.8); } }
    @media (prefers-reduced-motion: reduce) {
      * { animation:none !important; transition:none !important; }
    }`,
})
export class ThemeSwitch {
  readonly dark = input(false);
  readonly darkChange = output<boolean>();
  protected readonly moonDots = ['d1', 'd2', 'd3'];
  protected readonly rays = ['r1', 'r2', 'r3'];
  protected readonly clouds = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
  protected readonly stars = ['s1', 's2', 's3', 's4'];
  protected readonly star = STAR;
}
