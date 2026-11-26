import { ParamMap, Params } from '@angular/router';
import { OrderFilter, OrderGroup, OrderStats, STATUS_LABELS } from '../order-models';
export interface OrderSub {
  key: 'status' | 'keepWarning';
  value: string;
  label: string;
  count(s: OrderStats): number;
}
export interface OrderTab {
  group: OrderGroup;
  slug: string;
  label: string;
  subs: readonly OrderSub[];
  count(s: OrderStats): number;
}
const status = (value: keyof typeof STATUS_LABELS, count: OrderSub['count']): OrderSub => ({
  key: 'status',
  value,
  label: STATUS_LABELS[value],
  count,
});
const warning = (value: string, label: string, count: OrderSub['count']): OrderSub => ({
  key: 'keepWarning',
  value,
  label,
  count,
});
const closed = (s: OrderStats) => s.cancelled + s.returned;
export const ORDER_TABS: readonly OrderTab[] = [
  {
    group: 'ALL',
    slug: '',
    label: 'Tất cả',
    subs: [],
    count: (s) => s.draft + s.keeping + s.readyToShip + s.completed + closed(s),
  },
  {
    group: 'ACTION',
    slug: 'cho-xu-ly',
    label: 'Chờ xử lý',
    subs: [],
    count: (s) => s.draft,
  },
  {
    group: 'KEEPING',
    slug: 'dang-keep',
    label: 'Đang keep',
    subs: [
      warning('OVERDUE', 'Quá hạn', (s) => s.overdue),
      warning('DUE', 'Đến hạn hôm nay', (s) => s.due),
      warning('SOON', 'Sắp hết hạn', (s) => s.soon),
    ],
    count: (s) => s.keeping,
  },
  {
    group: 'PACKING',
    slug: 'dang-dong-goi',
    label: 'Đang đóng gói',
    subs: [],
    count: (s) => s.readyToShip,
  },
  {
    group: 'COMPLETED',
    slug: 'hoan-tat',
    label: 'Hoàn tất',
    subs: [],
    count: (s) => s.completed,
  },
  {
    group: 'CLOSED',
    slug: 'huy-hoan',
    label: 'Hủy/Hoàn',
    subs: [status('CANCELLED', (s) => s.cancelled), status('RETURNED', (s) => s.returned)],
    count: closed,
  },
];
export function tabOf(group: OrderGroup | undefined): OrderTab {
  return ORDER_TABS.find((t) => t.group === group) ?? ORDER_TABS[0];
}
/** Statuses that are a whole tab, so old `?status=` links open it. */
const LEGACY_STATUS: Record<string, OrderGroup> = {
  DRAFT: 'ACTION',
  KEEPING: 'KEEPING',
  READY_TO_SHIP: 'PACKING',
  COMPLETED: 'COMPLETED',
};
/** Links from before the tabs carry only status or keepWarning; open the tab that holds them. */
function tabFrom(p: ParamMap): OrderTab {
  const slug = p.get('nhom');
  if (slug) return ORDER_TABS.find((t) => t.slug === slug) ?? ORDER_TABS[0];
  const holding = (key: OrderSub['key']) =>
    ORDER_TABS.find((t) => t.subs.some((s) => s.key === key && s.value === p.get(key)));
  const old = p.get('status') ?? '';
  const whole = Object.hasOwn(LEGACY_STATUS, old) ? tabOf(LEGACY_STATUS[old]) : undefined;
  return holding('keepWarning') ?? holding('status') ?? whole ?? ORDER_TABS[0];
}
export function parseOrderQuery(p: ParamMap): OrderFilter {
  const number = (key: string, fallback: number, max: number) => {
    const n = Number(p.get(key) ?? fallback);
    return Number.isSafeInteger(n) && n >= 0 && n <= max ? n : fallback;
  };
  const tab = tabFrom(p);
  const sub = (key: OrderSub['key']) =>
    tab.subs.find((s) => s.key === key && s.value === p.get(key))?.value ?? 'ALL';
  const f: OrderFilter = {
    group: tab.group,
    q: (p.get('q') || '').trim().replace(/\s+/g, ' '),
    status: sub('status') as OrderFilter['status'],
    keepWarning: sub('keepWarning') as OrderFilter['keepWarning'],
    createdFrom: p.get('createdFrom') || '',
    createdTo: p.get('createdTo') || '',
    page: number('page', 0, 2147483647),
    size: number('size', 20, 100) || 20,
  };
  const customerId = p.get('customerId');
  if (customerId) f.customerId = customerId;
  return f;
}
export function orderQuery(f: OrderFilter): Params {
  const { group, page, size, status, keepWarning, ...rest } = f;
  const query: Params = {};
  const slug = tabOf(group).slug;
  if (slug) query['nhom'] = slug;
  if (status !== 'ALL') query['status'] = status;
  if (keepWarning !== 'ALL') query['keepWarning'] = keepWarning;
  for (const [key, value] of Object.entries(rest)) if (value) query[key] = value;
  if (page) query['page'] = page;
  if (size !== 20) query['size'] = size;
  return query;
}
