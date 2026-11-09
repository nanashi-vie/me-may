import { Component, computed, ElementRef, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AttendanceApi, Employee, PunchAction, Verified } from './attendance-api';
import { addDays, closingTime, displayDay, displayTime, errorCode, errorMessage, statusLabel, weekdays } from './attendance-display';

@Component({
  imports: [FormsModule],
  templateUrl: './punch.html',
  styleUrl: './attendance.scss',
})
export class Punch implements OnInit, OnDestroy {
  private readonly api = inject(AttendanceApi);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('confirmation');
  readonly profiles = signal<Employee[]>([]);
  readonly verified = signal<Verified | null>(null);
  readonly error = signal('');
  readonly notice = signal('');
  readonly busy = signal(false);
  readonly pending = signal<PunchAction | null>(null);
  readonly confirmationTime = signal('');
  readonly needsOutsideConfirmation = signal(false);
  readonly working = computed(() => {
    const status = this.verified()?.status;
    return status === 'WORKING' || status === 'NEEDS_REVIEW';
  });
  readonly statusLabel = statusLabel;
  readonly weekdays = weekdays;
  readonly date = addDays;
  readonly day = displayDay;
  readonly time = displayTime;
  employeeId: number | null = null;
  pin = '';
  private expires: ReturnType<typeof setTimeout> | undefined;
  private cutoff: ReturnType<typeof setTimeout> | undefined;
  private destroyed = false;
  private referenceTime = 0;

  ngOnInit() { void this.load(); }

  ngOnDestroy() {
    this.destroyed = true;
    clearTimeout(this.expires);
    clearTimeout(this.cutoff);
  }

  async load() {
    this.busy.set(true);
    this.error.set('');
    try { this.profiles.set((await this.api.employees()).filter((profile) => profile.active)); }
    catch (error) { this.error.set(errorMessage(error)); }
    finally { this.busy.set(false); }
  }

  async unlock() {
    if (this.busy() || this.employeeId === null || !/^[0-9]{6}$/.test(this.pin)) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      const view = await this.api.verify(this.employeeId, this.pin);
      if (this.destroyed) return;
      this.referenceTime = performance.now();
      this.verified.set(view);
      this.needsOutsideConfirmation.set(view.outsideSchedule);
      if (view.status === 'WORKING' && view.startedAt) {
        const closing = closingTime(view.startedAt);
        if (closing < Date.parse(view.expiresAt)) {
          this.cutoff = setTimeout(() => {
            this.verified.update((current) => current?.token === view.token
              ? { ...current, status: 'NEEDS_REVIEW' } : current);
          }, Math.max(0, closing - Date.parse(view.serverTime)));
        }
      }
      this.expires = setTimeout(() => {
        this.clear();
        this.notice.set('Đã thoát hồ sơ chấm công sau 30 giây.');
      }, Date.parse(view.expiresAt) - Date.parse(view.serverTime));
    } catch (error) { this.error.set(errorMessage(error)); }
    finally {
      this.pin = '';
      this.busy.set(false);
    }
  }

  open(action: PunchAction, event: Event) {
    (event.target as HTMLInputElement).checked = false;
    const view = this.verified();
    if (!view || this.busy() || (action === 'END') !== this.working()) return;
    this.pending.set(action);
    const current = new Date(Date.parse(view.serverTime) + performance.now() - this.referenceTime);
    this.confirmationTime.set(current.toISOString());
    this.dialog().nativeElement.showModal();
  }

  cancel() {
    this.pending.set(null);
    this.dialog().nativeElement.close();
  }

  clear() {
    clearTimeout(this.expires);
    clearTimeout(this.cutoff);
    this.cancel();
    this.verified.set(null);
    this.employeeId = null;
    this.pin = '';
    this.error.set('');
    this.needsOutsideConfirmation.set(false);
  }

  async confirm() {
    const view = this.verified();
    const action = this.pending();
    if (!view || !action || this.busy()) return;
    const acknowledged = this.needsOutsideConfirmation();
    this.cancel();
    this.busy.set(true);
    this.error.set('');
    try {
      const result = await this.api.punch(view.token, action, acknowledged);
      if (this.destroyed) return;
      this.clear();
      this.notice.set(`Đã ghi nhận ${action === 'START' ? 'bắt đầu' : 'kết thúc'} ca lúc ${displayTime(result.recordedAt)}.`);
    } catch (error) {
      if (this.destroyed) return;
      const code = errorCode(error);
      if (code === 'punch_expired' || code === 'shift_changed' || code === 'inactive_employee') this.clear();
      if (code === 'outside_schedule') this.needsOutsideConfirmation.set(true);
      this.error.set(errorMessage(error));
    } finally { this.busy.set(false); }
  }
}
