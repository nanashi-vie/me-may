import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { TrashApi, TrashKind } from '../trash-api';
import { TrashDialog } from './trash-dialog';

describe('TrashDialog', () => {
  function setup(kind: TrashKind = 'customers') {
    const response = new Subject<void>();
    const change = vi.fn(() => response);
    TestBed.configureTestingModule({ providers: [{ provide: TrashApi, useValue: { change } }] });
    const f = TestBed.createComponent(TrashDialog);
    f.componentRef.setInput('kind', kind);
    f.detectChanges();
    const dialog = f.nativeElement.querySelector('dialog') as HTMLDialogElement;
    let focused: string | undefined;
    dialog.showModal = vi.fn(() => { focused = dialog.querySelector('[autofocus]')?.textContent?.trim(); });
    dialog.close = vi.fn();
    const settled = vi.fn(), trashed = vi.fn();
    f.componentInstance.settled.subscribe(settled);
    f.componentInstance.trashed.subscribe(trashed);
    const button = (text: string) => Array.from(dialog.querySelectorAll('button')).find((b) => b.textContent!.trim() === text);
    const open = () => { f.componentInstance.open({ id: '7', version: 2, code: 'KH-000007', name: 'Lan' }); f.detectChanges(); };
    return { f, dialog, response, change, settled, trashed, button, open, focused: () => focused };
  }
  it('asks with name, code and deadline, focusing cancel, before any request', () => {
    const t = setup();
    t.open();
    expect(t.focused()).toBe('Hủy');
    expect(t.dialog.textContent).toContain('Lan (KH-000007)');
    expect(t.dialog.textContent).toContain('7 ngày');
    t.button('Hủy')!.click();
    expect(t.dialog.close).toHaveBeenCalledOnce();
    expect(t.change).not.toHaveBeenCalled();
  });
  it('moves the record once and reports it', () => {
    const t = setup();
    t.open();
    t.button('Chuyển vào Thùng rác')!.click();
    t.f.detectChanges();
    expect(t.button('Chuyển vào Thùng rác')!.disabled).toBe(true);
    expect(t.change).toHaveBeenCalledExactlyOnceWith('customers', '7', 2, true);
    t.response.next();
    expect(t.trashed).toHaveBeenCalledExactlyOnceWith('KH-000007');
    expect(t.dialog.close).toHaveBeenCalledOnce();
  });
  it.each([
    ['customers', 'customer_has_orders', 'đã có đơn'],
    ['customers', 'customer_not_archived', 'Lưu trữ'],
    ['orders', 'order_not_trashable', 'Nháp hoặc Đã hủy'],
    ['orders', 'order_has_payments', 'giao dịch tiền'],
    ['orders', 'version_conflict', 'thay đổi ở nơi khác'],
  ] as [TrashKind, string, string][])('%s: explains %s and asks the list to reload', (kind, error, text) => {
    const t = setup(kind);
    t.open();
    t.button('Chuyển vào Thùng rác')!.click();
    t.response.error(new HttpErrorResponse({ status: 409, error: { error } }));
    t.f.detectChanges();
    expect(t.dialog.querySelector('[role="alert"]')?.textContent).toContain(text);
    expect(t.button('Chuyển vào Thùng rác')).toBeUndefined();
    expect(t.settled).toHaveBeenCalledOnce();
    expect(t.trashed).not.toHaveBeenCalled();
    expect(t.dialog.close).not.toHaveBeenCalled();
  });
  it('does not claim an outcome when the response is lost', () => {
    const t = setup();
    t.open();
    t.button('Chuyển vào Thùng rác')!.click();
    t.response.error(new HttpErrorResponse({ status: 0 }));
    t.f.detectChanges();
    expect(t.dialog.querySelector('[role="alert"]')?.textContent).toContain('Chưa xác nhận được');
    expect(t.settled).toHaveBeenCalledOnce();
  });
});
