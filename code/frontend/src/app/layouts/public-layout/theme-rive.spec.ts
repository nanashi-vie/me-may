import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountThemeAnimation } from './theme-rive';

const fake = vi.hoisted(() => ({
  options: {} as any, click: vi.fn(), hover: { name: 'Hover', value: false },
  pause: vi.fn(), play: vi.fn(), start: vi.fn(), stop: vi.fn(), cleanup: vi.fn(),
}));
vi.mock('@rive-app/canvas-lite', () => ({
  RuntimeLoader: { setWasmUrl: vi.fn(), setWasmFallbackUrl: vi.fn() },
  Fit: { Cover: 'cover' },
  Layout: class { constructor(public options: unknown) {} },
  Rive: class {
    static suppressDeprecationWarnings: string[] = [];
    constructor(options: any) { fake.options = options; }
    stateMachineInputs() { return [fake.hover, { name: 'Click', fire: fake.click }]; }
    pause = fake.pause;
    play = fake.play;
    startRendering = fake.start;
    stopRendering = fake.stop;
    cleanup = fake.cleanup;
  },
}));

// The fake stands only at the browser/WASM boundary; assertions pin our state
// reconciliation and lifecycle, which cannot run on jsdom's absent canvas.
describe('Rive theme reconciliation', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers(); fake.hover.value = true; });
  afterEach(() => vi.useRealTimers());
  function flushFrames() { vi.advanceTimersByTime(1000); }
  function setup(dark = false) {
    const ready = vi.fn();
    const animation = mountThemeAnimation(document.createElement('canvas'), dark, ready);
    fake.options.onLoad();
    return { animation, ready, state: (name: string) => { fake.options.onStateChange({ data: [name] }); flushFrames(); } };
  }
  it('disables Rive pointer handling and leaves Hover false', () => {
    const { state, ready } = setup();
    state('Idle_day');
    expect(fake.options.shouldDisableRiveListeners).toBe(true);
    // Layout bounds are destination pixels; the500px artboard must be translated
    // outside the44px viewport to crop its gray surround.
    expect(fake.options.layout.options.minX).toBeLessThan(0);
    expect(fake.options.layout.options.maxX).toBeGreaterThan(fake.options.canvas.width);
    expect(fake.hover.value).toBe(false);
    expect(fake.click).not.toHaveBeenCalled();
    expect(ready).toHaveBeenLastCalledWith(true);
    expect(fake.stop).toHaveBeenCalled();
    expect(fake.pause).toHaveBeenCalled();
  });
  it('restores dark before revealing the canvas and waits for the actual night state', () => {
    const { state, ready } = setup(true);
    state('Idle_day');
    expect(fake.click).toHaveBeenCalledTimes(1);
    expect(ready).not.toHaveBeenCalledWith(true);
    state('Idle_night');
    expect(ready).toHaveBeenLastCalledWith(true);
  });
  it('coalesces rapid toggles and converges on the latest target', () => {
    const { animation, state } = setup();
    state('Idle_day');
    animation.setDark(true);
    animation.setDark(false);
    expect(fake.click).toHaveBeenCalledTimes(1);
    state('Idle_night');
    expect(fake.click).toHaveBeenCalledTimes(2);
    state('Idle_day');
    expect(fake.click).toHaveBeenCalledTimes(2);
  });
  it('does not advance hidden animations; reconciles when visible again', () => {
    const { animation, state } = setup();
    state('Idle_day');
    animation.setVisible(false);
    animation.setDark(true);
    expect(fake.click).not.toHaveBeenCalled();
    animation.setVisible(true);
    expect(fake.click).toHaveBeenCalledTimes(1);
  });
  it('keeps fallback on load failure and destroys late load resources', () => {
    const { animation, ready } = setup();
    fake.options.onLoadError();
    expect(ready).toHaveBeenLastCalledWith(false);
    animation.destroy();
    fake.options.onLoad();
    expect(fake.cleanup).toHaveBeenCalled();
    expect(ready).not.toHaveBeenCalledWith(true);
  });
});
