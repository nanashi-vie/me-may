import { convertToParamMap } from '@angular/router';
import { OrderStats } from '../order-models';
import { ORDER_TABS, orderQuery, parseOrderQuery, tabOf } from './order-groups';

const parse = (q: Record<string, string>) => parseOrderQuery(convertToParamMap(q));
const stats: OrderStats = {
  draft: 2,
  keeping: 12,
  soon: 3,
  due: 1,
  overdue: 2,
  readyToShip: 5,
  completed: 9,
  cancelled: 4,
  returned: 6,
};

describe('order groups', () => {
  it.each([
    [{}, 'ALL', 'ALL', 'ALL'],
    [{ nhom: 'cho-xu-ly', status: 'READY_TO_SHIP' }, 'ACTION', 'READY_TO_SHIP', 'ALL'],
    [{ nhom: 'dang-keep', keepWarning: 'OVERDUE' }, 'KEEPING', 'ALL', 'OVERDUE'],
    [{ nhom: 'dang-keep', status: 'KEEPING' }, 'KEEPING', 'ALL', 'ALL'],
    [{ nhom: 'huy-hoan', status: 'DRAFT' }, 'CLOSED', 'ALL', 'ALL'],
    [{ nhom: 'hoan-tat', keepWarning: 'DUE' }, 'COMPLETED', 'ALL', 'ALL'],
    [{ nhom: 'la', status: 'DRAFT' }, 'ALL', 'ALL', 'ALL'],
    [{ status: 'KEEPING', customerId: '3' }, 'KEEPING', 'ALL', 'ALL'],
    [{ status: 'COMPLETED' }, 'COMPLETED', 'ALL', 'ALL'],
    [{ status: 'RETURNED' }, 'CLOSED', 'RETURNED', 'ALL'],
    [{ status: 'UNSUCCESSFUL' }, 'ALL', 'ALL', 'ALL'],
    [{ status: 'COMPLETED', keepWarning: 'SOON' }, 'KEEPING', 'ALL', 'SOON'],
    [{ status: 'LA', keepWarning: 'LA' }, 'ALL', 'ALL', 'ALL'],
    [{ status: 'toString' }, 'ALL', 'ALL', 'ALL'],
  ])('reads %j', (q, group, status, keepWarning) => {
    expect(parse(q as unknown as Record<string, string>)).toMatchObject({ group, status, keepWarning });
  });

  it('keeps the paging limits of the old list', () => {
    expect(parse({ page: '-1', size: '0' })).toMatchObject({ page: 0, size: 20 });
    expect(parse({ page: 'x', size: '500' })).toMatchObject({ page: 0, size: 20 });
    expect(parse({ page: '3', size: '50', q: '  Lan   Anh ' })).toMatchObject({ page: 3, size: 50, q: 'Lan Anh' });
  });

  it('writes only what differs from the default list', () => {
    expect(orderQuery(parse({}))).toEqual({});
  });

  it('keeps a search that happens to spell a default value', () => {
    expect(orderQuery(parse({ q: 'ALL' }))).toEqual({ q: 'ALL' });
  });

  it('round-trips every tab and sub filter', () => {
    const rest = { q: 'Lan', createdFrom: '2026-11-01', createdTo: '2026-11-20', customerId: '3', page: 2, size: 50 };
    let checked = 0;
    for (const tab of ORDER_TABS)
      for (const sub of [null, ...tab.subs]) {
        const filter = {
          ...rest,
          group: tab.group,
          status: 'ALL',
          keepWarning: 'ALL',
          ...(sub ? { [sub.key]: sub.value } : {}),
        } as ReturnType<typeof parseOrderQuery>;
        const query = Object.fromEntries(Object.entries(orderQuery(filter)).map(([k, v]) => [k, String(v)]));
        expect(query).not.toHaveProperty('group');
        expect(parse(query), JSON.stringify(query)).toEqual(filter);
        checked++;
      }
    expect(checked).toBe(12);
  });

  it('counts each tab so the four groups add up to all', () => {
    expect(ORDER_TABS.map((t) => [t.label, t.count(stats)])).toEqual([
      ['Tất cả', 38],
      ['Chờ xử lý', 7],
      ['Đang keep', 12],
      ['Hoàn tất', 9],
      ['Hủy/Hoàn', 10],
    ]);
  });

  it('names and counts the sub filters', () => {
    const subs = (group: 'ALL' | 'ACTION' | 'KEEPING' | 'COMPLETED' | 'CLOSED') =>
      tabOf(group).subs.map((s) => [s.label, s.count(stats)]);
    expect(subs('ALL')).toEqual([]);
    expect(subs('ACTION')).toEqual([['Nháp', 2], ['Đang đóng gói', 5]]);
    expect(subs('KEEPING')).toEqual([['Quá hạn', 2], ['Đến hạn hôm nay', 1], ['Sắp hết hạn', 3]]);
    expect(subs('COMPLETED')).toEqual([]);
    expect(subs('CLOSED')).toEqual([['Đã hủy', 4], ['Đã hoàn đơn', 6]]);
    expect(tabOf(undefined).group).toBe('ALL');
  });
});
