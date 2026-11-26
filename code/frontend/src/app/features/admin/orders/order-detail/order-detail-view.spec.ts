import { OrderDetail, Shipment } from '../order-models';
import {
  billTab,
  currentShipment,
  dueAmount,
  menuActions,
  paymentBadge,
  primaryAction,
  timeline,
} from './order-detail-view';

const totals = (goods: number, paid: number, balance: number | null = null) => ({
  subtotal: goods,
  goodsTotal: goods,
  orderTotal: balance === null ? null : balance + paid,
  paidAmount: paid,
  balance,
  totalBookWeightGrams: 100,
  provisional: balance === null,
  paymentStatus: 'PROVISIONAL' as const,
});
const ship = (attemptNo: number, state: Shipment['state'], extra: Partial<Shipment> = {}): Shipment =>
  ({
    id: String(attemptNo),
    attemptNo,
    state,
    shippingSnapshot: {} as Shipment['shippingSnapshot'],
    trackingCode: null,
    handedOverAt: null,
    failedAt: null,
    failureReason: null,
    createdAt: `2026-11-0${attemptNo}T01:00:00Z`,
    ...extra,
  }) as Shipment;
const order = (o: Partial<OrderDetail> = {}): OrderDetail =>
  ({
    id: '1',
    orderCode: 'DH-000001',
    status: 'DRAFT',
    fulfillmentType: 'KEEP',
    createdAt: '2026-10-30T01:00:00Z',
    keepStartedAt: null,
    items: [{ id: '1' }],
    payments: [],
    shipments: [],
    notes: [],
    returns: [],
    totals: totals(200000, 0),
    ...o,
  }) as OrderDetail;
const handed = ship(1, 'HANDED_OVER', { handedOverAt: '2026-11-04T05:00:00Z' });
const cases: Record<string, OrderDetail> = {
  draftKeep: order(),
  draftNow: order({ fulfillmentType: 'IMMEDIATE' }),
  keeping: order({ status: 'KEEPING', keepStartedAt: '2026-11-01T02:00:00Z' }),
  packing: order({ status: 'READY_TO_SHIP', shipments: [ship(1, 'PLANNED')] }),
  completed: order({ status: 'COMPLETED', shipments: [handed] }),
  cancelled: order({ status: 'CANCELLED', cancelledAt: '2026-11-05T01:00:00Z' }),
  returned: order({
    status: 'CANCELLED',
    cancelledAt: '2026-11-06T01:00:00Z',
    shipments: [{ ...handed, state: 'FAILED', failedAt: '2026-11-06T01:00:00Z' }],
    returns: [{ id: '1' } as never],
  }),
};

