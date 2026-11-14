import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HeroCarousel } from './hero-carousel';
const banners = [
  { id: 'a', alt: 'First', src: 'a.webp', srcset: 'a.webp 800w', width: 3200, height: 800 },
  { id: 'b', alt: 'Second', src: 'b.webp', srcset: 'b.webp 800w', width: 3200, height: 800 },
];
describe('HeroCarousel', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  function setup(count = 2, reduced = false, platform = 'browser') {
    vi.useFakeTimers();
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: reduced,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
    TestBed.configureTestingModule({
      imports: [HeroCarousel],
      providers: [provideRouter([]), { provide: PLATFORM_ID, useValue: platform }],
    });
    const fixture = TestBed.createComponent(HeroCarousel);
    fixture.componentRef.setInput('banners', banners.slice(0, count));
    fixture.detectChanges();
    return { fixture, c: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }
  it('renders SSR first image and fixed link with dimensions and high priority, without a timer', () => {
    const { el } = setup(2, false, 'server');
    const image = el.querySelector('img')!;
    expect(image.getAttribute('src')).toBe('a.webp');
    expect(image.getAttribute('srcset')).toBe('a.webp 800w');
    expect(image.getAttribute('width')).toBe('3200');
    expect(image.getAttribute('fetchpriority')).toBe('high');
    expect(el.querySelector('a')?.getAttribute('href')).toBe('/sach');
    expect(vi.getTimerCount()).toBe(0);
  });
  it('renders nothing for zero and no autoplay controls/timer for one', () => {
    const { fixture, el } = setup(0);
    expect(el.querySelector('.carousel')).toBeNull();
    expect(el.querySelector('img')).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    fixture.componentRef.setInput('banners', banners.slice(0, 1));
    fixture.detectChanges();
    expect(el.querySelector('button')).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('omits fallback images from empty SSR and clears an active carousel when all banners are removed', () => {
    const { fixture, el } = setup(0, false, 'server');
    expect(el.querySelector('.carousel')).toBeNull();
    expect(el.querySelector('img')).toBeNull();
    fixture.componentRef.setInput('banners', banners);
    fixture.detectChanges();
    expect(el.querySelector('img')?.getAttribute('src')).toBe('a.webp');
    fixture.componentRef.setInput('banners', []);
    fixture.detectChanges();
    expect(el.querySelector('.carousel')).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('waits exactly 5000ms, wraps and clears the timer on destroy', () => {
    const { fixture, c } = setup();
    vi.advanceTimersByTime(4999);
    expect(c.active()).toBe(0);
    vi.advanceTimersByTime(1);
    expect(c.active()).toBe(1);
    vi.advanceTimersByTime(5000);
    expect(c.active()).toBe(0);
    fixture.destroy();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('manual controls stay outside the link and restart the five-second interval', () => {
    const { fixture, c, el } = setup();
    vi.advanceTimersByTime(4000);
    c.choose(1);
    vi.advanceTimersByTime(4999);
    expect(c.active()).toBe(1);
    vi.advanceTimersByTime(1);
    expect(c.active()).toBe(0);
    fixture.detectChanges();
    for (const button of el.querySelectorAll('button')) expect(button.closest('a')).toBeNull();
  });
  it('keeps autoplay while hovered and pauses only on focus/hidden', () => {
    const { c, el } = setup();
    const region = el.querySelector('.carousel')!;
    region.dispatchEvent(new MouseEvent('mouseenter'));
    vi.advanceTimersByTime(5000);
    expect(c.active()).toBe(1);
    region.dispatchEvent(new MouseEvent('mouseleave'));
    vi.advanceTimersByTime(5000);
    expect(c.active()).toBe(0);
    c.focus(true);
    vi.advanceTimersByTime(10000);
    expect(c.active()).toBe(0);
    c.focus(false);
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(20000);
    expect(c.active()).toBe(0);
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(4999);
    expect(c.active()).toBe(0);
    vi.advanceTimersByTime(1);
    expect(c.active()).toBe(1);
  });
  it('defaults to paused for reduced motion, with manual navigation and explicit resume', () => {
    const { c } = setup(2, true);
    vi.advanceTimersByTime(20000);
    expect(c.active()).toBe(0);
    expect(c.paused()).toBe(true);
    c.choose(1);
    expect(c.active()).toBe(1);
    c.togglePause();
    vi.advanceTimersByTime(5000);
    expect(c.active()).toBe(0);
  });
  it('skips failed images, hides once all fail and resets on new input', () => {
    const { fixture, c, el } = setup();
    c.failed('a');
    fixture.detectChanges();
    expect(el.querySelector('img')?.getAttribute('src')).toBe('b.webp');
    expect(vi.getTimerCount()).toBe(0);
    c.failed('b');
    fixture.detectChanges();
    expect(el.querySelector('.carousel')).toBeNull();
    expect(el.querySelector('img')).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    fixture.componentRef.setInput('banners', [banners[0]]);
    fixture.detectChanges();
    expect(el.querySelector('img')?.getAttribute('src')).toBe('a.webp');
  });
  it('supports the pause button without automatic restart until resumed', () => {
    const { c } = setup();
    c.togglePause();
    vi.advanceTimersByTime(15000);
    expect(c.active()).toBe(0);
    c.togglePause();
    vi.advanceTimersByTime(5000);
    expect(c.active()).toBe(1);
  });
  it('keeps an aria-hidden outgoing slide while the new slide enters from the right', () => {
    const { fixture, c, el } = setup();
    vi.advanceTimersByTime(5000);
    fixture.detectChanges();
    expect(el.querySelector('.outgoing img')?.getAttribute('src')).toBe('a.webp');
    expect(el.querySelector('.outgoing')?.getAttribute('aria-hidden')).toBe('true');
    expect(el.querySelector('.incoming img')?.getAttribute('src')).toBe('b.webp');
    expect(el.querySelector('.viewport')?.classList.contains('rtl')).toBe(true);
    el.querySelector('.incoming')!.dispatchEvent(new Event('animationend', { bubbles: true }));
    fixture.detectChanges();
    expect(el.querySelector('.outgoing')).toBeNull();
    expect(c.active()).toBe(1);
  });
  it('replaces the outgoing layer on rapid navigation and reverses manual previous', () => {
    const { fixture, c, el } = setup();
    c.next(1);
    fixture.detectChanges();
    c.next(-1);
    fixture.detectChanges();
    expect(el.querySelectorAll('.outgoing')).toHaveLength(1);
    expect(el.querySelector('.outgoing img')?.getAttribute('src')).toBe('b.webp');
    expect(el.querySelector('.incoming img')?.getAttribute('src')).toBe('a.webp');
    expect(el.querySelector('.viewport')?.classList.contains('rtl')).toBe(false);
  });
  it('switches instantly for reduced motion and clears moving layers after errors/input changes', () => {
    const { fixture, c, el } = setup(2, true);
    c.next(1);
    fixture.detectChanges();
    expect(el.querySelector('.outgoing')).toBeNull();
    expect(el.querySelector('img')?.getAttribute('src')).toBe('b.webp');
    fixture.componentRef.setInput('banners', [banners[0]]);
    fixture.detectChanges();
    expect(el.querySelector('.outgoing')).toBeNull();
    expect(el.querySelector('img')?.getAttribute('src')).toBe('a.webp');
  });
  it('restarts both slide layers when Next is clicked twice in the same direction', () => {
    const { fixture, c, el } = setup();
    c.next(1);
    fixture.detectChanges();
    const first = el.querySelector('.outgoing');
    vi.advanceTimersByTime(200);
    c.next(1);
    fixture.detectChanges();
    expect(el.querySelector('.outgoing')).not.toBe(first);
    expect(el.querySelector('.outgoing img')?.getAttribute('src')).toBe('b.webp');
    expect(el.querySelector('.incoming img')?.getAttribute('src')).toBe('a.webp');
  });
  it('shows only compact arrows and offers Space to pause without a navigation bar', () => {
    const { fixture, c, el } = setup();
    expect(el.querySelector('.controls')).toBeNull();
    expect(el.querySelectorAll('button')).toHaveLength(2);
    expect(el.querySelectorAll('.arrow svg')).toHaveLength(2);
    const link = el.querySelector('a')!;
    link.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
    fixture.detectChanges();
    expect(c.paused()).toBe(true);
    link.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
    fixture.detectChanges();
    expect(c.paused()).toBe(false);
  });
});
