import { TestBed } from '@angular/core/testing';
import { OrderTimeline } from './order-timeline';

describe('OrderTimeline', () => {
  function render(order: object) {
    const f = TestBed.createComponent(OrderTimeline);
    f.componentRef.setInput('order', order);
    f.detectChanges();
    return f.nativeElement as HTMLElement;
  }
  const base = {
    status: 'KEEPING',
    fulfillmentType: 'KEEP',
    createdAt: '2026-10-30T01:00:00Z',
    keepStartedAt: '2026-11-01T02:30:00Z',
    shipments: [],
    returns: [],
  };

  it('lists every step and marks the latest reached one as current', () => {
    const el = render(base);
    const items = Array.from(el.querySelectorAll('ol > li'));
    expect(items.map((li) => li.querySelector('strong')!.textContent!.trim())).toEqual([
      'Tạo đơn',
      'Bắt đầu keep',
      'Chốt đơn',
      'Đã bàn giao · Hoàn tất',
    ]);
    expect(items.map((li) => li.getAttribute('aria-current'))).toEqual([null, 'step', null, null]);
    expect(items[1].querySelector('time')!.textContent!.trim()).toBe('01/11/2026 09:30');
    expect(items[2].querySelector('time')).toBeNull();
    expect(items[2].classList).toContain('pending');
  });

  it('paints a cancellation as a danger step', () => {
    const el = render({ ...base, status: 'CANCELLED', cancelledAt: '2026-11-05T01:00:00Z' });
    const last = el.querySelector('ol > li:last-child')!;
    expect(last.classList).toContain('danger');
    expect(last.textContent).toContain('Đã hủy');
  });
});
