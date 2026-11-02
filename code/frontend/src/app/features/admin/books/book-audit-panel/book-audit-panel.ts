import { DatePipe, JsonPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnChanges, inject, input, output, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { BookApi } from '../book-api';
import { AuditSummary, Page } from '../book.models';

@Component({
  selector: 'app-book-audit-panel',
  imports: [DatePipe, JsonPipe],
  templateUrl: './book-audit-panel.html',
  styleUrl: './book-audit-panel.scss',
})
export class BookAuditPanel implements OnChanges {
  readonly bookId = input.required<string>();
  readonly version = input(0);
  readonly failed = output<HttpErrorResponse>();
  private readonly api = inject(BookApi);
  readonly result = signal<Page<AuditSummary> | null>(null);
  readonly error = signal('');
  readonly loading = signal(false);
  readonly opened = signal(false);
  private stale = true;
  private request: Subscription | null = null;
  private sequence = 0;
  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancel());
  }
  private cancel() {
    this.request?.unsubscribe();
    this.sequence++;
    this.loading.set(false);
  }
  toggle(open: boolean) {
    if (open === this.opened()) return;
    this.opened.set(open);
    if (open && this.stale) this.load(0);
    if (!open && this.loading()) {
      this.stale = true;
      this.cancel();
    }
  }
  ngOnChanges() {
    this.cancel();
    this.stale = true;
    this.result.set(null);
    if (this.opened()) this.load(0);
  }
  load(page = 0) {
    if (!this.opened()) return;
    this.cancel();
    const seq = ++this.sequence;
    this.loading.set(true);
    this.request = this.api.audit(this.bookId(), page).subscribe({
      next: (r) => {
        if (seq === this.sequence) {
          this.result.set(r);
          this.stale = false;
          this.loading.set(false);
          this.error.set('');
        }
      },
      error: (e) => {
        if (seq === this.sequence) {
          this.loading.set(false);
          this.error.set('Chưa tải được lịch sử.');
          if (e.status === 401) this.failed.emit(e);
        }
      },
    });
  }
  label(action: string) {
    return (
      (
        {
          CREATE: 'Tạo sách',
          UPDATE: 'Sửa thông tin',
          PUBLICATION_CHANGED: 'Đổi xuất bản',
          AVAILABILITY_CHANGED: 'Đổi khả dụng',
          MEDIA_ATTACHED: 'Thêm ảnh',
          MEDIA_REPLACED: 'Thay ảnh',
          MEDIA_UPDATED: 'Sửa thông tin ảnh',
          MEDIA_REMOVED: 'Gỡ ảnh',
        } as Record<string, string>
      )[action] ?? action
    );
  }
}
