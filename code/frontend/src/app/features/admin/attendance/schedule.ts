import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AttendanceApi, Employee, Week } from './attendance-api';
import { addDays, displayDay, errorMessage, monday, today, weekdays } from './attendance-display';

@Component({
  imports: [RouterLink],
  templateUrl: './schedule.html',
  styleUrl: './attendance.scss',
})
export class Schedule implements OnInit {
  private readonly api = inject(AttendanceApi);
  private readonly routeId = inject(ActivatedRoute, { optional: true })?.snapshot.paramMap.get('employeeId');
  readonly employeeId = this.routeId ? Number(this.routeId) : null;
  private readonly saved = signal<Week | null>(null);
  readonly week = signal<Week | null>(null);
  readonly employees = signal(new Map<number, Employee>());
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly weekdays = weekdays;
  readonly day = displayDay;
  readonly date = addDays;
  readonly visibleRows = computed(() => this.scope(this.week()?.rows ?? []));
  readonly canEdit = computed(() => Boolean(this.week()?.editable && (this.employeeId === null || this.visibleRows().length)));
  readonly dirty = computed(() => JSON.stringify(this.week()?.rows) !== JSON.stringify(this.saved()?.rows));

  ngOnInit() { void this.load(monday(today())); }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent) {
    if (this.dirty()) event.preventDefault();
  }

  canLeave() {
    return !this.dirty() || window.confirm('Lịch có thay đổi chưa lưu. Rời trang và bỏ thay đổi?');
  }

  async changeWeek(week: string) {
    if (this.busy() || !this.canLeave()) return;
    await this.load(week);
  }

  current() {
    void this.changeWeek(monday(this.week()?.today ?? today()));
  }

  async load(monday: string) {
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      const [week, employees] = await Promise.all([this.api.week(monday), this.api.employees()]);
      this.employees.set(new Map(employees.map((employee) => [employee.id, employee])));
      this.saved.set(week);
      this.week.set(week);
    } catch (error) { this.error.set(errorMessage(error)); }
    finally { this.busy.set(false); }
  }

  toggle(employeeId: number, day: number, checked: boolean) {
    const week = this.week();
    if (!week || !this.canEdit() || this.busy()) return;
    this.notice.set('');
    this.week.set({ ...week, rows: week.rows.map((row) => row.employeeId !== employeeId ? row : {
      ...row, days: row.days.map((value, i) => i === day ? checked : value),
    }) });
  }

  async copy() {
    const week = this.week();
    if (!week || !this.canEdit() || this.busy()) return;
    const hasSchedule = [week, this.saved()].some((value) =>
      this.scope(value?.rows ?? []).some((row) => row.days.some(Boolean)));
    if ((hasSchedule || this.dirty()) && !window.confirm(
      'Tuần đang mở đã có lịch hoặc có thay đổi chưa lưu. Thay các ô bằng lịch tuần trước?',
    )) return;

    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      const previous = await this.api.week(addDays(week.monday, -7));
      const source = new Map(previous.rows.map((row) => [row.employeeId, row.days]));
      this.week.set({ ...week, rows: week.rows.map((row) => this.employeeId !== null && row.employeeId !== this.employeeId ? row : ({
        employeeId: row.employeeId, days: source.get(row.employeeId) ?? row.days.map(() => false),
      })) });
      this.notice.set('Đã sao chép lịch vào bảng. Bấm Lưu lịch để ghi thay đổi.');
    } catch (error) { this.error.set(errorMessage(error)); }
    finally { this.busy.set(false); }
  }

  private scope(rows: Week['rows']) {
    return this.employeeId === null ? rows : rows.filter((row) => row.employeeId === this.employeeId);
  }

  async save() {
    const week = this.week();
    if (!week || !this.canEdit() || !this.dirty() || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      const saved = await this.api.saveWeek(week);
      this.saved.set(saved);
      this.week.set(saved);
      this.notice.set('Đã lưu lịch làm việc.');
    } catch (error) { this.error.set(errorMessage(error)); }
    finally { this.busy.set(false); }
  }
}
