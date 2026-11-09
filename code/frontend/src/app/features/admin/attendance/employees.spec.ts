import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { expect, it } from 'vitest';
import { AttendanceApi } from './attendance-api';
import { Employees } from './employees';

it('opens the create form only on request and exposes employee actions on hover', async () => {
  const employee = { id: 7, code: 'EMP-007', fullName: 'Nguyễn An', phone: null, startedOn: null, active: true, version: 0 };
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: AttendanceApi, useValue: { employees: async () => [employee] } }],
  });
  const fixture = TestBed.createComponent(Employees);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  const root: HTMLElement = fixture.nativeElement;
  expect(root.querySelector('form')).toBeNull();
  root.querySelector<HTMLButtonElement>('[aria-controls="employee-profile-panel"]')?.click();
  fixture.detectChanges();
  expect(root.querySelector('form input[name="fullName"]')).not.toBeNull();
  expect(root.querySelector('input[name="displayName"]')).toBeNull();
  [...root.querySelectorAll<HTMLButtonElement>('form button')].find((button) => button.textContent?.trim() === 'Hủy')?.click();
  fixture.detectChanges();
  expect(root.querySelector('form')).toBeNull();

  const employeeRow = root.querySelector<HTMLElement>('.employee-list li');
  const trigger = employeeRow?.querySelector('button');
  trigger?.click();
  fixture.detectChanges();
  expect(trigger?.getAttribute('aria-expanded')).toBe('true');
  trigger?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  fixture.detectChanges();
  expect(trigger?.getAttribute('aria-expanded')).toBe('false');

  employeeRow?.dispatchEvent(new MouseEvent('mouseenter'));
  fixture.detectChanges();
  expect(root.querySelector('a[href="/admin/nhan-vien/7/lich"]')).not.toBeNull();
  expect(root.querySelector('a[href="/admin/nhan-vien/7/cham-cong"]')).not.toBeNull();
  expect(root.querySelector('form')).toBeNull();
  const details = [...root.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Thông tin hồ sơ');
  details?.click();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector<HTMLInputElement>('input[name="fullName"]')?.value).toBe('Nguyễn An');
  expect(root.querySelector('a[href="/admin/nhan-vien/7/lich"]')).toBeNull();
});
