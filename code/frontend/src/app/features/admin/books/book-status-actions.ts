import { Component, ElementRef, ViewChild, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { BookApi } from './book-api';
import { Availability, BookDetail, Publication } from './book.models';
@Component({
  selector: 'app-book-status-actions',
  template: `@if (role() === 'OWNER') {
      <section class="status-actions">
        <h2>Xuất bản và khả dụng</h2>
        @if (dirty()) {
          <p>Lưu nội dung trước khi đổi trạng thái.</p>
        }
        <div class="buttons">
          @if (book().publication === 'DRAFT') {
            <button (click)="choose('PUBLISHED')" [disabled]="locked()">Xuất bản</button>
          }
          @if (book().publication === 'PUBLISHED') {
            <button class="secondary" (click)="choose('ARCHIVED')" [disabled]="locked()">
              Ẩn sách
            </button>
          }
          @if (book().publication === 'ARCHIVED') {
            <button class="secondary" (click)="choose('DRAFT')" [disabled]="locked()">
              Khôi phục nháp
            </button>
          }
          <button
            class="secondary"
            (click)="choose(book().availability === 'AVAILABLE' ? 'SOLD' : 'AVAILABLE')"
            [disabled]="locked()"
          >
            {{ book().availability === 'AVAILABLE' ? 'Đánh dấu hết hàng' : 'Đánh dấu còn hàng' }}
          </button>
        </div>
        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }
      </section>
    }
    <dialog #dialog (cancel)="cancel()" aria-labelledby="status-title">
      <h2 id="status-title">Xác nhận {{ actionLabel() }}</h2>
      <p>{{ book().bookCode }} · {{ book().title || 'Chưa có tên' }}</p>
      @if (pending() === 'PUBLISHED') {
        <label
          ><input
            type="checkbox"
            [checked]="confirmed()"
            (change)="confirmed.set($any($event.target).checked)"
          />Tôi đã đối chiếu đủ ba ảnh và tình trạng với đúng cuốn sách này.</label
        >
      }
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
      <div class="buttons">
        <button
          (click)="confirm()"
          [disabled]="busy() || (pending() === 'PUBLISHED' && !confirmed())"
        >
          Xác nhận</button
        ><button class="secondary" (click)="cancel()" [disabled]="busy()">Hủy</button>
      </div>
    </dialog>`,
  styles: [
    `
      .status-actions {
        border-top: 1px solid var(--line);
        margin-top: 2rem;
        padding-top: 1rem;
      }
      .buttons {
        display: flex;
        gap: 0.7rem;
        flex-wrap: wrap;
      }
      dialog {
        border: 1px solid var(--line);
        max-width: 520px;
        padding: 2rem;
      }
      dialog::backdrop {
        background: #0006;
      }
      dialog input {
        width: auto;
        margin-right: 0.5rem;
      }
      dialog .buttons {
        margin-top: 1.5rem;
      }
    `,
  ],
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
  readonly pending = signal<Publication | Availability | null>(null);
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
        DRAFT: 'khôi phục nháp',
        SOLD: 'hết hàng',
        AVAILABLE: 'còn hàng',
      } as const
    )[this.pending() ?? 'DRAFT'];
  }
  choose(action: Publication | Availability) {
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
  execute(target: Publication | Availability, confirmed: boolean) {
    if (this.locked() || (target === 'PUBLISHED' && !confirmed)) return;
    const b = this.book();
    this.busy.set(true);
    this.busyChange.emit(true);
    this.error.set('');
    const req =
      target === 'AVAILABLE' || target === 'SOLD'
        ? this.api.availability(b.id, b.version, target)
        : this.api.publication(b.id, b.version, target, confirmed);
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
