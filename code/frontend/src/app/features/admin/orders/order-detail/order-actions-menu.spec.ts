import { TestBed } from '@angular/core/testing';
import { OrderActionsMenu } from './order-actions-menu';
import { HeaderAction } from './order-detail-view';

describe('OrderActionsMenu', () => {
  function setup(actions: HeaderAction[] = ['edit', 'reopen', 'cancel']) {
    const f = TestBed.createComponent(OrderActionsMenu);
    f.componentRef.setInput('orderCode', 'DH-000009');
    f.componentRef.setInput('actions', actions);
    const chosen: HeaderAction[] = [];
    f.componentInstance.select.subscribe((a) => chosen.push(a));
    f.detectChanges();
    document.body.appendChild(f.nativeElement);
    const el = f.nativeElement as HTMLElement;
    const toggle = () => el.querySelector<HTMLButtonElement>('.actions-menu-toggle');
    const items = () => Array.from(el.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
    const key = (k: string) => {
      document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
      f.detectChanges();
    };
    return { f, el, toggle, items, chosen, key };
  }
  afterEach(() => document.body.replaceChildren());

  it('names the order, lists the actions with cancel in red and hands the choice back', () => {
    const t = setup();
    expect(t.toggle()!.getAttribute('aria-label')).toBe('Thao tác DH-000009');
    t.toggle()!.click();
    t.f.detectChanges();
    expect(t.items().map((b) => b.textContent!.trim())).toEqual(['Sửa thông tin', 'Mở lại đơn đã chốt', 'Hủy đơn']);
    expect(t.items()[2].classList).toContain('danger-item');
    expect(document.activeElement).toBe(t.items()[0]);
    t.items()[1].click();
    t.f.detectChanges();
    expect(t.chosen).toEqual(['reopen']);
    expect(t.items()).toEqual([]);
  });

  it('moves with the arrow keys and closes on Escape back to the toggle', () => {
    const t = setup();
    t.toggle()!.click();
    t.f.detectChanges();
    t.key('ArrowDown');
    expect(document.activeElement).toBe(t.items()[1]);
    t.key('End');
    expect(document.activeElement).toBe(t.items()[2]);
    t.key('ArrowDown');
    expect(document.activeElement).toBe(t.items()[0]);
    t.key('ArrowUp');
    expect(document.activeElement).toBe(t.items()[2]);
    t.key('Escape');
    expect(t.items()).toEqual([]);
    expect(document.activeElement).toBe(t.toggle());
  });

  it('closes on an outside click', () => {
    const t = setup();
    t.toggle()!.click();
    t.f.detectChanges();
    document.body.click();
    t.f.detectChanges();
    expect(t.items()).toEqual([]);
  });

  it('renders nothing without actions', () => {
    const t = setup([]);
    expect(t.toggle()).toBeNull();
  });
  it('points the toggle at its menu, closes on Escape from the toggle and when focus leaves', () => {
    const t = setup();
    t.toggle()!.click();
    t.f.detectChanges();
    const menu = t.el.querySelector('[role="menu"]')!;
    expect(t.toggle()!.getAttribute('aria-controls')).toBe(menu.id);
    expect(menu.id).toBeTruthy();
    t.toggle()!.focus();
    t.key('Escape');
    expect(t.items()).toEqual([]);
    t.toggle()!.click();
    t.f.detectChanges();
    const outside = document.createElement('button');
    document.body.append(outside);
    t.items()[0].dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));
    t.f.detectChanges();
    expect(t.items()).toEqual([]);
  });
});
