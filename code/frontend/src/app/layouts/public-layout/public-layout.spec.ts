import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PublicLayout } from './public-layout';
import { PublicApi } from '../../features/catalogue/public-api';
import { AuthService } from '../../core/auth/auth.service';

describe('Public theme switch', () => {
  async function setup() {
    TestBed.configureTestingModule({ providers: [
      provideRouter([]),
      { provide: PublicApi, useValue: { collections: () => of([]), taxonomy: () => of(null) } },
      { provide: AuthService, useValue: { user: signal(null) } },
    ] });
    const f = TestBed.createComponent(PublicLayout);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    return { f, button: f.nativeElement.querySelector('button[role="switch"]') as HTMLButtonElement };
  }
  afterEach(() => { TestBed.resetTestingModule(); vi.restoreAllMocks(); localStorage.clear(); });

  it('switches public theme and persists even before the animation is ready', async () => {
    const { f, button } = await setup();
    expect(button).toBeTruthy();
    expect(button.getAttribute('aria-checked')).toBe('false');
    button.click(); f.detectChanges();
    expect(button.getAttribute('aria-checked')).toBe('true');
    expect(f.nativeElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('memay.theme.v1')).toBe('dark');
    button.click(); f.detectChanges();
    expect(f.nativeElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('memay.theme.v1')).toBe('light');
    expect(f.nativeElement.querySelector('.header-links a[href^="/admin"]')).toBeNull();
    expect(f.nativeElement.querySelector('footer a[href="/admin"]')).toBeTruthy();
  });

  it('restores saved dark theme without putting theme attributes on document/admin', async () => {
    localStorage.setItem('memay.theme.v1', 'dark');
    const { f, button } = await setup();
    expect(button?.getAttribute('aria-checked')).toBe('true');
    expect(f.nativeElement.getAttribute('data-theme')).toBe('dark');
    f.destroy();
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(document.body.hasAttribute('data-theme')).toBe(false);
  });

  it('keeps the switch functional if browser storage is denied', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw Error('denied'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('denied'); });
    const { f, button } = await setup();
    expect(button).toBeTruthy();
    button.click(); f.detectChanges();
    expect(button.getAttribute('aria-checked')).toBe('true');
  });

  it('ignores malformed saved preferences and pointer hover never toggles theme', async () => {
    localStorage.setItem('memay.theme.v1', 'invalid');
    const { f, button } = await setup();
    expect(button).toBeTruthy();
    button.dispatchEvent(new MouseEvent('mouseenter'));
    button.dispatchEvent(new MouseEvent('pointermove'));
    f.detectChanges();
    expect(button.getAttribute('aria-checked')).toBe('false');
  });
});
