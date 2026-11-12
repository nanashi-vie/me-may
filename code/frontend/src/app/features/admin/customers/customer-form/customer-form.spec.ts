import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi, afterEach } from 'vitest';
import { CustomerForm } from './customer-form';
import { CustomerApi } from '../customer-api';
import { AuthService, CurrentAdmin } from '../../../../core/auth/auth.service';
import { CustomerDetail, CustomerMutation } from '../customer-models';
const detail: CustomerDetail = {
  id: '1',
  customerCode: 'KH-000001',
  fullName: 'Lan',
  phone: null,
  defaultAddress: null,
  zaloName: null,
  tiktokId: null,
  threadsId: null,
  note: null,
  status: 'ACTIVE',
  version: 0,
  createdBy: '1',
  createdAt: '2026-11-12T00:00:00Z',
  updatedAt: '2026-11-12T00:00:00Z',
};
describe('CustomerForm', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });
  function setup() {
    const user = signal<CurrentAdmin | null>({ id: 1, email: 'owner@test', role: 'OWNER' }),
      epoch = signal(0),
      pending = new Subject<CustomerDetail>();
    const api = {
      create: vi.fn((_body: CustomerMutation) => pending),
      update: vi.fn(() => pending),
      detail: vi.fn(() => of(detail)),
      duplicates: vi.fn(() =>
        of({ items: [], totalElements: 0, page: 0, size: 20, totalPages: 0 }),
      ),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: CustomerApi, useValue: api },
        { provide: AuthService, useValue: { user, epoch } },
      ],
    });
    const f = TestBed.createComponent(CustomerForm);
    f.detectChanges();
    return { f, c: f.componentInstance, api, user, epoch, pending };
  }
  it('renders approved fields and only saves once while pending', () => {
    const { f, c, api, pending } = setup();
    c.open();
    f.detectChanges();
    const text = f.nativeElement.textContent;
    for (const label of ['Tên Zalo', 'Tên TikTok', 'Tên Threads']) expect(text).toContain(label);
    c.form.controls.fullName.setValue('Lan');
    c.form.markAsDirty();
    const saved = vi.fn();
    c.saved.subscribe(saved);
    c.save();
    c.save();
    expect(api.create).toHaveBeenCalledTimes(1);
    pending.next(detail);
    expect(saved).toHaveBeenCalledTimes(1);
    expect(c.visible()).toBe(false);
  });
  it('protects dirty dismissal and retains input on network and stale errors', () => {
    const { c, api } = setup();
    c.open(detail);
    c.form.controls.fullName.setValue('Changed');
    c.form.markAsDirty();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(c.requestClose()).toBe(false);
    expect(c.visible()).toBe(true);
    api.update.mockReturnValue(
      throwError(() => ({
        status: 409,
        error: { error: 'version_conflict', currentVersion: 1 },
      })) as any,
    );
    c.save();
    expect(c.form.controls.fullName.value).toBe('Changed');
    expect(c.conflict()).toBe(true);
    api.update.mockReturnValue(throwError(() => ({ status: 0 })) as any);
    c.save();
    expect(c.form.controls.fullName.value).toBe('Changed');
    expect(c.error()).toContain('kiểm tra danh sách');
  });
  it('binds duplicate confirmation to current phone and ignores old duplicate results', async () => {
    vi.useFakeTimers();
    const { c, api } = setup();
    const old = new Subject<any>();
    api.duplicates.mockReturnValue(old as any);
    c.open();
    c.form.controls.fullName.setValue('Lan');
    c.form.controls.phone.setValue('0987123456');
    await vi.advanceTimersByTimeAsync(310);
    c.form.controls.phone.setValue('0901234567');
    old.next({
      items: [
        {
          id: '2',
          customerCode: 'KH-000002',
          fullName: 'Other',
          phone: '0987123456',
          status: 'ACTIVE',
        },
      ],
      totalElements: 1,
      page: 0,
      size: 20,
      totalPages: 1,
    });
    expect(c.duplicates()?.totalElements || 0).toBe(0);
    c.confirmedPhone.set('0901234567');
    c.form.controls.phone.setValue('0987123456');
    expect(c.confirmedPhone()).toBeNull();
    c.save();
    expect(api.create.mock.calls[0][0]).not.toHaveProperty('confirmedPhone');
  });
  it('does not show duplicate results from a previously closed editor', async () => {
    vi.useFakeTimers();
    const { c, api } = setup();
    const old = new Subject<any>();
    api.duplicates.mockReturnValue(old as any);
    c.open();
    c.form.controls.phone.setValue('0987123456');
    await vi.advanceTimersByTimeAsync(310);
    c.requestClose();
    c.open();
    old.next({
      items: [
        {
          id: '2',
          customerCode: 'KH-000002',
          fullName: 'Old',
          phone: '0987123456',
          status: 'ACTIVE',
        },
      ],
      totalElements: 1,
      page: 0,
      size: 20,
      totalPages: 1,
    });
    expect(c.duplicates()?.totalElements || 0).toBe(0);
  });
  it('clears private state and blocks mutation after session or role changes', () => {
    const { f, c, user, epoch, api } = setup();
    c.open(detail);
    c.form.controls.note.setValue('Private');
    user.set(null);
    epoch.set(1);
    f.detectChanges();
    expect(c.visible()).toBe(false);
    expect(c.form.controls.note.value).toBe('');
    c.save();
    expect(api.update).not.toHaveBeenCalled();
    user.set({ id: 2, email: 'staff@test', role: 'STAFF' });
    f.detectChanges();
    c.open(detail);
    c.save();
    expect(api.create).not.toHaveBeenCalled();
    expect(api.update).not.toHaveBeenCalled();
  });
  it('makes exactly one discard decision for a real duplicate-link click', () => {
    const { f, c } = setup();
    const router = TestBed.inject(Router);
    const nav = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const byUrl = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    c.open();
    c.form.controls.fullName.setValue('Dirty');
    c.form.markAsDirty();
    c.duplicates.set({
      items: [
        {
          id: '2',
          customerCode: 'KH-000002',
          fullName: 'Other',
          phone: '0987123456',
          status: 'ACTIVE',
        },
      ],
      page: 0,
      size: 20,
      totalPages: 1,
      totalElements: 1,
    });
    f.detectChanges();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const link = f.nativeElement.querySelector('#customer-duplicates a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/admin/customers/2');
    link.click();
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(nav).not.toHaveBeenCalled();
    expect(byUrl).not.toHaveBeenCalled();
    expect(c.visible()).toBe(true);
    confirm.mockReturnValue(true);
    link.click();
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(nav).toHaveBeenCalledWith(['/admin/customers', '2']);
    expect(c.visible()).toBe(false);
  });
});
