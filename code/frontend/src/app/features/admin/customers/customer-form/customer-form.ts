import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, catchError, distinctUntilChanged, map, of, switchMap, timer } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { CustomerApi } from '../customer-api';
import {
  CustomerDetail,
  CustomerWrite,
  DuplicateSummary,
  Page,
  emptyCustomer,
} from '../customer-models';
import { normalizeCustomer, normalizePhone, validateCustomer } from '../customer-validation';

@Component({
  selector: 'app-customer-form',
  imports: [ReactiveFormsModule],
  templateUrl: './customer-form.html',
  styleUrl: './customer-form.scss',
})
export class CustomerForm {
  private readonly api = inject(CustomerApi);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  private readonly destroy = inject(DestroyRef);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private opener: HTMLElement | null = null;
  private submission?: Subscription;
  private generation = 0;
  private epoch = this.auth.epoch();
  readonly saved = output<CustomerDetail>();
  readonly cancelled = output<void>();
  readonly visible = signal(false);
  readonly customer = signal<CustomerDetail | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly conflict = signal(false);
  readonly errors = signal<Record<string, string[]>>({});
  readonly duplicates = signal<Page<DuplicateSummary> | null>(null);
  readonly confirmedPhone = signal<string | null>(null);
  readonly owner = computed(() => this.auth.user()?.role === 'OWNER');
  readonly form = inject(FormBuilder).nonNullable.group({
    fullName: '',
    phone: '',
    defaultAddress: '',
    zaloName: '',
    tiktokId: '',
    threadsId: '',
    note: '',
  });
  readonly socialFields = [
    { key: 'zaloName', label: 'Tên Zalo', max: 150 },
    { key: 'tiktokId', label: 'Tên TikTok', max: 100 },
    { key: 'threadsId', label: 'Tên Threads', max: 100 },
  ] as const;
  constructor() {
    effect(() => {
      const epoch = this.auth.epoch(),
        owner = this.owner();
      untracked(() => {
        if (epoch !== this.epoch || !owner) {
          this.epoch = epoch;
          this.reset();
        }
      });
    });
    this.form.controls.phone.valueChanges
      .pipe(
        map((v) => normalizePhone(v)),
        distinctUntilChanged(),
        switchMap((phone) => {
          this.confirmedPhone.set(null);
          this.duplicates.set(null);
          if (
            !this.visible() ||
            !phone ||
            !/^0[35789][0-9]{8}$/.test(phone) ||
            phone === this.customer()?.phone
          )
            return of(null);
          return timer(300).pipe(
            switchMap(() => this.api.duplicates(phone, this.customer()?.id)),
            catchError(() => of(null)),
          );
        }),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((page) => {
        if (this.visible()) this.duplicates.set(page);
      });
  }
  open(customer: CustomerDetail | null = null) {
    if (!this.owner()) return;
    this.reset();
    this.opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.customer.set(customer);
    this.fill(customer);
    this.visible.set(true);
    const el = this.dialog()?.nativeElement;
    if (el && !el.open) {
      if (typeof el.showModal === 'function') el.showModal();
      else el.setAttribute('open', '');
    }
  }
  private fill(customer: CustomerDetail | null) {
    const values = emptyCustomer();
    for (const key of Object.keys(values) as (keyof CustomerWrite)[])
      values[key] = customer?.[key] || '';
    this.form.reset(values as Record<keyof CustomerWrite, string>, { emitEvent: false });
  }
  private reset() {
    this.generation++;
    this.submission?.unsubscribe();
    this.busy.set(false);
    this.visible.set(false);
    this.customer.set(null);
    this.form.reset();
    this.error.set('');
    this.errors.set({});
    this.conflict.set(false);
    this.duplicates.set(null);
    this.confirmedPhone.set(null);
    const el = this.dialog()?.nativeElement;
    if (el?.open) {
      if (typeof el.close === 'function') el.close();
      else el.removeAttribute('open');
    }
  }
  canLeave(): boolean {
    return (
      !this.visible() ||
      (!this.busy() &&
        (!this.form.dirty ||
          window.confirm('Bạn có thay đổi chưa được lưu. Bạn có chắc muốn thoát?')))
    );
  }
  requestClose(): boolean {
    if (!this.canLeave()) return false;
    this.reset();
    this.opener?.focus();
    this.cancelled.emit();
    return true;
  }
  onCancel(event: Event) {
    event.preventDefault();
    this.requestClose();
  }
  onBackdrop(event: MouseEvent) {
    if (event.target === this.dialog()?.nativeElement) this.requestClose();
  }
  openDuplicate(event: Event, id: string) {
    event.preventDefault();
    event.stopPropagation();
    if (!this.requestClose()) return;
    void this.router.navigate(['/admin/customers', id]);
  }
  @HostListener('window:beforeunload', ['$event']) beforeUnload(event: BeforeUnloadEvent) {
    if (this.visible() && (this.form.dirty || this.busy())) event.preventDefault();
  }
  save() {
    if (!this.owner() || !this.visible() || this.busy()) return;
    const body = normalizeCustomer(this.form.getRawValue()),
      errors = validateCustomer(body);
    this.errors.set(errors);
    this.error.set('');
    if (Object.keys(errors).length) return;
    const confirmed = !!body.phone && body.phone === this.confirmedPhone();
    if (this.duplicates()?.totalElements && !confirmed) {
      this.error.set('Số điện thoại đã tồn tại. Xem hồ sơ hoặc xác nhận vẫn lưu.');
      return;
    }
    const request = {
      ...body,
      ...(confirmed ? { confirmDuplicatePhone: true, confirmedPhone: body.phone! } : {}),
    };
    const customer = this.customer(),
      epoch = this.auth.epoch(),
      generation = this.generation;
    this.busy.set(true);
    this.submission = (
      customer ? this.api.update(customer.id, customer.version, request) : this.api.create(request)
    )
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (result) => {
          if (epoch !== this.auth.epoch() || generation !== this.generation || !this.owner())
            return;
          this.reset();
          this.opener?.focus();
          this.saved.emit(result);
        },
        error: (e) => {
          if (epoch !== this.auth.epoch() || generation !== this.generation) return;
          this.busy.set(false);
          this.errors.set(e.error?.fieldErrors || {});
          if (e.error?.error === 'CUSTOMER_PHONE_DUPLICATE') {
            this.duplicates.set(e.error.duplicates);
            this.confirmedPhone.set(null);
            this.error.set('Số điện thoại đã tồn tại. Vui lòng kiểm tra hồ sơ trùng.');
          } else if (e.error?.error === 'version_conflict') {
            this.conflict.set(true);
            this.error.set('Dữ liệu đã thay đổi. Tải lại hồ sơ trước khi lưu.');
          } else if (e.status === 0 || e.status >= 500)
            this.error.set(
              'Chưa xác định được kết quả lưu. Vui lòng kiểm tra danh sách trước khi thử lại.',
            );
          else
            this.error.set(
              e.status === 403
                ? 'Bạn không có quyền lưu khách hàng.'
                : 'Không thể lưu. Kiểm tra dữ liệu và thử lại.',
            );
        },
      });
  }
  confirmDuplicates() {
    this.confirmedPhone.set(normalizePhone(this.form.controls.phone.value));
    this.save();
  }
  moreDuplicates() {
    const p = this.duplicates(),
      phone = normalizePhone(this.form.controls.phone.value);
    if (!p || !phone || p.page + 1 >= p.totalPages) return;
    const generation = this.generation;
    this.api
      .duplicates(phone, this.customer()?.id, p.page + 1, p.size)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (next) => {
          if (
            generation === this.generation &&
            phone === normalizePhone(this.form.controls.phone.value)
          )
            this.duplicates.set({ ...next, items: [...p.items, ...next.items] });
        },
        error: () => this.error.set('Chưa tải được các hồ sơ trùng. Vui lòng thử lại.'),
      });
  }
  reload() {
    const customer = this.customer();
    if (
      !customer ||
      this.busy() ||
      !window.confirm('Tải lại sẽ bỏ thay đổi chưa lưu. Bạn có muốn tiếp tục?')
    )
      return;
    const generation = this.generation;
    this.busy.set(true);
    this.api
      .detail(customer.id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (c) => {
          if (generation !== this.generation) return;
          this.busy.set(false);
          this.open(c);
        },
        error: () => {
          if (generation === this.generation) {
            this.busy.set(false);
            this.error.set('Chưa tải lại được hồ sơ. Dữ liệu đang nhập được giữ lại.');
          }
        },
      });
  }
}
