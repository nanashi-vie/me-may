import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { ThemeSwitch } from './theme-switch';

describe('ThemeSwitch (CSS)', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('is a native switch that emits the opposite theme on every activation', () => {
    const f = TestBed.createComponent(ThemeSwitch);
    const values: boolean[] = [];
    f.componentInstance.darkChange.subscribe(v => { values.push(v); f.componentRef.setInput('dark', v); });
    f.detectChanges();
    const button = f.nativeElement.querySelector('button[role="switch"]') as HTMLButtonElement;
    expect(button.getAttribute('aria-checked')).toBe('false');
    button.click(); f.detectChanges();
    expect(button.getAttribute('aria-checked')).toBe('true');
    expect(button.classList.contains('dark')).toBe(true);
    button.click(); f.detectChanges();
    expect(values).toEqual([true, false]);
    expect(f.nativeElement.querySelector('canvas')).toBeNull();
  });
});
