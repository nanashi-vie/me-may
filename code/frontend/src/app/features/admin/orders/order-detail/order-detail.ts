import { Pagination } from '../../../../shared/pagination/pagination';
import {
  Component,
  DestroyRef,
  HostListener,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe, KeyValuePipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Subject, catchError, combineLatest, of, switchMap, timer } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { CustomerApi } from '../../customers/customer-api';
import { CustomerForm } from '../../customers/customer-form/customer-form';
import { CustomerDetail, CustomerSummary } from '../../customers/customer-models';
import { VndInput } from '../../books/vnd-input';
import { OrderApi } from '../order-api';
import {
  OrderAction,
  OrderDetail,
  OrderItem,
  OrderPayment,
  OrderSummary,
  Page,
  statusLabel,
} from '../order-models';
import { OrderItemForm } from '../order-item-form/order-item-form';
import { OrderShippingForm, ShippingDraft } from '../order-shipping-form/order-shipping-form';
import { integer, keepEnd, orderError, vnd } from '../order-values';
type Pending = {
  kind: 'command' | 'create' | 'update' | 'itemAdd' | 'itemUpdate' | 'remove' | 'void';
  action?: OrderAction;
  itemId?: string;
  orderId?: string;
  body: any;
};
type Panel =
  | ''
  | 'remove'
  | 'keep'
  | 'extend-keep'
  | 'reopen'
  | 'cancel'
  | 'payment'
  | 'void'
  | 'ship'
  | 'fail'
  | 'abort-resend'
  | 'return'
  | 'tracking'
  | 'edit';
