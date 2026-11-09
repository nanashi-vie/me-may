import { TestBed } from '@angular/core/testing';
import { expect, it, vi } from 'vitest';
import { AttendanceApi, Report } from './attendance-api';
import { AttendanceReport } from './report';

it('renders a single summary table and offers Excel for details', async () => {
  const report: Report = {
    serverTime: '2026-11-09T21:00:00+07:00',
    from: '2026-11-09',
    to: '2026-11-15',
    periodNote: '09/11 quên bấm kết thúc',
    summary: [{ employeeId: 1, code: 'EMP-001', name: 'Nguyễn An', registeredDays: 5, workedDays: 2, reviewCount: 1 }],
  };
  const saveNote = vi.fn(async () => undefined);
  TestBed.configureTestingModule({
    providers: [{ provide: AttendanceApi, useValue: { employees: async () => [], report: async () => report, saveNote } }],
  });
  const fixture = TestBed.createComponent(AttendanceReport);
  const component = fixture.componentInstance;
  fixture.detectChanges();
  await vi.waitFor(() => expect(component.busy()).toBe(false));
  fixture.detectChanges();

  const root: HTMLElement = fixture.nativeElement;
  expect(root.querySelectorAll('table')).toHaveLength(1);
  const columns = [...root.querySelectorAll('thead th')].map((cell) => cell.textContent);
  expect(columns).not.toContain('Tổng giờ');
  expect(columns).toContain('Ca cần kiểm tra');
  expect(root.querySelector('tbody')?.textContent).toContain('Nguyễn An');
  expect(root.textContent).toContain('Xuất bảng đang xem (.xlsx)');

  component.query.period = 'MONTH';
  await fixture.whenStable();
  const editors = root.querySelectorAll<HTMLTextAreaElement>('textarea');
  expect(editors).toHaveLength(1);
  expect(editors[0].value).toBe('09/11 quên bấm kết thúc');
  component.noteText = '09/11 đối chiếu sổ tiệm';
  await component.saveNote();
  expect(saveNote).toHaveBeenCalledWith(expect.objectContaining({ period: 'WEEK' }), '09/11 đối chiếu sổ tiệm');
});
