import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AttendanceApi, Audit, Employee, Report, ReportQuery, Shift } from './attendance-api';
import { closingTime, displayDay, displayTime, errorMessage, localInput, statusLabel, today } from './attendance-display';

@Component({
  imports: [FormsModule],
  templateUrl: './report.html',
  styleUrl: './attendance.scss',
})
export class AttendanceReport implements OnInit, OnDestroy {
  private readonly api = inject(AttendanceApi);
  readonly employees = signal<Employee[]>([]);
  readonly report = signal<Report | null>(null);
  readonly edit = signal<Shift | null>(null);
  readonly audit = signal<Audit[]>([]);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly day = displayDay;
  readonly time = displayTime;
  readonly statusLabel = statusLabel;
  readonly hours = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });
  query: ReportQuery = { period: 'WEEK', date: today(), employeeId: null, filter: 'ALL' };
  private applied: ReportQuery | null = null;
  private refresh: ReturnType<typeof setTimeout> | undefined;
  private destroyed = false;
  form = { startedAt: '', endedAt: '', reason: '' };

  ngOnInit() { void this.load(); }

  ngOnDestroy() {
    this.destroyed = true;
    clearTimeout(this.refresh);
  }

  async load() {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    this.edit.set(null);
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

  async select(shift: Shift) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    this.form = { startedAt: localInput(shift.startedAt), endedAt: shift.endedAt ? localInput(shift.endedAt) : '', reason: '' };
    this.edit.set(shift);
    this.audit.set([]);
    try { this.audit.set(await this.api.audit(shift.id)); }
    catch (error) { this.error.set(errorMessage(error)); }
    finally { this.busy.set(false); }
  }

  async save() {
    const shift = this.edit();
    if (!shift || this.busy()) return;
    const { startedAt, endedAt, reason } = this.form;
    if (!startedAt || !endedAt || !reason.trim()) {
      this.error.set('Nhập đầy đủ giờ bắt đầu, giờ kết thúc và lý do.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      await this.api.correct(shift, startedAt + '+07:00', endedAt + '+07:00', reason.trim());
      this.edit.set(null);
      if (this.applied) {
        try { this.setReport(await this.api.report(this.applied)); }
        catch { this.error.set('Đã lưu giờ công. Bấm Xem bảng công để tải lại dữ liệu.'); }
      }
      this.notice.set('Đã lưu giờ công và lịch sử điều chỉnh.');
    } catch (error) { this.error.set(errorMessage(error)); }
    finally { this.busy.set(false); }
  }

  async download() {
    if (!this.applied || this.busy()) return;
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
