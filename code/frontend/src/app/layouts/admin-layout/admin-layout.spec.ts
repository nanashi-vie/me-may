import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AdminLayout } from './admin-layout';
import { AuthService, CurrentAdmin } from '../../core/auth/auth.service';

describe('AdminLayout', () => {
  function setup(user: CurrentAdmin | null = { id: 1, email: 'owner@memay.vn', role: 'OWNER' }) {
    const userSignal = signal<CurrentAdmin | null>(user);
    const logoutMock = vi.fn(() => of(undefined));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            user: userSignal,
            logout: logoutMock,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(AdminLayout);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, logoutMock, userSignal };
  }

  it('renders modern admin sidebar with brand, nav items and account footer for OWNER', () => {
    const { fixture } = setup({ id: 1, email: 'owner@memay.vn', role: 'OWNER' });
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Mẹ Mây');
    expect(text).toContain('Trang quản trị');
    expect(text).toContain('Tổng quan');
    expect(text).toContain('Quản lý sách');
    expect(text).toContain('Sách');
    expect(text).toContain('Bộ sưu tập');
    expect(text).toContain('Flash sale');
    for (const path of ['nhan-vien', 'cham-cong', 'cham-cong/lich', 'cham-cong/bao-cao']) {
      expect(fixture.nativeElement.querySelector(`a[href="/admin/${path}"]`)).not.toBeNull();
    }
    expect(text).toContain('Xem website');
    expect(text).toContain('owner@memay.vn');
    expect(text).toContain('OWNER');

    const svgIcons = fixture.nativeElement.querySelectorAll('.nav-icon svg');
    expect(svgIcons.length).toBe(3);

    const chevron = fixture.nativeElement.querySelector('.nav-chevron svg');
    expect(chevron).toBeTruthy();

    const avatar = fixture.nativeElement.querySelector('.account-avatar');
    expect(avatar?.textContent?.trim()).toBe('O');
  });

  it('toggles book management accordion on button click', () => {
    const { fixture, component } = setup();
    expect(component.bookMenuOpen()).toBe(true);

    const toggleBtn = fixture.nativeElement.querySelector('.nav-group-btn') as HTMLButtonElement;
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');

    const submenu = fixture.nativeElement.querySelector('#book-management-submenu');
    expect(submenu.classList.contains('collapsed')).toBe(false);

    toggleBtn.click();
    fixture.detectChanges();

    expect(component.bookMenuOpen()).toBe(false);
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
    expect(submenu.classList.contains('collapsed')).toBe(true);

    toggleBtn.click();
    fixture.detectChanges();

    expect(component.bookMenuOpen()).toBe(true);
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
    expect(submenu.classList.contains('collapsed')).toBe(false);
  });

  it('hides OWNER-only links (Bộ sưu tập, Flash sale) when signed in as STAFF', () => {
    const { fixture } = setup({ id: 2, email: 'staff@memay.vn', role: 'STAFF' });
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Tổng quan');
    expect(text).toContain('Quản lý sách');
    expect(text).toContain('Sách');
    expect(text).not.toContain('Bộ sưu tập');
    expect(text).not.toContain('Flash sale');
    expect(text).toContain('staff@memay.vn');
    expect(fixture.nativeElement.querySelector('a[href="/admin/cham-cong"]')).toBeNull();
    expect(text).toContain('STAFF');
  });

  it('invokes auth.logout and navigates to login on logout click', () => {
    const { fixture, logoutMock } = setup();
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    const btn = fixture.nativeElement.querySelector('.logout-button') as HTMLButtonElement;
    btn.click();

    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(navSpy).toHaveBeenCalledWith('/admin/dang-nhap');
  });

  it('displays error message if logout fails', () => {
    const userSignal = signal<CurrentAdmin | null>({ id: 1, email: 'owner@memay.vn', role: 'OWNER' });
    const logoutMock = vi.fn(() => throwError(() => new Error('Network error')));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            user: userSignal,
            logout: logoutMock,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(AdminLayout);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('.logout-button') as HTMLButtonElement;
    btn.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.error()).toContain('Chưa đăng xuất được');
    expect(fixture.nativeElement.textContent).toContain('Chưa đăng xuất được');
  });
});

