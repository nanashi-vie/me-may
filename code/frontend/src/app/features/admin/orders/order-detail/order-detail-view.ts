import { OrderDetail, Shipment } from '../order-models';
import { vnd } from '../order-values';

/** Display rules of the order detail page, kept pure so each rule is tested on its own. */

export const isReturned = (d: OrderDetail) => d.status === 'CANCELLED' && d.returns.length > 0;

const everShipped = (d: OrderDetail) => d.shipments.some((s) => s.handedOverAt);
const editable = (d: OrderDetail) => d.status === 'DRAFT' || d.status === 'KEEPING';

/** The bill in force: the newest one not aborted, and only once the order left draft/keep. */
export function currentShipment(d: OrderDetail): Shipment | null {
  if (editable(d)) return null;
  return d.shipments.filter((s) => s.state !== 'ABORTED').at(-1) ?? null;
}

export interface TimelineStep {
  key: 'created' | 'keep' | 'finalized' | 'completed' | 'cancelled' | 'returned';
  label: string;
  at: string | null;
  done: boolean;
  danger: boolean;
}

export function timeline(d: OrderDetail): TimelineStep[] {
  const step = (key: TimelineStep['key'], label: string, done: boolean, at?: string | null, danger = false) => ({
    key,
    label,
    done,
    at: done ? (at ?? null) : null,
    danger,
  });
  // Cancelling aborts the bill, yet the order was finalized: then any bill counts.
  const cancelled = d.status === 'CANCELLED' && !isReturned(d);
  const billed = cancelled ? d.shipments.at(-1) : d.shipments.filter((s) => s.state !== 'ABORTED').at(-1);
  const handed = d.shipments.filter((s) => s.handedOverAt).at(-1);
  const steps: TimelineStep[] = [step('created', 'Tạo đơn', true, d.createdAt)];
  if (d.fulfillmentType === 'KEEP') steps.push(step('keep', 'Bắt đầu keep', !!d.keepStartedAt, d.keepStartedAt));
  steps.push(step('finalized', 'Chốt đơn', !!billed, billed?.createdAt));
  steps.push(step('completed', 'Đã bàn giao · Hoàn tất', !!handed, handed?.handedOverAt));
  if (d.status !== 'CANCELLED') return steps;
  if (isReturned(d)) {
    const failed = d.shipments.filter((s) => s.failedAt).at(-1);
    return [...steps, step('returned', 'Đã hoàn đơn', true, failed?.failedAt ?? d.cancelledAt, true)];
  }
  return [...steps.filter((s) => s.done), step('cancelled', 'Đã hủy', true, d.cancelledAt, true)];
}

/** Still to collect: the balance once billed, otherwise the books less what was paid. */
export function dueAmount(d: OrderDetail): number {
  const t = d.totals;
  const unbilled = t.goodsTotal - t.paidAmount;
  return currentShipment(d) ? (t.balance ?? unbilled) : unbilled;
}

export type PaymentBadge = { label: string; tone: 'danger' | 'info' | 'success' } | null;

export function paymentBadge(d: OrderDetail): PaymentBadge {
  const paid = d.totals.paidAmount;
  if (d.status === 'CANCELLED') return paid > 0 ? { label: `Còn giữ ${vnd(paid)}`, tone: 'danger' } : null;
  if (paid <= 0) return { label: 'Chưa cọc', tone: 'danger' };
  if (dueAmount(d) <= 0) return { label: 'Đã thanh toán đủ', tone: 'success' };
  return { label: 'Đã cọc', tone: 'info' };
}

export type HeaderAction =
  | 'keep'
  | 'extend-keep'
  | 'edit'
  | 'cancel'
  | 'ship'
  | 'reopen'
  | 'tracking'
  | 'return';

export const ACTION_LABELS: Record<HeaderAction, string> = {
  keep: 'Bắt đầu keep & trừ tồn',
  'extend-keep': 'Gia hạn keep',
  edit: 'Sửa thông tin',
  cancel: 'Hủy đơn',
  ship: 'Đã bàn giao vận chuyển',
  reopen: 'Mở lại đơn đã chốt',
  tracking: 'Sửa mã vận đơn',
  return: 'Hoàn đơn',
};

export function primaryAction(d: OrderDetail): HeaderAction | null {
  if (d.status === 'DRAFT' && d.fulfillmentType === 'KEEP') return 'keep';
  if (d.status === 'READY_TO_SHIP') return 'ship';
  if (d.status === 'COMPLETED') return 'return';
  return null;
}

export function menuActions(d: OrderDetail): HeaderAction[] {
  const actions: HeaderAction[] = [];
  const open = !everShipped(d);
  if (editable(d)) actions.push('edit');
  if (d.status === 'KEEPING') actions.push('extend-keep');
  if (d.status === 'READY_TO_SHIP' && open) actions.push('reopen');
  if (d.status === 'COMPLETED') actions.push('tracking');
  if ((editable(d) || d.status === 'READY_TO_SHIP') && open) actions.push('cancel');
  return actions;
}

/** What the bill tab can show for this order. */
export function billTab(d: OrderDetail): 'empty' | 'cancelled' | 'edit' | 'readonly' {
  if (d.status === 'CANCELLED' && !isReturned(d)) return 'cancelled';
  if (!d.items.length) return 'empty';
  if (d.status === 'COMPLETED' || isReturned(d)) return 'readonly';
  return 'edit';
}
