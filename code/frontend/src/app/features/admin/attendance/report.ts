import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AttendanceApi, Employee, Report, ReportQuery } from './attendance-api';
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
    if (this.busy() || this.noteDirty()) return;
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
    const dirty = this.noteDirty();
    this.report.set(report);
    if (!dirty) this.noteText = report.periodNote;
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

  noteDirty() {
    return this.noteText !== (this.report()?.periodNote ?? '');
  }

  resetNote() {
    this.noteText = this.report()?.periodNote ?? '';
  }

  async saveNote() {
    if (!this.applied || !this.noteDirty() || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    const text = this.noteText.trim();
    try {
      await this.api.saveNote(this.applied, text);
      this.noteText = text;
      this.report.update((report) => report && { ...report, periodNote: text });
      this.notice.set('Đã lưu ghi chú chung.');
    } catch (error) { this.error.set(errorMessage(error)); }
    finally { this.busy.set(false); }
  }

  async download() {
    if (!this.applied || this.busy() || this.noteDirty()) return;
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
