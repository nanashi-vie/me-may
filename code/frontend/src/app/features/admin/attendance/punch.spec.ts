import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { expect, it, vi } from 'vitest';
import { AttendanceApi, Verified } from './attendance-api';
import { monthGrid } from './attendance-display';
import { Punch } from './punch';

it('marks an already verified open shift for review as the store reaches 20:30', async () => {
  const profile: Verified = {
    token: 'fixture', fullName: 'Nguyễn An', monday: '2026-11-09', today: '2026-11-09',
    days: [true, false, false, false, false, false, false], outsideSchedule: false,
    status: 'WORKING', startedAt: '2026-11-09T08:30:00+07:00',
    serverTime: '2026-11-09T20:29:58+07:00', expiresAt: '2026-11-09T20:30:28+07:00',
  };
  const employee = { id: 1, code: 'EMP-001', fullName: 'Nguyễn An', phone: null, startedOn: null, active: true, version: 0 };
  const verify = vi.fn(async () => profile);
  TestBed.configureTestingModule({
    providers: [provideRouter([]), {
      provide: ActivatedRoute,
      useValue: { snapshot: { paramMap: convertToParamMap({ employeeId: '1' }) } },
    }, {
      provide: AttendanceApi,
      useValue: { employees: async () => [employee], verify },
    }],
  });
  const fixture = TestBed.createComponent(Punch);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  vi.useFakeTimers();
  try {
    const component = fixture.componentInstance;
    expect(fixture.nativeElement.querySelector('select')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Nguyễn An');
    component.pin = '012345';
    await component.unlock();
    expect(verify).toHaveBeenCalledWith(1, '012345');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Đang làm');
    await vi.advanceTimersByTimeAsync(2000);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Cần kiểm tra');
    expect(component.working()).toBe(true);
    await vi.advanceTimersByTimeAsync(28000);
    expect(navigate).toHaveBeenCalledWith(['/admin/nhan-vien'], {
      state: { attendanceNotice: 'Đã thoát hồ sơ chấm công sau 30 giây.' },
    });
  } finally {
    fixture.destroy();
    vi.useRealTimers();
    navigate.mockRestore();
  }
});

it('builds a Monday-first month grid with registration state only for the loaded week', () => {
  const cells = monthGrid('2026-11-11', '2026-11-09', [false, false, true, true, false, false, true]);
  expect(cells.length).toBe(6 + 30);
  expect(cells.slice(0, 6).every((cell) => cell === null)).toBe(true);
  const byDay = (day: string) => cells.find((cell) => cell?.day === day)!;
  expect(byDay('2026-11-01').state).toBe('outside');
  expect(byDay('2026-11-10').state).toBe('unregistered');
  expect(byDay('2026-11-11')).toMatchObject({ state: 'today', registered: true });
  expect(byDay('2026-11-12').state).toBe('registered');
  expect(byDay('2026-11-12').description).toBe('12/11/2026 · Đã đăng ký');
  expect(byDay('2026-11-16').state).toBe('outside');
});
