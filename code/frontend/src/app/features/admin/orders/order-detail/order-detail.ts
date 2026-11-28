import { Pagination } from '../../../../shared/pagination/pagination';
import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  Injector,
  computed,
  effect,
  inject,
  signal,
  untracked,
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
  PaymentType,
  Page,
  statusLabel,
  statusTone,
  CHANNEL_LABELS,
  CARRIER_LABELS,
  Carrier,
  carrierOf,
} from '../order-models';
import { OrderItemForm } from '../order-item-form/order-item-form';
import { OrderShippingForm, ShippingDraft } from '../order-shipping-form/order-shipping-form';
import { integer, keepEnd, orderError, vnd } from '../order-values';
import {
  ACTION_LABELS,
  HeaderAction,
  billTab,
  currentShipment,
  dueAmount,
  menuActions,
  paymentBadge,
  primaryAction,
} from './order-detail-view';
import { OrderTimeline } from './order-timeline';
import { OrderActionsMenu } from './order-actions-menu';
type Tab = 'detail' | 'bill';
/** `total` is the old name of the bill tab, kept so saved links still open it. */
const tabOf = (q: string | null | undefined): Tab => (q === 'bill' || q === 'total' ? 'bill' : 'detail');
type Pending = {
  kind: 'command' | 'create' | 'update' | 'itemAdd' | 'itemUpdate' | 'remove' | 'void' | 'payment';
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
    OrderTimeline,
    OrderActionsMenu,
  ],
  templateUrl: './order-detail.html',
  styleUrls: ['../orders.scss', '../order-picker.scss', './order-detail.scss'],
})
export class OrderDetailPage {
  private readonly api = inject(OrderApi);
  private readonly customers = inject(CustomerApi);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly itemForm = viewChild(OrderItemForm);
  readonly itemScroll = viewChild<ElementRef<HTMLElement>>('itemScroll');
  /** Line just added or edited: scrolled into view and lit for a moment. */
  readonly flashed = signal<string | null>(null);
  /** Set when an item is saved: the edited line, or the lines that existed before an add. */
  private flashFor: { id: string } | { before: Set<string> } | null = null;
  private flashTimer?: ReturnType<typeof setTimeout>;
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
  /** The receipt stays outside `pending` (which is JSON-cloned) so a retry resends the same file. */
  readonly paymentProof = signal<File | null>(null);
  readonly proofPreview = signal('');
  readonly proofError = signal('');
  readonly viewing = signal<OrderPayment | null>(null);
  readonly panel = signal<Panel>('');
  readonly money = vnd;
  readonly statusLabel = statusLabel;
  readonly keepEnd = keepEnd;
  readonly backQuery = { ...this.route.snapshot.queryParams };
  readonly tab = signal<Tab>(tabOf(this.backQuery['tab']));
  selectTab(tab: Tab) {
    this.tab.set(tab);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'bill' ? 'bill' : null },
      queryParamsHandling: 'merge',
    });
  }
  tabKey(event: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const bill = event.key === 'End' || (event.key !== 'Home' && this.tab() === 'detail');
    this.selectTab(bill ? 'bill' : 'detail');
    document.getElementById(bill ? 'order-bill-tab' : 'order-detail-tab')?.focus();
  }
  readonly statusTone = statusTone;
  readonly channelLabels = CHANNEL_LABELS;
  readonly carrierLabels = CARRIER_LABELS;
  readonly carriers = Object.entries(CARRIER_LABELS) as [Carrier, string][];
  readonly carrierOf = carrierOf;
  /** Carrier chosen in the handover form; J&T and Shopee Express swap there, pickup only on the bill. */
  shipCarrier: Carrier = 'JNT';
  /** The header button names what actually happens to the parcel. */
  actionLabel(a: keyof typeof ACTION_LABELS, d: { shippingProvider?: string | null }) {
    return a === 'ship' && carrierOf(d.shippingProvider) === 'PICKUP' ? 'Khách đã lấy hàng' : this.actionLabels[a];
  }
  readonly actionLabels = ACTION_LABELS;
  readonly shipment = computed(() => {
    const d = this.order();
    return d ? currentShipment(d) : null;
  });
  readonly billed = computed(() => !!this.shipment());
  /** A saved bill was dropped by reopening; the order needs a new one. */
  readonly needsNewBill = computed(() => {
    const d = this.order();
    return !!d && d.status !== 'CANCELLED' && !this.shipment() && d.shipments.some((s) => s.state === 'ABORTED');
  });
  readonly due = computed(() => {
    const d = this.order();
    return d ? dueAmount(d) : 0;
  });
  readonly paymentBadge = computed(() => {
    const d = this.order();
    return d ? paymentBadge(d) : null;
  });
  readonly primary = computed(() => {
    const d = this.order();
    return d ? primaryAction(d) : null;
  });
  /** Extending is offered only while a later end date is still possible. */
  readonly menu = computed(() => {
    const d = this.order();
    if (!d) return [];
    return menuActions(d).filter((a) => a !== 'extend-keep' || this.minKeepDate() <= this.maxKeepDate());
  });
  readonly billState = computed(() => {
    const d = this.order();
    return d ? billTab(d) : 'empty';
  });
  readonly allNotes = signal(false);
  /** Newest first; five unless the owner asks for all. */
  readonly shownNotes = computed(() => {
    const notes = [...(this.order()?.notes ?? [])].reverse();
    return this.allNotes() ? notes : notes.slice(0, 5);
  });
  /** What the bill form holds now, for the bill beside it. */
  /** Set after a saved command: the next order replaces whatever the bill form holds. */
  private reloadBill = true;
  /** Header actions reload the bill form afterwards, so unsaved bill edits are confirmed first. */
  runHeaderAction(action: HeaderAction) {
    if (
      this.shippingForm()?.dirty() &&
      !window.confirm('Bill có thay đổi chưa lưu. Bỏ các thay đổi này và tiếp tục?')
    ) {
      this.selectTab('bill');
      return;
    }
    this.openPanel(action);
  }
  /** First handover ends the keep; later resends do not change it. */
  readonly keepHandedOver = computed(() => {
    const d = this.order();
    if (!d?.keepStartedAt || !d.keepUntil || d.status !== 'COMPLETED') return null;
    return d.shipments.find((s) => s.handedOverAt)?.handedOverAt ?? null;
  });
  readonly keepError = signal('');
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
    transactionType: 'DEPOSIT' as PaymentType,
    amount: null as number | null,
    note: '',
    /** A transfer confirmed without its receipt image; the note must say why. */
    noProof: false,
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
      .subscribe((q) => this.tab.set(tabOf(q.get('tab'))));
    // Each new order reaches the bill form: saved values when nothing is typed or after a
    // save, otherwise a rebase that keeps the typing and asks to recheck COD and weight.
    effect(() => {
      const d = this.order(),
        form = this.shippingForm();
      if (!d || !form) return;
      untracked(() => {
        if (this.reloadBill || !form.dirty()) form.load(d);
        else form.rebase(d);
        this.reloadBill = false;
      });
    });
    effect(() => {
      const d = this.order();
      if (!d || !this.flashFor) return;
      const target = this.flashFor;
      const id =
        'id' in target ? target.id : d.items.find((i) => !target.before.has(i.id))?.id;
      if (!id || !d.items.some((i) => i.id === id)) return;
      this.flashFor = null;
      untracked(() => this.flash(id));
    });
    this.destroy.onDestroy(() => clearTimeout(this.flashTimer));
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
                    if (epoch === this.auth.epoch()) this.customerSaved(c, false);
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
    this.allNotes.set(false);
    this.reloadBill = true;
  }
  searchCustomers(page = 0) {
    this.customerPageNumber = page;
    this.customerError.set('');
    this.customerLoading.set(true);
    this.customerQueries.next({ q: this.customerQ.trim(), page });
  }
  customerSaved(c: CustomerSummary, focus = true) {
    if (c.status !== 'ACTIVE') {
      this.customerError.set('Chỉ chọn khách đang hoạt động.');
      return;
    }
    this.selectedCustomer.set(c);
    this.existingKeeps.set(null);
    this.keepError.set('');
    if (this.customerPage()) this.customerError.set('');
    if (focus) this.focusAfterRender('.picked-customer button');
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
            this.keepError.set('Chưa kiểm tra được đơn đang keep của khách.');
        },
      });
  }
  changeCustomer() {
    this.unselectCustomer();
    this.focusAfterRender('.customer-search');
  }
  keepCustomer() {
    this.resetCustomerPicker();
    this.focusAfterRender('.customer-search');
  }
  private resetCustomerPicker() {
    this.unselectCustomer();
    this.customerQ = '';
    this.customerPageNumber = 0;
    this.customerPage.set(null);
    this.customerError.set('');
  }
  private unselectCustomer() {
    this.selectionGeneration++;
    this.selectedCustomer.set(null);
    this.existingKeeps.set(null);
    this.keepError.set('');
  }
  private focusAfterRender(selector: string) {
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus(), {
      injector: this.injector,
    });
  }
  create() {
    const c = this.selectedCustomer();
    if (!c || !this.existingKeeps()) return;
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
            // The saved values never arrived; what is typed from now on must not be replaced.
            this.reloadBill = false;
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
                  : p.kind === 'payment'
                    ? this.api.recordPayment(id, p.body, this.payment.noProof ? null : this.paymentProof())
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
        if (p.kind === 'payment') this.chooseProof(null);
        if (p.kind === 'command' || p.kind === 'update') this.reloadBill = true;
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
        this.paymentConflict.set(p.kind === 'payment' && conflict);
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
    this.flashFor = item ? { id: item.id } : { before: new Set(d.items.map((i) => i.id)) };
    this.sendNew({
      kind: item ? 'itemUpdate' : 'itemAdd',
      orderId: d.id,
      itemId: item?.id,
      body: { ...body, version: d.version, requestId: crypto.randomUUID() },
    });
  }
  private flash(id: string) {
    this.flashed.set(id);
    clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => this.flashed.set(null), 1200);
    // After render: bring the row into the card's own scroll area only.
    setTimeout(() => {
      const box = this.itemScroll()?.nativeElement;
      const row = box?.querySelector<HTMLElement>(`tr[data-item="${id}"]`);
      if (!box || !row) return;
      const head = box.querySelector('thead')?.getBoundingClientRect().height ?? 0;
      const view = box.getBoundingClientRect(),
        r = row.getBoundingClientRect();
      if (r.top < view.top + head || r.bottom > view.bottom)
        box.scrollTop += r.top - view.top - head - (view.height - head - r.height) / 2;
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
    this.shipCarrier = carrierOf(this.order()?.shippingProvider);
    this.paymentConflict.set(false);
    this.resetCustomerPicker();
    this.panel.set(panel);
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
  openPayment(type: PaymentType) {
    if (this.pending() || this.busy()) return;
    this.openPanel('payment');
    this.payment = { transactionType: type, amount: null, note: '', noProof: false };
    this.chooseProof(null);
  }
  chooseProof(file: File | null) {
    if (this.proofPreview()) URL.revokeObjectURL?.(this.proofPreview());
    this.proofPreview.set('');
    this.paymentProof.set(null);
    this.proofError.set('');
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      this.proofError.set('Chỉ nhận ảnh JPG hoặc PNG.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.proofError.set('Ảnh tối đa 10 MB.');
      return;
    }
    this.paymentProof.set(file);
    this.proofPreview.set(URL.createObjectURL?.(file) ?? '');
  }
  proofUrl(p: OrderPayment) {
    return this.api.proofUrl(this.order()!.id, p.id);
  }
  viewProof(p: OrderPayment | null) {
    this.viewing.set(p);
    setTimeout(() => {
      const viewer = document.querySelector<HTMLDialogElement>('#proof-viewer');
      if (p) viewer?.showModal?.();
      else document.querySelector<HTMLElement>('[data-proof="' + this.lastViewed + '"]')?.focus();
    }, 0);
    if (p) this.lastViewed = p.id;
  }
  private lastViewed = '';
  closePanel() {
    if (this.pending() || this.busy()) return;
    if (!window.confirm('Đóng form và bỏ thông tin chưa lưu?')) return;
    this.resetCustomerPicker();
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
      const refund = this.payment.transactionType === 'REFUND';
      if (!integer(this.payment.amount, 1) || (refund && !this.actualConfirmed)) {
        this.error.set('Nhập số tiền nguyên dương và xác nhận hoàn thực tế nếu hoàn tiền.');
        return;
      }
      if (this.payment.noProof) {
        if (!this.payment.note.trim()) {
          this.error.set('Ghi lý do không có ảnh bill.');
          return;
        }
      } else if (!this.paymentProof()) {
        if (!this.proofError()) this.proofError.set('Chọn ảnh bill chuyển khoản.');
        return;
      }
      this.sendNew({
        kind: 'payment',
        orderId: d.id,
        body: {
          transactionType: this.payment.transactionType,
          amount: this.payment.amount,
          note: this.payment.note,
          ...(refund ? { actualConfirmed: true } : {}),
          ...meta,
        },
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
      this.mutate('shipping', {
        trackingCode: this.trackingCode.trim(),
        reason,
        shippingProvider: this.shipCarrier,
      });
      return;
    }
    if (panel === 'ship') {
      if (carrierOf(d.shippingProvider) === 'PICKUP') {
        if (!window.confirm('Xác nhận khách đã nhận hàng tại tiệm? Đơn sẽ hoàn tất.')) return;
        this.mutate('ship', {});
        return;
      }
      if (!this.trackingCode.trim()) {
        this.error.set('Nhập mã vận đơn trước khi bàn giao.');
        return;
      }
      if (!window.confirm('Xác nhận đã bàn giao kiện hàng cho đơn vị vận chuyển? Đơn sẽ hoàn tất.'))
        return;
      this.mutate('ship', { trackingCode: this.trackingCode.trim(), shippingProvider: this.shipCarrier });
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
