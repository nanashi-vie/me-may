import { TestBed } from '@angular/core/testing';
import { expect, it, vi } from 'vitest';
import { AttendanceApi, Verified } from './attendance-api';
import { Punch } from './punch';

it('marks an already verified open shift for review as the store reaches 20:30', async () => {
  const profile: Verified = {
    token: 'fixture', fullName: 'Nguyễn An', monday: '2026-11-09', today: '2026-11-09',
    days: [true, false, false, false, false, false, false], outsideSchedule: false,
    status: 'WORKING', startedAt: '2026-11-09T08:30:00+07:00',
    serverTime: '2026-11-09T20:29:58+07:00', expiresAt: '2026-11-09T20:30:28+07:00',
  };
  TestBed.configureTestingModule({
    providers: [{
      provide: AttendanceApi,
      useValue: { employees: async () => [], verify: async () => profile },
    }],
  });
  const fixture = TestBed.createComponent(Punch);
  fixture.detectChanges();
  await fixture.whenStable();
  vi.useFakeTimers();
  try {
    const component = fixture.componentInstance;
    component.employeeId = 1;
    component.pin = '012345';
    await component.unlock();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Đang làm');
    await vi.advanceTimersByTimeAsync(2000);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Cần kiểm tra');
    expect(component.working()).toBe(true);
  } finally {
    fixture.destroy();
    vi.useRealTimers();
  }
});
