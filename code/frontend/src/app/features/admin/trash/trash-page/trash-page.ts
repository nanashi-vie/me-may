import { afterNextRender, Component, DestroyRef, inject, Injector, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Pagination } from '../../../../shared/pagination/pagination';
import { TrashApi, TrashItem, TrashKind, TrashPageResult, TrashSelection } from '../trash-api';

interface TrashTab {
  kind: TrashKind;
  param: string;
  label: string;
  unit: string;
  note: string;
}
const TABS: readonly TrashTab[] = [
  { kind: 'books', param: 'sach', label: 'Sách', unit: 'cuốn sách', note: 'Khôi phục đưa sách về trạng thái Ẩn.' },
  { kind: 'customers', param: 'khach-hang', label: 'Khách hàng', unit: 'khách hàng', note: 'Khôi phục đưa khách về Đã lưu trữ.' },
  { kind: 'orders', param: 'don-hang', label: 'Đơn hàng', unit: 'đơn hàng', note: 'Khôi phục đưa đơn về trạng thái trước khi xóa.' },
];
const REFUSALS: Record<string, string> = {
  book_order_reference: 'Có sách còn trong đơn hàng nên chưa dọn được. Chưa mục nào bị xóa.',
  customer_has_orders: 'Có khách đã có đơn hàng nên chưa dọn được. Chưa mục nào bị xóa.',
  order_has_payments: 'Có đơn đã có giao dịch tiền nên chưa dọn được. Chưa mục nào bị xóa.',
  order_holds_money: 'Có đơn còn giữ tiền của khách nên chưa dọn được. Chưa mục nào bị xóa.',
  trash_expired: 'Mục này đã hết hạn khôi phục.',
};

@Component({
  selector: 'app-trash-page',
  imports: [Pagination, RouterLink, DatePipe],
  templateUrl: './trash-page.html',
  styleUrl: './trash-page.scss',
})
export class TrashPage {
  private readonly api = inject(TrashApi);
  private readonly destroy = inject(DestroyRef);
  private readonly injector = inject(Injector);
  readonly tabs = TABS;
  readonly tab = signal(TABS[0]);
  readonly result = signal<TrashPageResult | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly loadError = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly selected = signal<ReadonlySet<string>>(new Set());
  readonly purgeTarget = signal<{ items: readonly TrashSelection[]; all: boolean } | null>(null);
  private sequence = 0;
  /** Changes with the tab, so late answers for another kind are dropped. */
  private visit = 0;

  constructor() {
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        this.visit++;
        this.tab.set(TABS.find((tab) => tab.param === params.get('loai')) ?? TABS[0]);
        this.result.set(null);
        this.busy.set(false);
        this.error.set('');
        this.notice.set('');
        this.load();
      });
  }
  load(page = 0) {
    const sequence = ++this.sequence;
    this.selected.set(new Set());
    this.loading.set(true);
    this.loadError.set(false);
    this.api
      .list(this.tab().kind, page)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (result) => {
          if (sequence !== this.sequence) return;
          this.loading.set(false);
          if (page && !result.items.length) this.load(page - 1);
          else this.result.set(result);
        },
        error: () => {
          if (sequence !== this.sequence) return;
          this.loading.set(false);
          this.loadError.set(true);
        },
      });
  }
  reload() {
    this.load(this.result()?.page ?? 0);
  }
  expired(item: TrashItem) {
    return Date.parse(item.expiresAt) <= Date.now();
  }
  toggle(id: string, checked: boolean) {
    const selected = new Set(this.selected());
    if (checked) selected.add(id);
    else selected.delete(id);
    this.selected.set(selected);
  }
  selectPage(items: readonly TrashItem[], checked: boolean) {
    this.selected.set(new Set(checked ? items.map((item) => item.id) : []));
  }
  restore(item: TrashItem) {
    if (this.busy()) return;
    this.start();
    const visit = this.visit;
    this.api
      .change(this.tab().kind, item.id, item.version, false)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => this.finish(visit, 'Đã khôi phục ' + item.code + '.'),
        error: (error: HttpErrorResponse) => this.fail(visit, error),
      });
  }
  askSelected(dialog: HTMLDialogElement) {
    if (this.busy()) return;
    const items = (this.result()?.items ?? [])
      .filter((item) => this.selected().has(item.id))
      .map(({ id, version }) => ({ id, version }));
    this.ask(dialog, items, false);
  }
  askAll(dialog: HTMLDialogElement) {
    if (this.busy()) return;
    this.start();
    const visit = this.visit;
    this.api
      .selection(this.tab().kind)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (items) => {
          if (visit !== this.visit) return;
          this.busy.set(false);
          if (items.length) this.ask(dialog, items, true);
          else this.reload();
        },
        error: () => {
          if (visit !== this.visit) return;
          this.busy.set(false);
          this.error.set('Chưa tải được danh sách cần dọn.');
        },
      });
  }
  confirmPurge(dialog: HTMLDialogElement) {
    const target = this.purgeTarget();
    if (!target || this.busy()) return;
    this.start();
    const visit = this.visit;
    const done = () => {
      dialog.close();
      this.purgeTarget.set(null);
    };
    this.api
      .purge(this.tab().kind, target.items)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          done();
          this.finish(visit, 'Đã dọn vĩnh viễn ' + target.items.length + ' ' + this.tab().unit + '.');
        },
        error: (error: HttpErrorResponse) => {
          done();
          this.fail(visit, error);
        },
      });
  }
  private ask(dialog: HTMLDialogElement, items: readonly TrashSelection[], all: boolean) {
    if (!items.length) return;
    this.purgeTarget.set({ items, all });
    // autofocus only applies to content present when the dialog opens
    afterNextRender(() => dialog.showModal(), { injector: this.injector });
  }
  private start() {
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
  }
  private finish(visit: number, notice: string) {
    if (visit !== this.visit) return;
    this.busy.set(false);
    this.notice.set(notice);
    this.reload();
  }
  private fail(visit: number, { status, error }: HttpErrorResponse) {
    if (visit !== this.visit) return;
    this.busy.set(false);
    this.error.set(
      status === 409 || status === 404
        ? (REFUSALS[error?.error] ?? 'Thùng rác đã thay đổi. Hãy kiểm tra danh sách mới rồi thử lại.')
        : 'Chưa xác nhận được thao tác. Kiểm tra danh sách trước khi thử lại.',
    );
    this.reload();
  }
}
