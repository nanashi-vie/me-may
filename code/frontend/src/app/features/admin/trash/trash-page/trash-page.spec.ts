import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, Observable, Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { TrashApi, TrashItem, TrashKind } from '../trash-api';
import { TrashPage } from './trash-page';

const item = (id: string, code: string, expiresAt = '2099-01-01T00:00:00Z'): TrashItem =>
  ({ id, code, name: 'Tên ' + id, version: 2, deletedAt: '2098-12-25T00:00:00Z', expiresAt });
const page = (items: TrashItem[], totalPages = 1) =>
  ({ items, page: 0, size: 20, totalElements: items.length, totalPages });

describe('TrashPage', () => {
  function setup(loai: string | null = null, overrides: Record<string, unknown> = {}) {
    const query = new BehaviorSubject(convertToParamMap(loai ? { loai } : {}));
    const api = {
      list: vi.fn((kind: TrashKind, _page: number): Observable<ReturnType<typeof page>> =>
        of(page(kind === 'books' ? [item('7', 'MM-000007'), item('8', 'MM-000008', '2020-01-01T00:00:00Z')] : [item('3', kind === 'orders' ? 'DH-000003' : 'KH-000003')]))),
      selection: vi.fn(() => of([{ id: '7', version: 2 }, { id: '99', version: 5 }])),
      change: vi.fn((): Observable<void> => of(undefined)),
      purge: vi.fn((): Observable<void> => of(undefined)),
      ...overrides,
    };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: ActivatedRoute, useValue: { queryParamMap: query } }, { provide: TrashApi, useValue: api }],
    });
    const f = TestBed.createComponent(TrashPage);
    f.detectChanges();
    const root = f.nativeElement as HTMLElement;
    const dialog = root.querySelector('dialog') as HTMLDialogElement;
    let focused: string | undefined;
    dialog.showModal = vi.fn(() => { focused = dialog.querySelector('[autofocus]')?.textContent?.trim(); });
    dialog.close = vi.fn();
    const button = (text: string, scope: Element = root) =>
      Array.from(scope.querySelectorAll('button')).find((b) => b.textContent!.trim() === text);
    const click = (b?: HTMLElement | null) => { b!.click(); f.detectChanges(); };
    return { f, root, dialog, api, query, button, click, focused: () => focused };
  }
  it('opens the book tab by default and switches kind from the URL', () => {
    const t = setup();
    expect(Array.from(t.root.querySelectorAll('.trash-tabs a')).map((a) => a.textContent!.trim())).toEqual(['Sách', 'Khách hàng', 'Đơn hàng']);
    expect(t.root.querySelector('.trash-tabs [aria-current="page"]')?.textContent?.trim()).toBe('Sách');
    expect(t.root.textContent).toContain('MM-000007');
    t.query.next(convertToParamMap({ loai: 'don-hang' }));
    t.f.detectChanges();
    expect(t.api.list).toHaveBeenLastCalledWith('orders', 0);
    expect(t.root.querySelector('.trash-tabs [aria-current="page"]')?.textContent?.trim()).toBe('Đơn hàng');
    expect(t.root.textContent).toContain('DH-000003');
    expect(t.root.textContent).not.toContain('MM-000007');
  });
  it('drops a slow response from the previous tab', () => {
    const slow = new Subject<ReturnType<typeof page>>();
    const t = setup(null, { list: vi.fn((kind: TrashKind) => (kind === 'books' ? slow : of(page([item('3', 'KH-000003')])))) });
    t.query.next(convertToParamMap({ loai: 'khach-hang' }));
    slow.next(page([item('7', 'MM-000007')]));
    t.f.detectChanges();
    expect(t.root.textContent).toContain('KH-000003');
    expect(t.root.textContent).not.toContain('MM-000007');
  });
  it('restores one record and reloads, refusing expired ones', () => {
    const t = setup();
    const rows = t.root.querySelectorAll('.trash-item');
    expect(t.button('Khôi phục', rows[1])!.disabled).toBe(true);
    t.click(t.button('Khôi phục', rows[0]));
    expect(t.api.change).toHaveBeenCalledExactlyOnceWith('books', '7', 2, false);
    expect(t.api.list).toHaveBeenCalledTimes(2);
    expect(t.root.querySelector('[role="status"]')?.textContent).toContain('Đã khôi phục MM-000007');
  });
  it('purges only the selected records of the open tab after confirmation', () => {
    const t = setup('khach-hang');
    expect(t.button('Dọn (0)')!.disabled).toBe(true);
    t.click(t.root.querySelector<HTMLInputElement>('[aria-label="Chọn KH-000003"]'));
    t.click(t.button('Dọn (1)'));
    expect(t.focused()).toBe('Hủy');
    expect(t.dialog.textContent).toContain('1 khách hàng');
    expect(t.api.purge).not.toHaveBeenCalled();
    t.click(t.button('Dọn vĩnh viễn', t.dialog));
    expect(t.api.purge).toHaveBeenCalledExactlyOnceWith('customers', [{ id: '3', version: 2 }]);
    expect(t.f.componentInstance.selected().size).toBe(0);
  });
  it('confirms the full snapshot rather than only the visible page', () => {
    const t = setup();
    t.click(t.button('Dọn tất cả'));
    expect(t.dialog.textContent).toContain('2 cuốn sách');
    expect(t.dialog.textContent).toContain('kể cả các trang khác');
    t.click(t.button('Dọn vĩnh viễn', t.dialog));
    expect(t.api.purge).toHaveBeenCalledExactlyOnceWith('books', [{ id: '7', version: 2 }, { id: '99', version: 5 }]);
  });
  it('warns that purging orders also deletes their payment history', () => {
    const t = setup('don-hang');
    t.click(t.button('Dọn tất cả'));
    expect(t.dialog.textContent).toContain('lịch sử giao dịch');
  });
  it('never purges a snapshot of one kind under another tab', () => {
    const snapshot = new Subject<{ id: string; version: number }[]>();
    const t = setup(null, { selection: vi.fn(() => snapshot) });
    t.click(t.button('Dọn tất cả'));
    t.query.next(convertToParamMap({ loai: 'don-hang' }));
    snapshot.next([{ id: '7', version: 2 }]);
    t.f.detectChanges();
    expect(t.dialog.showModal).not.toHaveBeenCalled();
    expect(t.button('Dọn tất cả')!.disabled).toBe(false);
  });
  it.each([
    ['version_conflict', 'đã thay đổi'],
    ['book_order_reference', 'còn trong đơn hàng'],
  ])('reports %s after a refused purge and reloads', (error, text) => {
    const t = setup(null, { purge: vi.fn(() => throwError(() => new HttpErrorResponse({ status: 409, error: { error } }))) });
    t.click(t.root.querySelector<HTMLInputElement>('[aria-label="Chọn MM-000007"]'));
    t.click(t.button('Dọn (1)'));
    t.click(t.button('Dọn vĩnh viễn', t.dialog));
    expect(t.root.querySelector('[role="alert"]')?.textContent).toContain(text);
    expect(t.api.list).toHaveBeenCalledTimes(2);
  });
  it('steps back when the last page empties and shows an empty state', () => {
    const t = setup(null, { list: vi.fn((_kind: TrashKind, n: number) => of({ ...page([], n ? 1 : 0), page: n })) });
    t.f.componentInstance.load(1);
    t.f.detectChanges();
    expect(t.api.list).toHaveBeenLastCalledWith('books', 0);
    expect(t.root.textContent).toContain('Thùng rác trống');
  });
  it('shows a retryable load error', () => {
    const t = setup(null, { list: vi.fn(() => throwError(() => new HttpErrorResponse({ status: 500 }))) });
    expect(t.root.querySelector('[role="alert"]')?.textContent).toContain('Chưa tải được');
    t.click(t.button('Thử lại'));
    expect(t.api.list).toHaveBeenCalledTimes(2);
  });
});
