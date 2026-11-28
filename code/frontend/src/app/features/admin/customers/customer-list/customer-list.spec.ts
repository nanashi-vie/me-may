import { signal } from '@angular/core';
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
  zaloName: 'Lan Zalo',
  tiktokId: '@lan.tik',
  threadsId: '@lan.books',
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
  it('shows social accounts from the list without per-customer detail requests', async () => {
    const {f, api} = setup();
    await f.whenStable();f.detectChanges();
    const cells=Array.from(f.nativeElement.querySelectorAll('tbody td')) as HTMLElement[];
    expect(cells.slice(1,5).map(c=>c.textContent?.trim())).toEqual(['Lan Zalo','@lan.tik','@lan.books','0987123456']);
    expect(cells[5].textContent?.trim()).toBe('—');
    expect(api.detail).not.toHaveBeenCalled();
  });
  it('offers the trash only on rows the server allows, and to the owner alone', async () => {
    const { f, api } = setup();
    api.list.mockReturnValue(of({ ...page, items: [row, { ...row, id: '2', customerCode: 'KH-000002', trashable: true }] } as any));
    f.componentInstance.refresh();
    await f.whenStable();f.detectChanges();
    const rows = f.nativeElement.querySelectorAll('tbody tr') as NodeListOf<HTMLElement>;
    expect(rows[0].querySelector('.trash-btn')).toBeNull();
    expect(rows[0].lastElementChild?.textContent?.trim()).toBe('—');
    expect(rows[1].querySelector('.trash-btn')?.getAttribute('aria-label')).toBe('Xóa KH-000002');
  });
  it('opens the confirmation, then reloads and announces the result', async () => {
    const { f, c, api } = setup();
    api.list.mockReturnValue(of({ ...page, items: [{ ...row, trashable: true }] } as any));
    c.refresh();
    await f.whenStable();f.detectChanges();
    const dialog = f.nativeElement.querySelector('app-trash-dialog dialog') as HTMLDialogElement;
    dialog.showModal = vi.fn();
    f.nativeElement.querySelector('.trash-btn').click();
    f.detectChanges();
    expect(dialog.showModal).toHaveBeenCalledOnce();
    expect(dialog.textContent).toContain('Lan (KH-000001)');
    const calls = api.list.mock.calls.length;
    c.onTrashed('KH-000001');
    expect(api.list).toHaveBeenCalledTimes(calls + 1);
    expect(c.toast()).toContain('KH-000001');
  });
  it('hides the actions column from STAFF', async () => {
    const { f, api } = setup('STAFF');
    api.list.mockReturnValue(of({ ...page, items: [{ ...row, trashable: true }] } as any));
    f.componentInstance.refresh();
    await f.whenStable();f.detectChanges();
    expect(f.nativeElement.querySelector('.trash-btn')).toBeNull();
    expect(f.nativeElement.textContent).not.toContain('Thao tác');
  });
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
    expect(f.nativeElement.querySelector('.row-actions')).toBeNull();
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
  it('opens customer details from the whole row and offers no action on a kept row', async () => {
    const {f} = setup();await f.whenStable();f.detectChanges();
    const root=f.nativeElement as HTMLElement;
    expect(Array.from(root.querySelectorAll('th')).map(h=>h.textContent?.trim())).toEqual([
      'Khách hàng','Zalo','TikTok','Threads','Số điện thoại','Tổng số đơn hàng','Thao tác']);
    expect(root.querySelector('tbody button')).toBeNull();
    expect(root.querySelector('a.customer-name')).toBeNull();
    const row=root.querySelector('tbody tr.customer-row') as HTMLElement;
    expect(row.getAttribute('aria-label')).toMatch(/^Mở khách /);
    expect(row.textContent).toContain('Lan');
    const navigate=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
    (row.querySelector('td') as HTMLElement).click();
    expect(navigate).toHaveBeenCalledWith(['/admin/customers','1'],{queryParams:{q:'lan',status:'ALL',page:2,size:20}});
  });
});
