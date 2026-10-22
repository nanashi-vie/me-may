import { Component, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { from, concatMap, filter, tap, finalize } from 'rxjs';
import { BookApi } from './book-api';
import { BookDetail, MediaRole } from './book.models';
@Component({
  selector: 'app-book-media-panel',
  templateUrl: './book-media-panel.html',
  styleUrl: './book-media-panel.scss',
})
export class BookMediaPanel {
  readonly book = input.required<BookDetail>();
  readonly dirty = input(false);
  readonly disabled = input(false);
  readonly changed = output<BookDetail>();
  readonly failed = output<HttpErrorResponse>();
  readonly busyChange = output<boolean>();
  readonly pendingChange = output<boolean>();
  private readonly api = inject(BookApi);
  readonly roles: MediaRole[] = ['FRONT', 'BACK', 'INSIDE'];
  readonly labels = { FRONT: 'Bìa trước', BACK: 'Mặt sau', INSIDE: 'Một trang nội dung' };
  readonly busy = signal(false);
  readonly error = signal('');
  readonly progress = signal(0);
  readonly uploadingRole = signal<MediaRole | null>(null);
  readonly selected = signal<Partial<Record<MediaRole, File>>>({});
  private readonly altDraft: Partial<Record<MediaRole, string>> = {};
  private readonly sourceDraft: Partial<Record<MediaRole, string>> = {};
  private pending() {
    this.pendingChange.emit(
      Object.keys(this.selected()).length > 0 ||
        Object.entries(this.altDraft).some(
          ([role, value]) => value !== (this.image(role as MediaRole)?.alt ?? ''),
        ) ||
        Object.entries(this.sourceDraft).some(
          ([role, value]) => value !== (this.image(role as MediaRole)?.sourceRef ?? ''),
        ),
    );
  }
  image(role: MediaRole) {
    return this.book().media.find((m) => m.role === role);
  }
  alt(role: MediaRole) {
    return this.altDraft[role] ?? this.image(role)?.alt ?? '';
  }
  source(role: MediaRole) {
    return this.sourceDraft[role] ?? this.image(role)?.sourceRef ?? '';
  }
  setAlt(role: MediaRole, value: string) {
    this.altDraft[role] = value;
    this.pending();
  }
  setSource(role: MediaRole, value: string) {
    this.sourceDraft[role] = value;
    this.pending();
  }
  select(role: MediaRole, event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.selected.update((s) => ({ ...s, [role]: file }));
    this.pending();
  }
  uploadFiles(files = this.selected()) {
    if (this.busy() || this.dirty() || this.disabled()) return;
    const entries = this.roles.filter((r) => files[r]).map((r) => [r, files[r]!] as const);
    if (!entries.length) return;
    let current = this.book();
    this.setBusy(true);
    this.error.set('');
    from(entries)
      .pipe(
        concatMap(([role, file]) => {
          this.uploadingRole.set(role);
          this.progress.set(0);
          const body = new FormData();
          body.set('file', file);
          body.set('alt', this.alt(role));
          body.set('sourceRef', this.source(role));
          return this.api.upload(current.id, role, current.version, body).pipe(
            tap((event) => {
              if (event.type === HttpEventType.UploadProgress && event.total)
                this.progress.set(Math.round((event.loaded / event.total) * 100));
            }),
            filter((event) => event.type === HttpEventType.Response),
            tap((event) => {
              if (event.body) {
                current = event.body;
                this.changed.emit(current);
                this.selected.update((s) => {
                  const next = { ...s };
                  delete next[role];
                  return next;
                });
                delete this.altDraft[role];
                delete this.sourceDraft[role];
                this.pending();
              }
            }),
          );
        }),
        finalize(() => {
          this.setBusy(false);
          this.uploadingRole.set(null);
        }),
      )
      .subscribe({ error: (e) => this.fail(e) });
  }
  saveMetadata(role: MediaRole) {
    if (this.busy() || this.dirty() || this.disabled()) return;
    const b = this.book();
    this.setBusy(true);
    this.api
      .updateMedia(b.id, role, b.version, this.alt(role) || null, this.source(role) || null)
      .pipe(finalize(() => this.setBusy(false)))
      .subscribe({
        next: (book) => {
          this.changed.emit(book);
          delete this.altDraft[role];
          delete this.sourceDraft[role];
          this.pending();
        },
        error: (e) => this.fail(e),
      });
  }
  remove(role: MediaRole) {
    if (
      this.busy() ||
      this.dirty() ||
      this.disabled() ||
      this.book().publication === 'PUBLISHED' ||
      !window.confirm(`Gỡ ảnh ${this.labels[role]} của ${this.book().bookCode}?`)
    )
      return;
    const b = this.book();
    this.setBusy(true);
    this.api
      .removeMedia(b.id, role, b.version)
      .pipe(finalize(() => this.setBusy(false)))
      .subscribe({ next: (book) => this.changed.emit(book), error: (e) => this.fail(e) });
  }
  private setBusy(value: boolean) {
    this.busy.set(value);
    this.busyChange.emit(value);
  }
  private fail(e: HttpErrorResponse) {
    this.error.set(
      e.status === 415
        ? 'Chỉ nhận ảnh JPEG/PNG hợp lệ. Hãy chuyển HEIC sang JPEG/PNG.'
        : e.status === 413
          ? 'Ảnh tối đa 10 MiB và 25 megapixel.'
          : 'Chưa lưu được ảnh. Ảnh cũ được giữ nguyên; kiểm tra phiên bản và thử lại.',
    );
    this.failed.emit(e);
  }
}