@Component({
  selector: 'app-order-detail',
  imports: [
    Pagination,
    NgTemplateOutlet,
    DatePipe,
    KeyValuePipe,
    FormsModule,
    RouterLink,
    VndInput,
    CustomerForm,
    OrderItemForm,
    OrderShippingForm,
  ],
  templateUrl: './order-detail.html',
  styleUrl: '../orders.scss',
})
export class OrderDetailPage {
  private readonly api = inject(OrderApi);
  private readonly customers = inject(CustomerApi);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  readonly itemForm = viewChild(OrderItemForm);
  readonly shippingForm = viewChild(OrderShippingForm);
  readonly customerForm = viewChild(CustomerForm);
  readonly owner = computed(() => this.auth.user()?.role === 'OWNER');
  readonly order = signal<OrderDetail | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly fieldErrors = signal<Record<string, string[]>>({});
  readonly toast = signal('');
  readonly pending = signal<Pending | null>(null);
  readonly paymentConflict = signal(false);
  readonly panel = signal<Panel>('');
  readonly money = vnd;
  readonly statusLabel = statusLabel;
  readonly keepEnd = keepEnd;
  readonly backQuery = { ...this.route.snapshot.queryParams };
  readonly totalTab = signal(this.backQuery['tab'] === 'total');
  selectTab(total: boolean) {
    this.totalTab.set(total);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: total ? 'total' : null },
      queryParamsHandling: 'merge',
    });
  }
  tabKey(event: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const total = event.key === 'End' || (event.key !== 'Home' && !this.totalTab());
    this.selectTab(total);
    document.getElementById(total ? 'order-total-tab' : 'order-detail-tab')?.focus();
  }
  readonly currentBill = computed(() => {
    const d = this.order();
    if (!d || d.status === 'DRAFT' || d.status === 'KEEPING') return null;
    return d.shipments.filter((s) => s.state !== 'ABORTED').at(-1) ?? null;
  });
  readonly selectedCustomer = signal<CustomerSummary | null>(null);
  readonly customerPage = signal<Page<CustomerSummary> | null>(null);
  readonly existingKeeps = signal<Page<OrderSummary> | null>(null);
  readonly customerError = signal('');
  readonly customerLoading = signal(false);
  private readonly customerQueries = new Subject<{ q: string; page: number }>();
  private selectionGeneration = 0;
  private readGeneration = 0;
  private pageGeneration = 0;
  customerQ = '';
  customerPageNumber = 0;
  fulfillmentType: 'KEEP' | 'IMMEDIATE' = 'KEEP';
  newId = true;
  actionReason = '';
  actionTarget: OrderItem | OrderPayment | null = null;
  keepUntilDate = '';
  allowInsufficientDeposit = false;
  trackingCode = '';
  actualConfirmed = false;
  payment = {
    transactionType: 'PAYMENT' as 'PAYMENT' | 'DEPOSIT' | 'REFUND',
    amount: null as number | null,
    paymentMethod: 'BANK_TRANSFER',
    occurredAt: '',
    note: '',
  };
  returns: {
    itemId: string;
    title: string;
    manual: boolean;
    max: number;
    quantityReceived: number;
    quantityRestocked: number;
    reason: string;
  }[] = [];
  edit = {
    requiredDepositVnd: 100000,
    recipientName: '',
    recipientPhone: '',
    shippingAddress: '',
    shippingFee: null as number | null,
  };
  constructor() {
    delete this.backQuery['tab'];
    this.route.queryParamMap
      ?.pipe(takeUntilDestroyed(this.destroy))
      .subscribe((q) => this.totalTab.set(q.get('tab') === 'total'));
    combineLatest([this.route.paramMap, toObservable(this.auth.epoch)])
      .pipe(
        switchMap(([params]) => {
          this.clear();
          const id = params.get('id');
          this.newId = !id;
          if (!this.owner()) return of(null);
          if (!id) {
            this.searchCustomers();
            const customerId = this.backQuery['customerId'];
            if (customerId) {
              const epoch = this.auth.epoch();
              this.customers
                .detail(customerId)
                .pipe(takeUntilDestroyed(this.destroy))
                .subscribe({
                  next: (c) => {
                    if (epoch === this.auth.epoch()) this.customerSaved(c);
                  },
                  error: () => {
                    if (epoch === this.auth.epoch())
                      this.customerError.set(
                        'Chưa tải được khách được chọn. Tìm và chọn lại khách.',
                      );
                  },
                });
            }
            return of(null);
          }
          this.loading.set(true);
          return this.api.detail(id).pipe(
            catchError((e) => {
              this.error.set(
                e.status === 404 ? 'Không tìm thấy đơn hàng.' : 'Chưa tải được chi tiết đơn.',
              );
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((d) => {
        this.order.set(d);
        this.loading.set(false);
      });
    combineLatest([this.customerQueries, toObservable(this.auth.epoch)])
      .pipe(
        switchMap(([f]) =>
          timer(300).pipe(
            switchMap(() =>
              this.owner()
                ? this.customers.list({ q: f.q, status: 'ACTIVE', page: f.page, size: 20 })
                : of(null),
            ),
            catchError(() => {
              this.customerError.set('Chưa tải được khách hàng. Thử lại tìm kiếm.');
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((p) => {
        this.customerPage.set(p);
        this.customerLoading.set(false);
      });
  }
  targetTitle() {
    const t = this.actionTarget;
    return t && 'titleSnapshot' in t ? t.titleSnapshot : '';
  }
  private clear() {
    this.readGeneration++;
    this.pageGeneration++;
    this.lockForms(false);
    this.itemForm()?.refreshing.set(false);
    this.shippingForm()?.refreshing.set(false);
    this.selectionGeneration++;
    this.order.set(null);
    this.pending.set(null);
    this.panel.set('');
    this.selectedCustomer.set(null);
    this.customerPage.set(null);
    this.existingKeeps.set(null);
    this.busy.set(false);
    this.error.set('');
    this.fieldErrors.set({});
    this.toast.set('');
    this.itemForm()?.close();
    this.shippingForm()?.close();
  }
  searchCustomers(page = 0) {
    this.customerPageNumber = page;
    this.customerError.set('');
    this.customerLoading.set(true);
    this.customerQueries.next({ q: this.customerQ.trim(), page });
  }
  customerSaved(c: CustomerSummary) {
    if (c.status !== 'ACTIVE') {
      this.customerError.set('Chỉ chọn khách đang hoạt động.');
      return;
    }
    this.selectedCustomer.set(c);
    this.existingKeeps.set(null);
    this.customerError.set('');
    const generation = ++this.selectionGeneration,
      epoch = this.auth.epoch();
    this.api
      .list({
        q: '',
        status: 'KEEPING',
        keepWarning: 'ALL',
        createdFrom: '',
        createdTo: '',
        page: 0,
        size: 20,
        customerId: c.id,
      })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (p) => {
          if (generation === this.selectionGeneration && epoch === this.auth.epoch())
            this.existingKeeps.set(p);
        },
        error: () => {
          if (generation === this.selectionGeneration && epoch === this.auth.epoch())
            this.customerError.set(
              'Chưa kiểm tra được đơn đang keep của khách. Chọn lại khách để thử lại.',
            );
        },
      });
  }
  create() {
    const c = this.selectedCustomer();
    if (!c || !this.existingKeeps() || this.customerError()) return;
    if (
      this.existingKeeps()!.totalElements > 0 &&
      !window.confirm('Khách đang có đơn keep. Vẫn tạo đơn mới riêng?')
    )
      return;
    this.sendNew({
      kind: 'create',
      body: {
        customerId: c.id,
        fulfillmentType: this.fulfillmentType,
        requestId: crypto.randomUUID(),
      },
    });
  }
  refresh() {
    const d = this.order();
    if (!d || this.busy() || this.pending()) return;
    const epoch = this.auth.epoch(),
      generation = ++this.readGeneration;
    this.loading.set(true);
    this.itemForm()?.refreshing.set(true);
    this.shippingForm()?.refreshing.set(true);
    this.api
      .detail(d.id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (v) => {
          if (
            epoch === this.auth.epoch() &&
            generation === this.readGeneration &&
            this.order()?.id === d.id
          ) {
            if (v.id === d.id && v.version >= this.order()!.version) {
              this.order.set(v);
              this.paymentConflict.set(false);
              if (this.itemForm()?.visible()) this.itemForm()?.rebase(v);
              if (this.shippingForm()?.visible()) this.shippingForm()?.rebase(v);
              this.error.set('');
            }
            this.itemForm()?.refreshing.set(false);
            this.shippingForm()?.refreshing.set(false);
            this.loading.set(false);
          }
        },
        error: () => {
          if (
            epoch === this.auth.epoch() &&
            generation === this.readGeneration &&
            this.order()?.id === d.id
          ) {
            this.itemForm()?.refreshing.set(false);
            this.shippingForm()?.refreshing.set(false);
            this.loading.set(false);
            this.error.set('Chưa tải được bản mới của đơn. Các trường đang nhập được giữ lại.');
          }
        },
      });
  }
  mutate(action: OrderAction, body: object) {
    const d = this.order();
    if (!d) return;
    this.sendNew({
      kind: 'command',
      action,
      orderId: d.id,
      body: { ...body, version: d.version, requestId: crypto.randomUUID() },
    });
  }
  private sendNew(p: Pending) {
    if (!this.owner() || this.busy() || this.pending() || this.loading()) return;
    this.pending.set(JSON.parse(JSON.stringify(p)));
    this.retry();
  }
  retry() {
    const p = this.pending();
    if (!p || this.busy() || !this.owner()) return;
    const epoch = this.auth.epoch(),
      pageGeneration = this.pageGeneration;
    this.busy.set(true);
    this.error.set('');
    this.fieldErrors.set({});
    this.lockForms(true);
    const id = p.orderId ?? '';
    const request =
      p.kind === 'create'
        ? this.api.create(p.body)
        : p.kind === 'update'
          ? this.api.update(id, p.body)
          : p.kind === 'itemAdd'
            ? this.api.addItem(id, p.body)
            : p.kind === 'itemUpdate'
              ? this.api.updateItem(id, p.itemId!, p.body)
              : p.kind === 'remove'
                ? this.api.removeItem(id, p.itemId!, p.body)
                : p.kind === 'void'
                  ? this.api.voidPayment(id, p.itemId!, p.body)
                  : this.api.command(id, p.action!, p.body);
    request.pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (r) => {
        if (epoch !== this.auth.epoch() || pageGeneration !== this.pageGeneration) return;
        this.pending.set(null);
        this.busy.set(false);
        this.lockForms(false);
        this.panel.set('');
        this.selectedCustomer.set(null);
        this.itemForm()?.close();
        if (p.action !== 'payments') this.shippingForm()?.close();
        if (p.action === 'finalize') this.selectTab(true);
        this.toast.set('Đã lưu thao tác.');
        if (p.kind === 'create') {
          this.selectedCustomer.set(null);
          void this.router.navigate(['/admin/orders', r.id]);
          return;
        }
        this.refresh();
      },
      error: (e) => {
        if (epoch !== this.auth.epoch() || pageGeneration !== this.pageGeneration) return;
        this.busy.set(false);
        const unknown = e.status === 0 || e.status >= 500;
        if (!unknown) {
          this.pending.set(null);
          this.lockForms(false);
        }
        this.error.set(orderError(e));
        this.fieldErrors.set(e.error?.fieldErrors ?? {});
        if (e.error?.matches) this.itemForm()?.setMatches(e.error.matches);
        const conflict = e.status === 409 && e.error?.error === 'version_conflict';
        this.paymentConflict.set(p.action === 'payments' && conflict);
        this.itemForm()?.conflict.set(conflict);
        this.shippingForm()?.conflict.set(conflict);
        this.itemForm()?.error.set(orderError(e));
        this.shippingForm()?.error.set(orderError(e));
      },
    });
  }
  private lockForms(value: boolean) {
    this.itemForm()?.locked.set(value);
    this.shippingForm()?.locked.set(value);
  }
  itemSaved(body: Omit<import('../order-models').ItemWrite, 'version' | 'requestId'>) {
    const d = this.order();
    if (!d) return;
    const item = this.itemForm()?.item;
    this.sendNew({
      kind: item ? 'itemUpdate' : 'itemAdd',
      orderId: d.id,
      itemId: item?.id,
      body: { ...body, version: d.version, requestId: crypto.randomUUID() },
    });
  }
  shippingSaved(body: ShippingDraft) {
    this.mutate(this.shippingForm()?.mode ?? 'finalize', body);
  }
  remove(item: OrderItem) {
    this.openPanel('remove');
    this.actionTarget = item;
  }
  voidPayment(payment: OrderPayment) {
    this.openPanel('void');
    this.actionTarget = payment;
  }
  openPanel(panel: Panel) {
    if (this.pending() || this.busy()) return;
    this.actionReason = '';
    this.actionTarget = null;
    this.actualConfirmed = false;
    this.allowInsufficientDeposit = false;
    this.trackingCode = this.order()?.trackingCode ?? '';
    this.paymentConflict.set(false);
    this.panel.set(panel);
    if (panel === 'payment')
      this.payment = {
        transactionType: this.order()?.status === 'CANCELLED' ? 'REFUND' : 'PAYMENT',
        amount: null,
        paymentMethod: 'BANK_TRANSFER',
        occurredAt: '',
        note: '',
      };
    const d = this.order();
    if (d) {
      this.fulfillmentType = d.fulfillmentType;
      this.edit = {
        requiredDepositVnd: d.requiredDepositVnd,
        recipientName: d.recipientName ?? '',
        recipientPhone: d.recipientPhone ?? '',
        shippingAddress: d.shippingAddress ?? '',
        shippingFee: d.shippingFee,
      };
      this.returns = d.items.map((i) => ({
        itemId: i.id,
        title: i.titleSnapshot,
        manual: i.sourceType === 'MANUAL',
        max: i.quantity,
        quantityReceived: 0,
        quantityRestocked: 0,
        reason: '',
      }));
    }
    setTimeout(() => {
      if (this.panel() === 'payment')
        document.querySelector<HTMLDialogElement>('#payment-dialog')?.showModal?.();
      document
        .querySelector<HTMLElement>(
          '.inline-form input, .inline-form textarea, .inline-form select',
        )
        ?.focus();
    }, 0);
  }
  closePanel() {
    if (this.pending() || this.busy()) return;
    if (!window.confirm('Đóng form và bỏ thông tin chưa lưu?')) return;
    this.panel.set('');
  }
  submitAction() {
    const d = this.order(),
      panel = this.panel();
    if (!d || !panel || this.pending() || this.busy()) return;
    this.error.set('');
    const reason = this.actionReason.trim();
    const needsReason =
      [
        'extend-keep',
        'reopen',
        'cancel',
        'void',
        'fail',
        'abort-resend',
        'return',
        'tracking',
      ].includes(panel) ||
      (panel === 'remove' && d.status === 'KEEPING') ||
      (panel === 'keep' && this.allowInsufficientDeposit);
    if (needsReason && !reason) {
      this.error.set('Vui lòng nhập lý do.');
      return;
    }
    if (reason.length > 1000) {
      this.error.set('Lý do tối đa 1.000 ký tự.');
      return;
    }
    const meta = { version: d.version, requestId: crypto.randomUUID() };
    if (panel === 'remove' || panel === 'void') {
      if (!this.actionTarget) return;
      this.sendNew({
        kind: panel === 'remove' ? 'remove' : 'void',
        itemId: this.actionTarget.id,
        orderId: d.id,
        body: { ...meta, reason: reason || null },
      });
      return;
    }
    if (panel === 'payment') {
      if (
        !integer(this.payment.amount, 1) ||
        (this.payment.transactionType === 'REFUND' && !this.actualConfirmed)
      ) {
        this.error.set('Nhập số tiền nguyên dương và xác nhận hoàn thực tế nếu hoàn tiền.');
        return;
      }
      const when = this.payment.occurredAt ? new Date(this.payment.occurredAt) : null;
      if (when && !Number.isFinite(when.getTime())) {
        this.error.set('Thời gian không hợp lệ.');
        return;
      }
      this.mutate('payments', {
        ...this.payment,
        occurredAt: when?.toISOString() ?? null,
        actualConfirmed: this.actualConfirmed,
      });
      return;
    }
    if (panel === 'edit') {
      if (
        this.selectedCustomer() &&
        this.selectedCustomer()!.id !== d.customerId &&
        !window.confirm('Đổi khách của đơn nháp sang khách đã chọn?')
      )
        return;
      this.sendNew({
        kind: 'update',
        orderId: d.id,
        body: {
          ...meta,
          customerId: this.selectedCustomer()?.id ?? d.customerId,
          fulfillmentType: this.fulfillmentType,
          recipientName: this.edit.recipientName,
          recipientPhone: this.edit.recipientPhone,
          shippingAddress: this.edit.shippingAddress,
          shippingFee: this.edit.shippingFee,
          parcelWeightGrams: d.parcelWeightGrams,
          parcelWeightOverridden: d.parcelWeightOverridden,
        },
      });
      return;
    }
    if (panel === 'tracking') {
      if (!this.trackingCode.trim()) {
        this.error.set('Nhập mã vận đơn.');
        return;
      }
      this.mutate('shipping', { trackingCode: this.trackingCode.trim(), reason });
      return;
    }
    if (panel === 'ship') {
      if (!this.trackingCode.trim()) {
        this.error.set('Nhập mã vận đơn trước khi bàn giao.');
        return;
      }
      if (!window.confirm('Xác nhận đã bàn giao kiện hàng cho đơn vị vận chuyển? Đơn sẽ hoàn tất.'))
        return;
      this.mutate('ship', { trackingCode: this.trackingCode.trim() });
      return;
    }
    if (panel === 'return') {
      if (
        !this.actualConfirmed ||
        !this.returns.every(
          (i) =>
            integer(i.quantityReceived, 0, i.max) &&
            integer(i.quantityRestocked, 0, i.quantityReceived) &&
            (!i.manual || i.quantityRestocked === 0),
        )
      ) {
        this.error.set('Kiểm tra số lượng nhận/thực nhập và xác nhận hàng thực tế.');
        return;
      }
      if (
        !window.confirm(
          'Đóng đơn và nhập lại đúng lượng sách đã xác nhận? Hoàn tiền được ghi riêng sau khi đã thực hiện.',
        )
      )
        return;
      this.mutate('return', {
        reason,
        actualConfirmed: true,
        items: this.returns.map(({ itemId, quantityReceived, quantityRestocked, reason }) => ({
          itemId,
          quantityReceived,
          quantityRestocked,
          reason: reason || null,
        })),
      });
      return;
    }
    if (panel === 'keep') {
      this.mutate('keep', {
        allowInsufficientDeposit: this.allowInsufficientDeposit,
        reason: reason || null,
      });
      return;
    }
    if (panel === 'extend-keep') {
      if (!this.keepUntilDate) {
        this.error.set('Chọn ngày keep đến.');
        return;
      }
      this.mutate('extend-keep', { reason, keepUntilDate: this.keepUntilDate });
      return;
    }
    this.mutate(panel as OrderAction, { reason });
  }
  readonly editable = computed(() => ['DRAFT', 'KEEPING'].includes(this.order()?.status ?? ''));
  readonly everShipped = computed(() => !!this.order()?.shipments.some((s) => s.handedOverAt));
  readonly deposit = computed(
    () =>
      this.order()
        ?.payments.filter((p) => p.transactionType === 'DEPOSIT' && !p.voidedAt)
        .reduce((n, p) => n + p.amount, 0) ?? 0,
  );
  keepProgress() {
    const d = this.order();
    if (!d?.keepStartedAt || !d.keepUntil) return 0;
    const from = Date.parse(d.keepStartedAt),
      until = Date.parse(d.keepUntil),
      now = Date.parse(d.serverNow);
    return Math.max(0, Math.min(100, (100 * (now - from)) / (until - from)));
  }
  keepText() {
    const d = this.order();
    if (!d?.keepUntil) return '';
    const now = Date.parse(d.serverNow),
      until = Date.parse(d.keepUntil);
    const day = (n: number) => Date.parse(new Date(n + 7 * 3600000).toISOString().slice(0, 10));
    if (now >= until)
      return 'Quá hạn ' + Math.max(1, (day(now) - day(until)) / 86400000 + 1) + ' ngày';
    const days = (day(until - 1) - day(now)) / 86400000;
    return days === 0 ? 'Đến hạn hôm nay' : 'Còn ' + days + ' ngày';
  }
  maxKeepDate() {
    const started = this.order()?.keepStartedAt;
    if (!started) return '';
    const day = new Date(Date.parse(started) + 7 * 3600000).toISOString().slice(0, 10);
    return new Date(Date.parse(day) + 30 * 86400000).toISOString().slice(0, 10);
  }
  minKeepDate() {
    const end = keepEnd(this.order()?.keepUntil ?? null);
    if (!end) return '';
    return new Date(Date.parse(end) + 7 * 3600000 + 86400000).toISOString().slice(0, 10);
  }
  dirty() {
    return (
      !!this.panel() ||
      !!this.selectedCustomer() ||
      !!this.itemForm()?.dirty() ||
      !!this.shippingForm()?.dirty()
    );
  }
  canLeave() {
    if (this.customerForm()?.canLeave() === false) return false;
    if (this.busy()) return false;
    if (
      this.pending() &&
      !window.confirm(
        'Kết quả lưu chưa xác định. Rời trang rồi hãy kiểm tra lại đơn trước khi thao tác tiếp. Vẫn rời trang?',
      )
    )
      return false;
    return !this.dirty() || window.confirm('Rời trang và bỏ thông tin chưa lưu?');
  }
  @HostListener('window:beforeunload', ['$event']) beforeUnload(e: BeforeUnloadEvent) {
    if (this.busy() || this.pending() || this.dirty()) e.preventDefault();
  }
}
