import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AdminHttp } from '../../../core/auth/admin-http';

export interface EmployeeFields {
  fullName: string;
  phone: string | null;
  startedOn: string | null;
}
export interface Employee extends EmployeeFields {
  id: number;
  code: string;
  active: boolean;
  version: number;
}
export interface ScheduleRow {
  employeeId: number;
  days: boolean[];
}
export interface Week {
  monday: string;
  today: string;
  editable: boolean;
  version: number;
  rows: ScheduleRow[];
}
export type Status = 'READY' | 'WORKING' | 'NEEDS_REVIEW' | 'COMPLETED';
export type PunchAction = 'START' | 'END';
export interface Verified {
  token: string;
  fullName: string;
  monday: string;
  today: string;
  days: boolean[];
  outsideSchedule: boolean;
  status: Status;
  serverTime: string;
  startedAt: string | null;
  expiresAt: string;
}
export interface Shift {
  id: number;
  employeeId: number;
  name: string;
  day: string;
  startedAt: string;
  endedAt: string | null;
  minutes: number | null;
  status: Status;
  outOfSchedule: boolean;
  lastReason: string | null;
  version: number;
}
export interface Summary {
  employeeId: number;
  code: string;
  name: string;
  registeredDays: number;
  workedDays: number;
  minutes: number;
  reviewCount: number;
}
export interface Report {
  serverTime: string;
  from: string;
  to: string;
  summary: Summary[];
  shifts: Shift[];
}
export interface ReportQuery {
  period: 'WEEK' | 'MONTH';
  date: string;
  employeeId: number | null;
  filter: 'ALL' | 'OPEN' | 'REVIEW' | 'OUTSIDE';
}
export interface Audit {
  actor: string;
  recordedAt: string;
  oldStartedAt: string;
  oldEndedAt: string | null;
  newStartedAt: string;
  newEndedAt: string | null;
  reason: string;
}

@Injectable({ providedIn: 'root' })
export class AttendanceApi {
  private readonly http = inject(AdminHttp);

  employees() {
    return this.get<Employee[]>('/employees');
  }

  create(input: EmployeeFields & { pin: string }) {
    return this.mutate<Employee>('POST', '/employees', input);
  }

  edit(id: number, input: EmployeeFields & { active: boolean; version: number }) {
    return this.mutate<Employee>('PUT', `/employees/${id}`, input);
  }

  reset(id: number, pin: string) {
    return this.mutate<void>('PUT', `/employees/${id}/pin`, { pin });
  }

  week(monday: string) {
    return this.get<Week>(`/weeks/${monday}`);
  }

  saveWeek(week: Week) {
    return this.mutate<Week>('PUT', `/weeks/${week.monday}`, { version: week.version, rows: week.rows });
  }

  verify(employeeId: number, pin: string) {
    return this.mutate<Verified>('POST', '/punch/verify', { employeeId, pin });
  }

  punch(token: string, action: PunchAction, acknowledgedOutsideSchedule: boolean) {
    return this.mutate<{ recordedAt: string }>('POST', '/punch', { token, action, acknowledgedOutsideSchedule });
  }

  report(query: ReportQuery) {
    return this.get<Report>('/report', this.params(query));
  }

  excel(query: ReportQuery) {
    return firstValueFrom(this.http.download('/attendance/report.xlsx', this.params(query)));
  }

  audit(id: number) {
    return this.get<Audit[]>(`/sessions/${id}/audit`);
  }

  correct(shift: Shift, startedAt: string, endedAt: string, reason: string) {
    return this.mutate<void>('PATCH', `/sessions/${shift.id}`, { version: shift.version, startedAt, endedAt, reason });
  }

  private get<T>(path: string, params?: HttpParams) {
    return firstValueFrom(this.http.get<T>('/attendance' + path, params));
  }

  private mutate<T>(method: 'POST' | 'PUT' | 'PATCH', path: string, body: unknown) {
    return firstValueFrom(this.http.mutate<T>(method, '/attendance' + path, body));
  }

  private params(query: ReportQuery) {
    let params = new HttpParams().set('period', query.period).set('date', query.date).set('filter', query.filter);
    if (query.employeeId !== null) params = params.set('employeeId', query.employeeId);
    return params;
  }
}
