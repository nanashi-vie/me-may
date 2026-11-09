import { TestBed } from '@angular/core/testing';
import { expect, it, vi } from 'vitest';
import { AttendanceApi, Week } from './attendance-api';
import { Schedule } from './schedule';

it('replaces the target draft by employee ID only after confirmation, then warns on leaving', async () => {
  const source: Week = {
    monday: '2026-11-09', today: '2026-11-09', editable: true, version: 1,
    rows: [
      { employeeId: 2, days: [false, true, false, false, false, false, false] },
      { employeeId: 1, days: [true, false, false, false, false, false, false] },
    ],
  };
  const target: Week = {
    ...source, monday: '2026-11-16',
    rows: [
      { employeeId: 1, days: [false, false, false, false, false, true, false] },
      { employeeId: 3, days: [false, false, false, false, false, false, true] },
    ],
  };
  const saveWeek = vi.fn(async (value: Week) => value);
  TestBed.configureTestingModule({
    providers: [{
      provide: AttendanceApi,
      useValue: { employees: async () => [], week: async (date: string) => date === source.monday ? source : target, saveWeek },
    }],
  });
  const fixture = TestBed.createComponent(Schedule);
  const component = fixture.componentInstance;
  await component.load(target.monday);

  const prompt = vi.spyOn(window, 'confirm').mockReturnValue(false);
  try {
    await component.copy();
    expect(component.week()?.rows).toEqual(target.rows);
    prompt.mockReturnValueOnce(true);
    await component.copy();
    expect(component.week()?.rows).toEqual([
      { employeeId: 1, days: source.rows[1].days },
      { employeeId: 3, days: [false, false, false, false, false, false, false] },
    ]);
    expect(saveWeek).not.toHaveBeenCalled();
    expect(component.canLeave()).toBe(false);
    await component.save();
    expect(component.canLeave()).toBe(true);
    expect(saveWeek).toHaveBeenCalledTimes(1);
  } finally {
    prompt.mockRestore();
    fixture.destroy();
  }
});
