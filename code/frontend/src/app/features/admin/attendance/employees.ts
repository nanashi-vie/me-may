import { Component, HostListener, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AttendanceApi, Employee } from './attendance-api';
import { errorMessage } from './attendance-display';

const empty = { fullName: '', phone: '', startedOn: '', pin: '', active: true };

@Component({
  imports: [FormsModule, RouterLink],
  templateUrl: './employees.html',
  styleUrl: './attendance.scss',
})
export class Employees implements OnInit {
  private readonly api = inject(AttendanceApi);
  readonly employees = signal<Employee[]>([]);
  readonly error = signal('');
  private readonly navigationNotice = inject(Router).currentNavigation()?.extras.state?.['attendanceNotice'];
  readonly notice = signal(typeof this.navigationNotice === 'string' ? this.navigationNotice : '');
  readonly busy = signal(false);
  readonly menuEmployee = signal<number | null>(null);
  creating = false;
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

  add() {
    this.select(null);
    this.creating = true;
  }

  openMenu(id: number) {
    if (!this.busy()) this.menuEmployee.set(id);
  }

  closeMenu(id: number) {
    if (this.menuEmployee() === id) this.menuEmployee.set(null);
  }

  @HostListener('document:click', ['$event.target'])
  closeOutsideMenu(target: EventTarget | null) {
    if (target instanceof Element && !target.closest('.employee-row')) this.menuEmployee.set(null);
  }

  select(employee: Employee | null) {
    this.creating = false;
    this.menuEmployee.set(null);
    this.editing = employee;
    this.resetting = null;
    this.newPin = '';
    this.form = employee ? {
      fullName: employee.fullName, phone: employee.phone ?? '',
      startedOn: employee.startedOn ?? '', active: employee.active, pin: '',
    } : { ...empty };
    this.error.set('');
    this.notice.set('');
  }

  reset(employee: Employee) {
    this.select(employee);
    this.resetting = employee;
  }

  async save() {
    if (this.busy() || (!this.creating && !this.editing)) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      const { fullName, phone, startedOn, active, pin } = this.form;
      const fields = { fullName, phone: phone || null, startedOn: startedOn || null };
      if (this.resetting) {
        await this.api.reset(this.resetting.id, this.newPin);
        this.select(this.resetting);
        this.notice.set('Đã đặt lại PIN.');
      } else {
        const saved = this.editing
          ? await this.api.edit(this.editing.id, { ...fields, active, version: this.editing.version })
          : await this.api.create({ ...fields, pin });
        this.employees.update((list) => list.some((item) => item.id === saved.id)
          ? list.map((item) => item.id === saved.id ? saved : item) : [...list, saved]);
        this.select(saved);
        this.notice.set(`Đã lưu hồ sơ ${saved.fullName}.`);
      }
    } catch (error) { this.error.set(errorMessage(error)); }
    finally { this.busy.set(false); }
  }
}
