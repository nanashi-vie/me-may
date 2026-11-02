import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, ViewChild, inject, input, output, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { BookApi } from '../book-api';
import { BookDetail, Publication } from '../book.models';

@Component({
  selector: 'app-book-status-actions',
  templateUrl: './book-status-actions.html',
  styleUrl: './book-status-actions.scss',
})
export class BookStatusActions {
  readonly book = input.required<BookDetail>();
  readonly role = input<string>();
  readonly dirty = input(false);
  readonly disabled = input(false);
  readonly changed = output<BookDetail>();
  readonly failed = output<HttpErrorResponse>();
  readonly busyChange = output<boolean>();
  private readonly api = inject(BookApi);
  @ViewChild('dialog') dialog?: ElementRef<HTMLDialogElement>;
  readonly pending = signal<Publication | null>(null);
  readonly confirmed = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  locked() {
    return this.role() !== 'OWNER' || this.dirty() || this.disabled() || this.busy();
  }
  actionLabel() {
    return (
      {
        PUBLISHED: 'xuất bản',
        ARCHIVED: 'ẩn sách',
      } as const
    )[this.pending() ?? 'ARCHIVED'];
  }
  choose(action: Publication) {
    if (this.locked()) return;
    this.pending.set(action);
    this.confirmed.set(false);
    this.dialog?.nativeElement.showModal();
  }
  cancel() {
    if (this.busy()) return;
    this.dialog?.nativeElement.close();
    this.pending.set(null);
  }
  confirm() {
    const target = this.pending();
    if (target) this.execute(target, this.confirmed());
  }
  execute(target: Publication, confirmed: boolean) {
    if (this.locked() || (target === 'PUBLISHED' && !confirmed)) return;
    const b = this.book();
    this.busy.set(true);
    this.busyChange.emit(true);
    this.error.set('');
    const req = this.api.publication(b.id, b.version, target, confirmed);
    req
      .pipe(
        finalize(() => {
          this.busy.set(false);
          this.busyChange.emit(false);
        }),
      )
      .subscribe({
        next: (book) => {
          this.changed.emit(book);
          this.dialog?.nativeElement.close();
          this.pending.set(null);
        },
        error: (e) => {
          this.error.set('Chưa đổi trạng thái. Kiểm tra dữ liệu đã lưu và phiên bản hiện tại.');
          this.failed.emit(e);
        },
      });
  }
}
