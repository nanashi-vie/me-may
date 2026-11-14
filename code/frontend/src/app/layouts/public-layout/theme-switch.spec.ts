import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeSwitch, THEME_ANIMATION_LOADER } from './theme-switch';

describe('Deferred Rive enhancement', () => {
  let runIdle: () => void;
  let motion: EventTarget & { matches: boolean };
  beforeEach(() => {
    runIdle = undefined!;
    motion = Object.assign(new EventTarget(), { matches: false });
    vi.stubGlobal('matchMedia', () => motion);
    vi.stubGlobal('requestIdleCallback', (fn: () => void) => { runIdle = fn; return 1; });
    vi.stubGlobal('cancelIdleCallback', vi.fn());
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('complete');
  });
  afterEach(() => { TestBed.resetTestingModule(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  function setup(loader = vi.fn().mockRejectedValue(Error('offline'))) {
    TestBed.configureTestingModule({ providers: [{ provide: THEME_ANIMATION_LOADER, useValue: loader }] });
    const f = TestBed.createComponent(ThemeSwitch); f.detectChanges();
    return { f, loader };
  }
  it('defers runtime import until idle and remains usable if enhancement fails', async () => {
    const { f, loader } = setup();
    expect(loader).not.toHaveBeenCalled();
    const change = vi.fn(); f.componentInstance.darkChange.subscribe(change);
    f.nativeElement.querySelector('button').click();
    expect(change).toHaveBeenCalledWith(true);
    runIdle(); await f.whenStable(); f.detectChanges();
    expect(loader).toHaveBeenCalledTimes(1);
    expect(f.nativeElement.querySelector('canvas')?.style.opacity).toBe('0');
  });
  it('skips the runtime entirely for reduced motion', () => {
    motion.matches = true;
    const { f, loader } = setup();
    expect(loader).not.toHaveBeenCalled();
    expect(f.nativeElement.querySelector('button[role="switch"]')).toBeTruthy();
    expect(runIdle).toBeUndefined();
  });
  it('does not mount a late runtime after the public component is destroyed', async () => {
    let resolve!: (module: any) => void;
    const mount = vi.fn();
    const { f } = setup(vi.fn(() => new Promise(r => { resolve = r; })));
    runIdle(); f.destroy();
    resolve({ mountThemeAnimation: mount });
    await Promise.resolve();
    expect(mount).not.toHaveBeenCalled();
  });
  it('mounts with latest theme after loading, releases renderer when motion is reduced', async () => {
    let resolve!: (module: any) => void;
    const animation = { setDark: vi.fn(), setVisible: vi.fn(), destroy: vi.fn() };
    const mount = vi.fn((_canvas, _dark, ready) => { ready(true); return animation; });
    const { f } = setup(vi.fn(() => new Promise(r => { resolve = r; })));
    runIdle(); f.componentRef.setInput('dark', true); f.detectChanges();
    resolve({ mountThemeAnimation: mount }); await f.whenStable(); f.detectChanges();
    expect(mount.mock.calls[0][1]).toBe(true);
    expect(f.nativeElement.querySelector('canvas').style.opacity).toBe('1');
    f.componentRef.setInput('dark', false); f.detectChanges();
    expect(animation.setDark).toHaveBeenLastCalledWith(false);
    motion.matches = true; motion.dispatchEvent(new Event('change')); f.detectChanges();
    expect(animation.destroy).toHaveBeenCalledTimes(1);
    expect(f.nativeElement.querySelector('canvas').style.opacity).toBe('0');
  });
});
