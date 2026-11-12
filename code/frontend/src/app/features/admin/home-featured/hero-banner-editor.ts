import {
  Component,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
  computed,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpResponse } from '@angular/common/http';
import { Subscription, timer, exhaustMap, filter, take, timeout } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminHttp } from '../../../core/auth/admin-http';
import { AuthService } from '../../../core/auth/auth.service';

interface BannerConfig {
  version: number;
  banners: { id: string; alt: string; src: string }[];
}
interface Upload {
  id: string;
  status: string;
  previewUrl: string;
  errorCode?: string;
}
export interface BannerDraft {
  key: string;
  id: string | null;
  alt: string;
  preview: string;
  pending: boolean;
  error: string;
  file?: File;
  requestKey?: string;
  uploadId?: string;
  attempt: number;
}
@Component({
  selector: 'app-hero-banner-editor',
  imports: [FormsModule],
  templateUrl: './hero-banner-editor.html',
  styleUrl: './hero-banner-editor.scss',
})
export class HeroBannerEditor implements OnInit {
  private readonly http = inject(AdminHttp);
  readonly auth = inject(AuthService);
  private readonly destroy = inject(DestroyRef);
  readonly rows = signal<BannerDraft[]>([]);
  readonly dirty = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly pending = computed(() => this.rows().some((r) => r.pending));
  readonly canSave = computed(
    () =>
      this.version() !== null &&
      this.dirty() &&
      !this.loading() &&
      !this.saving() &&
      !this.rows().some((r) => r.pending || !r.id),
  );
  private readonly version = signal<number | null>(null);
  private readonly requests = new Map<BannerDraft, Subscription>();
  constructor() {
    let epoch = this.auth.epoch();
    effect(() => {
      const next = this.auth.epoch();
      if (next === epoch) return;
      epoch = next;
      untracked(() => {
        for (const row of this.rows()) {
          this.cancelRow(row);
          row.pending = false;
        }
        this.rows.update((r) => [...r]);
        this.loading.set(false);
        this.saving.set(false);
      });
    });
    this.destroy.onDestroy(() => {
      for (const row of this.rows()) this.cancelRow(row);
    });
  }
  ngOnInit() {
    this.load();
  }
  private accept(c: BannerConfig) {
    for (const row of this.rows()) this.cancelRow(row);
    this.version.set(c.version);
    this.rows.set(
      c.banners.map((b) => ({
        key: crypto.randomUUID(),
        id: b.id,
        alt: b.alt,
        preview: '/api/v1/admin/hero-banners/uploads/' + b.id + '/content',
        pending: false,
        error: '',
        attempt: 0,
      })),
    );
    this.dirty.set(false);
  }
  load() {
    if (
      this.loading() ||
      this.saving() ||
      this.pending() ||
      (this.dirty() && !window.confirm('Banner có thay đổi chưa lưu. Bỏ thay đổi để tải lại?'))
    )
      return;
    this.loading.set(true);
    this.error.set('');
    const epoch = this.auth.epoch();
    this.http
      .get<BannerConfig>('/hero-banners')
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (c) => {
          if (epoch === this.auth.epoch()) {
            this.accept(c);
            this.loading.set(false);
          }
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Chưa tải được banner. Kiểm tra phiên đăng nhập rồi thử lại.');
        },
      });
  }
  changed() {
    this.dirty.set(true);
    this.notice.set('');
  }
  select(file: File | undefined, row?: BannerDraft) {
    if (
      !file ||
      this.saving() ||
      this.loading() ||
      this.auth.user()?.role !== 'OWNER' ||
      (!row && this.rows().length >= 10)
    )
      return;
    if (file.size > 10 * 1024 * 1024) {
      this.error.set('Ảnh tối đa 10 MiB.');
      return;
    }
    if (!row) {
      row = {
        key: crypto.randomUUID(),
        id: null,
        alt: '',
        preview: '',
        pending: false,
        error: '',
        attempt: 0,
      };
      this.rows.update((r) => [...r, row!]);
    }
    this.cancelRow(row);
    row.file = file;
    row.requestKey = crypto.randomUUID();
    row.uploadId = undefined;
    this.changed();
    this.send(row);
  }
  onFile(event: Event, row?: BannerDraft) {
    const input = event.target as HTMLInputElement;
    this.select(input.files?.[0], row);
    input.value = '';
  }
  private valid(row: BannerDraft, attempt: number, epoch: number) {
    return row.attempt === attempt && epoch === this.auth.epoch() && this.rows().includes(row);
  }
  private send(row: BannerDraft) {
    if (!row.file || !row.requestKey) return;
    row.pending = true;
    row.error = '';
    const attempt = ++row.attempt,
      epoch = this.auth.epoch();
    this.rows.update((r) => [...r]);
    const body = new FormData();
    body.append('file', row.file);
    body.append('requestKey', row.requestKey);
    const request = this.http
      .upload<Upload>('/hero-banners/uploads', body)
      .pipe(timeout(180000), takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (event) => {
          if (event instanceof HttpResponse && event.body && this.valid(row, attempt, epoch)) {
            row.uploadId = event.body.id;
            this.watch(row, attempt, epoch);
          }
        },
        error: () => {
          if (this.valid(row, attempt, epoch))
            this.failed(row, 'Chưa tải được ảnh. Thử lại để tiếp tục; ảnh cũ được giữ nguyên.');
        },
      });
    this.requests.set(row, request);
  }
  private watch(row: BannerDraft, attempt: number, epoch: number) {
    const request = timer(0, 1000)
      .pipe(
        exhaustMap(() => this.http.get<Upload>('/hero-banners/uploads/' + row.uploadId)),
        filter((u) => ['READY', 'FAILED', 'CANCELLED'].includes(u.status)),
        take(1),
        timeout(180000),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe({
        next: (u) => {
          if (!this.valid(row, attempt, epoch)) return;
          if (u.status === 'READY') {
            row.id = u.id;
            row.preview = u.previewUrl;
            row.pending = false;
            row.error = '';
            row.file = undefined;
            row.uploadId = undefined;
            this.rows.update((r) => [...r]);
          } else {
            row.uploadId = undefined;
            row.requestKey = crypto.randomUUID();
            this.failed(
              row,
              'Ảnh không xử lý được. Chọn ảnh JPEG, PNG hoặc WebP tĩnh (tối đa 25 MP).',
            );
          }
        },
        error: () => {
          if (this.valid(row, attempt, epoch))
            this.failed(row, 'Chưa nhận được kết quả xử lý. Bấm Kiểm tra lại để tiếp tục.');
        },
      });
    this.requests.set(row, request);
  }
  private failed(row: BannerDraft, message: string) {
    row.pending = false;
    row.error = message;
    this.rows.update((r) => [...r]);
  }
  private cancelRow(row: BannerDraft) {
    row.attempt++;
    this.requests.get(row)?.unsubscribe();
    this.requests.delete(row);
  }
  retry(row: BannerDraft) {
    if (
      row.pending ||
      this.saving() ||
      !this.rows().includes(row) ||
      this.auth.user()?.role !== 'OWNER'
    )
      return;
    this.cancelRow(row);
    if (row.uploadId) {
      row.pending = true;
      row.error = '';
      this.watch(row, row.attempt, this.auth.epoch());
      this.rows.update((r) => [...r]);
    } else this.send(row);
  }
  remove(row: BannerDraft) {
    if (this.saving()) return;
    this.cancelRow(row);
    this.rows.update((r) => r.filter((x) => x !== row));
    this.changed();
  }
  move(index: number, delta: number) {
    if (this.saving() || index + delta < 0 || index + delta >= this.rows().length) return;
    const rows = [...this.rows()];
    [rows[index], rows[index + delta]] = [rows[index + delta], rows[index]];
    this.rows.set(rows);
    this.changed();
  }
  save() {
    if (!this.canSave() || this.auth.user()?.role !== 'OWNER') return;
    this.saving.set(true);
    this.error.set('');
    this.notice.set('');
    const epoch = this.auth.epoch();
    this.http
      .mutate<BannerConfig>('PUT', '/hero-banners', {
        version: this.version(),
        banners: this.rows().map((r) => ({ id: r.id, alt: r.alt })),
      })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (c) => {
          if (epoch === this.auth.epoch()) {
            this.accept(c);
            this.saving.set(false);
            this.notice.set('Đã lưu banner trang chủ.');
          }
        },
        error: (e) => {
          this.saving.set(false);
          this.error.set(
            e.status === 409
              ? 'Dữ liệu đã thay đổi ở phiên khác. Bản đang sửa được giữ nguyên; tải lại để đối chiếu.'
              : e.status === 401
                ? 'Phiên đã hết hạn. Đăng nhập lại để lưu; bản đang sửa được giữ nguyên.'
                : 'Chưa lưu được banner. Kiểm tra dữ liệu rồi thử lại.',
          );
        },
      });
  }
}
