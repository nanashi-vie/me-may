import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { TrashApi, TrashKind, TrashSelection } from '../trash-api';

export interface TrashTarget extends TrashSelection {
  code: string;
  name: string;
  /** Why the record cannot be deleted yet; the dialog then only explains. */
  blocked?: string;
}
const REASONS: Record<string, string> = {
  customer_not_archived: 'Khách đang hoạt động. Lưu trữ khách trước khi xóa.',
  customer_has_orders: 'Khách đã có đơn hàng nên phải giữ lại hồ sơ.',
  order_not_trashable: 'Chỉ xóa được đơn Nháp hoặc Đã hủy, Đã hoàn đơn.',
  order_has_payments: 'Đơn Nháp đã có giao dịch tiền. Hủy đơn và hoàn tiền trước khi xóa.',
  order_holds_money: 'Đơn còn giữ tiền của khách. Ghi nhận hoàn tiền trước khi xóa.',
};

@Component({
  selector: 'app-trash-dialog',
  templateUrl: './trash-dialog.html',
})
export class TrashDialog {
  readonly kind = input.required<TrashKind>();
  /** Emits the code of a record that is now in the trash. */
  readonly trashed = output<string>();
  /** Emits after a refused or unknown result, when the list may be stale. */
  readonly settled = output<void>();
  readonly target = signal<TrashTarget | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  private readonly api = inject(TrashApi);
  private readonly injector = inject(Injector);
  private readonly destroy = inject(DestroyRef);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  open(target: TrashTarget) {
    if (this.busy()) return;
    this.error.set('');
    this.target.set(target);
    // autofocus only applies to content present when the dialog opens
    afterNextRender(() => this.dialog().nativeElement.showModal(), { injector: this.injector });
  }
  close() {
    this.dialog().nativeElement.close();
  }
  confirm() {
    const target = this.target();
    if (!target || target.blocked || this.busy()) return;
    this.busy.set(true);
    this.api
      .change(this.kind(), target.id, target.version, true)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.close();
          this.trashed.emit(target.code);
        },
        error: (error: HttpErrorResponse) => {
          this.busy.set(false);
          this.error.set(this.failure(error, target.code));
          this.settled.emit();
        },
      });
  }
  private failure({ status, error }: HttpErrorResponse, code: string) {
    if (status === 409 && REASONS[error?.error]) return REASONS[error.error];
    if (status === 409 || status === 404)
      return code + ' vừa được thay đổi ở nơi khác nên thao tác chưa thực hiện. Danh sách đã được làm mới, hãy kiểm tra rồi thử lại.';
    if (status === 403) return 'Bạn không có quyền xóa.';
    return 'Chưa xác nhận được thao tác. Kiểm tra danh sách và Thùng rác trước khi thử lại.';
  }
}