describe('order detail view', () => {
  it.each([
    ['draftKeep', 'keep', ['edit', 'cancel'], 'edit'],
    ['draftNow', null, ['edit', 'cancel'], 'edit'],
    ['keeping', null, ['edit', 'extend-keep', 'cancel'], 'edit'],
    ['packing', 'ship', ['reopen', 'cancel'], 'edit'],
    ['completed', 'return', ['tracking'], 'readonly'],
    ['cancelled', null, [], 'cancelled'],
    ['returned', null, [], 'readonly'],
  ])('%s: primary %s, menu %j, bill tab %s', (key, primary, menu, tab) => {
    expect(primaryAction(cases[key])).toBe(primary);
    expect(menuActions(cases[key])).toEqual(menu);
    expect(billTab(cases[key])).toBe(tab);
  });

  it('drops reopen and cancel once a parcel was handed over', () => {
    const resent = order({ status: 'READY_TO_SHIP', shipments: [handed, ship(2, 'PLANNED')] });
    expect(menuActions(resent)).toEqual([]);
  });

  it('has no bill for an order without books', () => {
    expect(billTab(order({ items: [] }))).toBe('empty');
  });

  const steps = (d: OrderDetail) => timeline(d).map((s) => [s.key, s.done, s.at, s.danger]);

  it('lays out the whole road for an open keep order', () => {
    expect(steps(cases['draftKeep'])).toEqual([
      ['created', true, '2026-10-30T01:00:00Z', false],
      ['keep', false, null, false],
      ['finalized', false, null, false],
      ['completed', false, null, false],
    ]);
    expect(timeline(cases['draftNow']).map((s) => s.key)).toEqual(['created', 'finalized', 'completed']);
    expect(timeline(cases['keeping'])[1]).toMatchObject({ done: true, at: '2026-11-01T02:00:00Z', label: 'Bắt đầu keep' });
  });

  it('greys finalizing after a reopen and dates it by the newest bill', () => {
    const reopened = order({ status: 'KEEPING', keepStartedAt: '2026-11-01T02:00:00Z', shipments: [ship(1, 'ABORTED')] });
    expect(timeline(reopened)[2]).toMatchObject({ key: 'finalized', done: false, at: null });
    const again = order({ status: 'READY_TO_SHIP', shipments: [ship(1, 'ABORTED'), ship(2, 'PLANNED')] });
    expect(timeline(again)[2]).toMatchObject({ key: 'finalized', done: true, at: '2026-11-02T01:00:00Z', label: 'Chốt đơn' });
  });

  it('marks handover as completion', () => {
    expect(steps(cases['completed']).at(-1)).toEqual(['completed', true, '2026-11-04T05:00:00Z', false]);
    expect(timeline(cases['completed']).at(-1)!.label).toBe('Đã bàn giao · Hoàn tất');
  });

  it('ends a cancelled order at the cancellation and hides steps it never reached', () => {
    expect(steps(cases['cancelled'])).toEqual([
      ['created', true, '2026-10-30T01:00:00Z', false],
      ['cancelled', true, '2026-11-05T01:00:00Z', true],
    ]);
  });

  it('adds the return after the handover', () => {
    expect(steps(cases['returned']).slice(-2)).toEqual([
      ['completed', true, '2026-11-04T05:00:00Z', false],
      ['returned', true, '2026-11-06T01:00:00Z', true],
    ]);
    expect(timeline(cases['returned']).at(-1)!.label).toBe('Đã hoàn đơn');
  });

  it('keeps a reached step done when an older backend sends no time', () => {
    const old = order({ status: 'READY_TO_SHIP', shipments: [{ ...ship(1, 'PLANNED'), createdAt: undefined }] });
    expect(timeline(old)[2]).toMatchObject({ done: true, at: null });
  });

  it('picks the current bill only once the order is finalized', () => {
    expect(currentShipment(order({ status: 'KEEPING', shipments: [ship(1, 'ABORTED')] }))).toBeNull();
    expect(currentShipment(order({ status: 'READY_TO_SHIP', shipments: [ship(1, 'ABORTED'), ship(2, 'PLANNED')] }))!.id).toBe('2');
  });

  it.each([
    ['nothing paid', order(), { label: 'Chưa cọc', tone: 'danger' }],
    ['deposit on goods', order({ totals: totals(200000, 100000) }), { label: 'Đã cọc', tone: 'info' }],
    ['goods paid before the bill', order({ totals: totals(200000, 200000) }), { label: 'Đã thanh toán đủ', tone: 'success' }],
    [
      'bill with shipping still due',
      order({ status: 'READY_TO_SHIP', shipments: [ship(1, 'PLANNED')], totals: totals(200000, 200000, 30000) }),
      { label: 'Đã cọc', tone: 'info' },
    ],
    ['cancelled holding money', order({ status: 'CANCELLED', totals: totals(200000, 120000) }), { label: 'Còn giữ 120.000đ', tone: 'danger' }],
    ['cancelled with nothing held', order({ status: 'CANCELLED' }), null],
  ])('payment badge: %s', (_, d, badge) => {
    expect(paymentBadge(d)).toEqual(badge);
  });

  it('owes the goods less payments before the bill and the balance after', () => {
    expect(dueAmount(order({ totals: totals(200000, 50000) }))).toBe(150000);
    expect(
      dueAmount(order({ status: 'READY_TO_SHIP', shipments: [ship(1, 'PLANNED')], totals: totals(200000, 50000, 180000) })),
    ).toBe(180000);
  });
  it('keeps finalizing on a cancelled order whose bill was aborted by the cancellation', () => {
    const d = order({ status: 'CANCELLED', cancelledAt: '2026-11-05T01:00:00Z', shipments: [ship(2, 'ABORTED')] });
    expect(steps(d)).toEqual([
      ['created', true, '2026-10-30T01:00:00Z', false],
      ['finalized', true, '2026-11-02T01:00:00Z', false],
      ['cancelled', true, '2026-11-05T01:00:00Z', true],
    ]);
  });
});
