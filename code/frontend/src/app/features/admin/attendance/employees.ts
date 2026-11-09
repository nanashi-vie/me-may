import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AttendanceApi, Employee } from './attendance-api';
import { displayDay, errorMessage } from './attendance-display';

const empty = { fullName: '', displayName: '', phone: '', startedOn: '', pin: '', active: true };

@Component({
  imports: [FormsModule],
  templateUrl: './employees.html',
  styleUrl: './attendance.scss',
})
export class Employees implements OnInit {
  private readonly api = inject(AttendanceApi);
  readonly employees = signal<Employee[]>([]);
  readonly error = signal('');
  readonly notice = signal('');
  readonly busy = signal(false);
  readonly day = displayDay;
  editing: Employee | null = null;
  resetting: Employee | null = null;
  form = { ...empty };
  newPin = '';

  ngOnInit() { void this.load(); }

  async load() {
    this.busy.set(true);
    this.error.set('');
    try { this.employees.set(await this.api.employees()); }
    catch (error) { this.error.set(errorMessage(error)); }
    finally { this.busy.set(false); }
  }

  select(employee: Employee | null) {
    this.editing = employee;
    this.resetting = null;
    this.newPin = '';
    this.form = employee ? {
      fullName: employee.fullName, displayName: employee.displayName, phone: employee.phone ?? '',
      startedOn: employee.startedOn ?? '', active: employee.active, pin: '',
    } : { ...empty };
    this.error.set('');
    this.notice.set('');
  }

  reset(employee: Employee) {
    this.select(null);
    this.resetting = employee;
  }

  async save() {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      const { fullName, displayName, phone, startedOn, active, pin } = this.form;
      const fields = { fullName, displayName, phone: phone || null, startedOn: startedOn || null };
      if (this.resetting) {
        await this.api.reset(this.resetting.id, this.newPin);
        this.select(null);
        this.notice.set('Đã đặt lại PIN.');
      } else {
        const saved = this.editing
          ? await this.api.edit(this.editing.id, { ...fields, active, version: this.editing.version })
          : await this.api.create({ ...fields, pin });
        this.employees.update((list) => list.some((item) => item.id === saved.id)
          ? list.map((item) => item.id === saved.id ? saved : item) : [...list, saved]);
        this.select(null);
        this.notice.set(`Đã lưu hồ sơ ${saved.displayName}.`);
      }
    } catch (error) { this.error.set(errorMessage(error)); }
    finally { this.busy.set(false); }
  }
}
