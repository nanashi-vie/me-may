import { TestBed } from '@angular/core/testing';
import { OrderRowMenu } from './order-row-menu';

describe('OrderRowMenu', () => {
  function setup(order: object = { orderCode: 'DH-000001', trashable: true, status: 'DRAFT' }) {
    const f = TestBed.createComponent(OrderRowMenu);
    f.componentRef.setInput('order', order);
    const removed: unknown[] = [];
    f.componentInstance.remove.subscribe((o) => removed.push(o));
    f.detectChanges();
    document.body.appendChild(f.nativeElement);
    const el = f.nativeElement as HTMLElement;
    const toggle = () => el.querySelector<HTMLButtonElement>('.row-menu-toggle');
    const item = () => el.querySelector<HTMLButtonElement>('[role="menuitem"]');
    return { f, el, toggle, item, removed };
  }
  afterEach(() => document.body.replaceChildren());

  it('opens one delete item and hands the order back', () => {
    const t = setup();
    expect(t.toggle()!.getAttribute('aria-expanded')).toBe('false');
    expect(t.item()).toBeNull();
    t.toggle()!.click();
    t.f.detectChanges();
    expect(t.toggle()!.getAttribute('aria-expanded')).toBe('true');
    expect(t.el.querySelectorAll('[role="menuitem"]').length).toBe(1);
    expect(document.activeElement).toBe(t.item());
    t.item()!.click();
    t.f.detectChanges();
    expect(t.removed).toHaveLength(1);
    expect(t.item()).toBeNull();
  });

  it('closes on Escape and on an outside click, returning focus to the toggle', () => {
    const t = setup();
    t.toggle()!.click();
    t.f.detectChanges();
    t.item()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    t.f.detectChanges();
    expect(t.item()).toBeNull();
    expect(document.activeElement).toBe(t.toggle());
    t.toggle()!.click();
    t.f.detectChanges();
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    t.f.detectChanges();
    expect(t.item()).toBeNull();
  });

  it('keeps arrow keys on the only item', () => {
    const t = setup();
    t.toggle()!.click();
    t.f.detectChanges();
    t.item()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(t.item());
  });

  it('offers the menu for a cancelled order holding money but not for active ones', () => {
    expect(setup({ orderCode: 'DH-1', trashable: false, status: 'CANCELLED' }).toggle()).not.toBeNull();
    TestBed.resetTestingModule();
    const t = setup({ orderCode: 'DH-2', trashable: false, status: 'KEEPING' });
    expect(t.toggle()).toBeNull();
    expect(t.el.textContent!.trim()).toBe('—');
  });
});
