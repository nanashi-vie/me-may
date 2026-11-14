// Loaded only by the client-side switch after load/idle. Never import here from SSR paths.
import { Fit, Layout, Rive, RuntimeLoader, StateMachineInput } from '@rive-app/canvas-lite';

export interface ThemeAnimation {
  setDark(dark: boolean): void;
  setVisible(visible: boolean): void;
  destroy(): void;
}

export function mountThemeAnimation(
  canvas: HTMLCanvasElement, dark: boolean, ready: (ready: boolean) => void,
  busy: (busy: boolean) => void,
): ThemeAnimation {
  RuntimeLoader.setWasmUrl('/rive/canvas-lite-2.50.0/rive.wasm');
  RuntimeLoader.setWasmFallbackUrl('/rive/canvas-lite-2.50.0/rive_fallback.wasm');
  // Legacy input/event APIs are required by this supplied asset, pinned to2.50.
  Rive.suppressDeprecationWarnings = ['state-machine-inputs', 'state-change-events'];
  let target = dark;
  let actual: boolean | undefined;
  let moving = false;
  let visible = true;
  let dead = false;
  let click: StateMachineInput | undefined;
  let settleTimer: ReturnType<typeof setTimeout> | undefined;
  const reconcile = () => {
    if (dead || !visible || actual === undefined || moving) return;
    if (actual === target) {
      clearTimeout(settleTimer);
      // This supplied asset blends into its idle pose after the entry event.
      // Allow its one-second settling interval, then freeze outside draw.
      settleTimer = setTimeout(() => {
        if (dead || !visible || moving || actual !== target) return;
        instance.pause();
        instance.stopRendering();
        ready(true);
        busy(false);
      }, 1000);
    } else {
      moving = true;
      busy(true);
      instance.play('Button_Animation');
      click?.fire();
    }
  };
  const scale = canvas.width / 124;
  const instance = new Rive({
    canvas,
    src: '/rive/day-night.riv',
    stateMachine: 'Button_Animation',
    autoplay: true,
    shouldDisableRiveListeners: true,
    enableRiveAssetCDN: false,
    // Artboard500x500 includes a gray surround. Frame only its circular button.
    layout: new Layout({ fit: Fit.Cover,
      minX: -208 * scale, minY: -188 * scale, maxX: 292 * scale, maxY: 312 * scale }),
    onLoad: () => {
      if (dead) { instance.cleanup(); return; }
      const inputs = instance.stateMachineInputs('Button_Animation') ?? [];
      const hover = inputs.find((input) => input.name === 'Hover');
      if (hover) hover.value = false;
      click = inputs.find((input) => input.name === 'Click');
      if (!click) { ready(false); busy(false); instance.cleanup(); dead = true; return; }
      if (!visible) instance.stopRendering();
    },
    onStateChange: (event) => {
      if (dead) return;
      const states = Array.isArray(event.data) ? event.data : [event.data];
      const idle = states.find((state) => state === 'Idle_day' || state === 'Idle_night');
      if (!idle) return;
      actual = idle === 'Idle_night';
      moving = false;
      reconcile();
    },
    onLoadError: () => {
      if (dead) return;
      ready(false);
      busy(false);
      instance.cleanup();
      dead = true;
    },
  });
  return {
    setDark(value) { target = value; reconcile(); },
    setVisible(value) {
      visible = value;
      if (dead) return;
      if (!value) { instance.pause(); instance.stopRendering(); }
      else if (moving || actual === undefined) {
        instance.startRendering(); // Flush the paused frame and reset its clock.
        instance.play('Button_Animation');
      }
      else reconcile();
    },
    destroy() { clearTimeout(settleTimer); if (!dead) { dead = true; instance.cleanup(); } },
  };
}
