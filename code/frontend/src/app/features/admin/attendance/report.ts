import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AttendanceApi, Employee, Report, ReportQuery, Summary } from './attendance-api';
import { closingTime, displayDay, errorMessage, localInput, today } from './attendance-display';

@Component({
  imports: [FormsModule],
  templateUrl: './report.html',
  styleUrl: './attendance.scss',
})
export class AttendanceReport implements OnInit, OnDestroy {
  private readonly api = inject(AttendanceApi);
  readonly employees = signal<Employee[]>([]);
  readonly report = signal<Report | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly noteRow = signal<Summary | null>(null);
  noteText = '';
  readonly day = displayDay;
  query: ReportQuery = { period: 'WEEK', date: today(), employeeId: null, filter: 'ALL' };
  private applied: ReportQuery | null = null;
  private refresh: ReturnType<typeof setTimeout> | undefined;
  private destroyed = false;

  ngOnInit() { void this.load(); }

  ngOnDestroy() {
    this.destroyed = true;
    clearTimeout(this.refresh);
  }

  async load() {
    if (this.busy() || this.noteRow()) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    const query = { ...this.query };
    try {
      const [report, employees] = await Promise.all([this.api.report(query), this.api.employees()]);
      this.employees.set(employees);
      this.applied = query;
      this.setReport(report);
    } catch (error) { this.error.set(errorMessage(error)); }
    finally { this.busy.set(false); }
  }

  private setReport(report: Report) {
    if (this.destroyed) return;
    this.report.set(report);
    clearTimeout(this.refresh);
    const day = localInput(report.serverTime).slice(0, 10);
    const closing = closingTime(report.serverTime);
    const delay = closing - Date.parse(report.serverTime);
    if (delay > 0 && day >= report.from && day <= report.to) {
      this.refresh = setTimeout(() => void this.refreshAtClosing(), delay + 250);
    }
  }

  private async refreshAtClosing() {
    if (!this.applied || this.destroyed) return;
    if (this.busy()) {
      this.refresh = setTimeout(() => void this.refreshAtClosing(), 1000);
      return;
    }
    const query = this.applied;
    try {
      const report = await this.api.report(query);
      if (query === this.applied) this.setReport(report);
    } catch (error) { if (query === this.applied) this.error.set(errorMessage(error)); }
  }

  async openNote(row: Summary) {
    if (!this.applied || this.busy() || this.noteRow()) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      const note = await this.api.note(row.employeeId, this.applied);
      this.noteText = note.text;
      this.noteRow.set(row);
    } catch (error) { this.error.set(errorMessage(error)); }
    finally { this.busy.set(false); }
  }

  async saveNote() {
    const row = this.noteRow();
    if (!row || !this.applied || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.api.saveNote(row.employeeId, this.applied, this.noteText);
      this.noteRow.set(null);
      this.notice.set('Đã lưu ghi chú.');
    } catch (error) { this.error.set(errorMessage(error)); }
    finally { this.busy.set(false); }
  }

  async download() {
    if (!this.applied || this.busy() || this.noteRow()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const blob = await this.api.excel(this.applied);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bang-cong-${this.report()?.from ?? this.applied.date}.xlsx`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { this.error.set(errorMessage(error)); }
    finally { this.busy.set(false); }
  }
}
