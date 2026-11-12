import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { CustomerForm } from '../customer-form/customer-form';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { vi } from 'vitest';
import { CustomerList } from './customer-list';
import { CustomerApi } from '../customer-api';
import { AuthService, CurrentAdmin } from '../../../../core/auth/auth.service';
const row = {
  id: '1',
  customerCode: 'KH-000001',
  fullName: 'Lan',
  phone: '0987123456',
  defaultAddress: null,
  status: 'ACTIVE' as const,
  version: 0,
  createdAt: '2026-11-12T00:00:00Z',
};
const page = { items: [row], page: 0, size: 20, totalElements: 1, totalPages: 1 };
describe('CustomerList', () => {
  function setup(role: 'OWNER' | 'STAFF' = 'OWNER') {
    const query = new BehaviorSubject(
      convertToParamMap({ q: 'lan', status: 'ALL', page: '2', size: '20' }),
    );
    const user = signal<CurrentAdmin | null>({ id: 1, email: 'test@example.com', role }),
      epoch = signal(0);
    const api = {
      list: vi.fn((_filter: any) => of(page)),
      detail: vi.fn(() =>
        of({
          ...row,
          zaloName: null,
          tiktokId: null,
          threadsId: null,
          note: null,
          createdBy: '1',
          updatedAt: row.createdAt,
        }),
      ),
      setStatus: vi.fn(() => of(row)),
      duplicates: vi.fn(() => of({ items: [], totalElements: 0 })),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: query } },
        { provide: CustomerApi, useValue: api },
        { provide: AuthService, useValue: { user, epoch } },
      ],
    });
    const nav = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const f = TestBed.createComponent(CustomerList);
    f.detectChanges();
    return { f, c: f.componentInstance, api, query, nav, user, epoch };
  }
  it('preserves route filters and resets page on filter changes', async () => {
    const { f, c, api, nav } = setup();
    await f.whenStable();
    expect(api.list).toHaveBeenCalledWith({ q: 'lan', status: 'ALL', page: 2, size: 20 });
    c.changeStatus('ARCHIVED');
    expect(nav).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: expect.objectContaining({ status: 'ARCHIVED', page: 0 }),
      }),
    );
    c.onSaved({
      ...row,
      zaloName: null,
      tiktokId: null,
      threadsId: null,
      note: null,
      createdBy: '1',
      updatedAt: row.createdAt,
    });
    expect(c.toast()).toContain('cập nhật');
  });
  it('ignores outdated results and clears profile data on session changes', async () => {
    const { f, c, api, query, user, epoch } = setup();
    await f.whenStable();
    const old = new Subject<any>(),
      latest = new Subject<any>();
    api.list.mockReturnValueOnce(old as any).mockReturnValueOnce(latest as any);
    query.next(convertToParamMap({ q: 'old' }));
    query.next(convertToParamMap({ q: 'new' }));
    latest.next({ ...page, items: [{ ...row, fullName: 'Latest' }] });
    old.next(page);
    expect(c.page()?.items[0].fullName).toBe('Latest');
    user.set(null);
    epoch.set(1);
    f.detectChanges();
    await f.whenStable();
    expect(c.page()).toBeNull();
  });
  it('shows staff read-only empty state and blocks mutation', async () => {
    const { f, c, api } = setup('STAFF');
    api.list.mockReturnValue(of({ ...page, items: [], totalElements: 0, totalPages: 0 }));
    c.refresh();
    await f.whenStable();
    f.detectChanges();
    expect(f.nativeElement.textContent).not.toContain('Thêm khách mới');
    expect(f.nativeElement.textContent).not.toContain('Nhấn');
    c.changeCustomerStatus(row);
    expect(api.setStatus).not.toHaveBeenCalled();
  });
  it('searches the same previous term again after a route reset', async () => {
    const { f, c, query, nav } = setup();
    await f.whenStable();
    c.search('Mai');
    await new Promise((r) => setTimeout(r, 330));
    query.next(convertToParamMap({ q: 'Mai' }));
    query.next(convertToParamMap({ q: '' }));
    nav.mockClear();
    c.search('Mai');
    await new Promise((r) => setTimeout(r, 330));
    expect(nav).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: expect.objectContaining({ q: 'Mai', page: 0 }) }),
    );
  });
  it('does not let an old edit response replace a new create draft', async () => {
    const { f, c, api } = setup();
    await f.whenStable();
    const pending = new Subject<any>();
    api.detail.mockReturnValue(pending as any);
    c.edit(row);
    c.openNew();
    const editor = f.debugElement.query(By.directive(CustomerForm))
      .componentInstance as CustomerForm;
    editor.form.controls.fullName.setValue('New draft');
    editor.form.markAsDirty();
    pending.next({
      ...row,
      zaloName: null,
      tiktokId: null,
      threadsId: null,
      note: null,
      createdBy: '1',
      updatedAt: row.createdAt,
    });
    expect(editor.customer()).toBeNull();
    expect(editor.form.controls.fullName.value).toBe('New draft');
  });
});
