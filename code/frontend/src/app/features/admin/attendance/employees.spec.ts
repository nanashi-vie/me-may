import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { expect, it } from 'vitest';
import { AttendanceApi } from './attendance-api';
import { Employees } from './employees';

it('shows schedule and punch links only for the selected employee profile', async () => {
  const employee = { id: 7, code: 'EMP-007', fullName: 'Nguyễn An', phone: null, startedOn: null, active: true, version: 0 };
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: AttendanceApi, useValue: { employees: async () => [employee] } }],
  });
  const fixture = TestBed.createComponent(Employees);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  const root: HTMLElement = fixture.nativeElement;
  expect(root.querySelector('input[name="displayName"]')).toBeNull();
  expect(root.querySelector('.profile-actions a')).toBeNull();
  root.querySelector<HTMLButtonElement>('.employee-list button')?.click();
  fixture.detectChanges();
  expect(root.querySelector('a[href="/admin/nhan-vien/7/lich"]')).not.toBeNull();
  expect(root.querySelector('a[href="/admin/nhan-vien/7/cham-cong"]')).not.toBeNull();
});
