import { Injectable, InjectionToken, DestroyRef, inject, signal, computed } from '@angular/core';
import { HttpErrorResponse, HttpEventType, HttpResponse } from '@angular/common/http';
import { firstValueFrom, filter, tap, Subject } from 'rxjs';
import { BookApi } from './book-api';
import { BookDetail, MediaRole, MediaAssignment, TemporaryMedia } from './book.models';
import { MEDIA_ROLES, MEDIA_LABELS } from './book-copy';
import { prepareImage, sourceImageInfo } from './image-upload';
export const PREPARE_BOOK_IMAGE = new InjectionToken<typeof prepareImage>('Prepare book image', {
  providedIn: 'root',
  factory: () => prepareImage,
});
export interface UploadItem {
  id: string;
  role: MediaRole;
  file: File | null;
  preview: string;
  mediaId: string | null;
  state: 'queued' | 'preparing' | 'uploading' | 'removing' | 'READY' | 'error';
  progress: number;
  error: string;
  alt: string;
  sourceRef: string;
  storedAlt: string;
  storedSource: string;
  uploadRole?: MediaRole;
  prepared?: Blob;
  previous?: UploadItem;
  uncertain?: boolean;
  large?: boolean;
}
@Injectable()
export class BookUploadQueue {
  private readonly api = inject(BookApi);
  private readonly prepare = inject(PREPARE_BOOK_IMAGE);
  readonly rows = signal<UploadItem[]>([]);
  readonly sessionId = signal<string | null>(null);
  readonly persisted = signal<BookDetail | null>(null);
  readonly locked = signal(false);
  readonly expired = signal(false);
  readonly paused = signal(false);
  readonly processing = signal(false);
  readonly error = signal('');
  readonly announcement = signal('');
  readonly updates = new Subject<BookDetail>();
  readonly failures = new Subject<HttpErrorResponse>();
  private sessionPromise: Promise<string> | null = null;
  private destroyed = false;
  private consumed = false;
  readonly sorted = computed(() =>
    [...this.rows()].sort((a, b) => MEDIA_ROLES.indexOf(a.role) - MEDIA_ROLES.indexOf(b.role)),
  );
  readonly pending = computed(() => this.rows().some((r) => r.state !== 'READY'));
  readonly ready = computed(
    () =>
      !!this.sessionId() &&
      !this.expired() &&
      this.rows().length >= 2 &&
      this.rows().length <= 6 &&
      !this.pending() &&
      ['FRONT', 'BACK'].every((role) => this.rows().some((r) => r.role === role)),
  );
  readonly metadataDirty = computed(() =>
    this.rows().some((r) => r.alt.trim() !== r.storedAlt || r.sourceRef.trim() !== r.storedSource),
  );
  readonly dirty = computed(() =>
    !this.persisted()
      ? this.rows().length > 0
      : this.pending() ||
        this.metadataDirty() ||
        JSON.stringify(this.assignments()) !==
          JSON.stringify(this.persisted()!.media.map((m) => ({ mediaId: m.id, role: m.role }))),
  );
  constructor() {
    inject(DestroyRef).onDestroy(() => this.dispose());
  }
  private patch(id: string, values: Partial<UploadItem>) {
    this.rows.update((rows) => rows.map((r) => (r.id === id ? { ...r, ...values } : r)));
  }
  private preview(file: File) {
    return typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : '';
  }
  private revoke(url: string) {
    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
  }
  configure(book: BookDetail) {
    this.rows().forEach((r) => {
      this.revoke(r.preview);
      if (r.previous) this.revoke(r.previous.preview);
    });
    this.persisted.set(book);
    this.rows.set(
      book.media.map((m) => ({
        id: crypto.randomUUID(),
        role: m.role,
        file: null,
        preview: m.contentPath + '?v=' + book.version,
        mediaId: m.id,
        state: 'READY',
        progress: 100,
        error: '',
        alt: m.alt ?? '',
        sourceRef: m.sourceRef ?? '',
        storedAlt: m.alt ?? '',
        storedSource: m.sourceRef ?? '',
      })),
    );
  }
  assignments(): MediaAssignment[] {
    return this.sorted()
      .filter((r) => r.mediaId !== null)
      .map((r) => ({ mediaId: r.mediaId!, role: r.role }));
  }
  add(files: File[]) {
    if (this.locked() || this.destroyed || !files.length) return;
    if (this.rows().length + files.length > 6) {
      this.error.set('Tối đa 6 ảnh. Đợt ảnh vừa chọn chưa được thêm; ảnh hiện có vẫn được giữ.');
      return;
    }
    const free = MEDIA_ROLES.filter((role) => !this.rows().some((r) => r.role === role));
    const added = files.map((file, i): UploadItem => ({
      id: crypto.randomUUID(),
      role: free[i],
      file,
      preview: this.preview(file),
      mediaId: null,
      state: 'queued',
      progress: 0,
      error: '',
      alt: '',
      sourceRef: '',
      storedAlt: '',
      storedSource: '',
    }));
    this.rows.update((rows) => [...rows, ...added]);
    this.error.set('');
    void this.pump();
  }
  move(id: string, target: string) {
    if (this.locked()) return;
    const ordered = this.sorted();
    const from = ordered.findIndex((r) => r.id === id),
      to = ordered.findIndex((r) => r.id === target);
    if (from < 0 || to < 0 || from === to) return;
    const roles = ordered.map((r) => r.role);
    const [item] = ordered.splice(from, 1);
    ordered.splice(to, 0, item);
    this.rows.set(ordered.map((r, i) => ({ ...r, role: roles[i] })));
    this.announcement.set(`Đã chuyển ảnh đến vị trí ${to + 1}: ${MEDIA_LABELS[roles[to]]}.`);
  }
  step(id: string, delta: number) {
    const ordered = this.sorted(),
      index = ordered.findIndex((r) => r.id === id);
    if (ordered[index + delta]) this.move(id, ordered[index + delta].id);
  }
  assignRole(id: string, role: MediaRole) {
    if (this.locked() || !MEDIA_ROLES.includes(role)) return;
    const item = this.rows().find((r) => r.id === id);
    if (!item) return;
    this.rows.update((rows) =>
      rows.map((r) =>
        r.id === id ? { ...r, role } : r.role === role ? { ...r, role: item.role } : r,
      ),
    );
    this.announcement.set('Đã gán vai trò ' + MEDIA_LABELS[role] + '.');
  }
  setMetadata(id: string, key: 'alt' | 'sourceRef', value: string) {
    const r = this.rows().find((r) => r.id === id);
    if (this.locked() || !r || r.state !== 'READY') return;
    this.patch(id, { [key]: value });
  }
  replace(id: string, file: File) {
    if (this.locked()) return;
    const old = this.rows().find((r) => r.id === id);
    if (!old || old.state !== 'READY') return;
    this.rows.update((rows) =>
      rows.map((r) =>
        r.id === id
          ? {
              ...r,
              id: crypto.randomUUID(),
              file,
              preview: this.preview(file),
              prepared: undefined,
              previous: old,
              state: 'queued',
              progress: 0,
              error: '',
              uncertain: false,
            }
          : r,
      ),
    );
    void this.pump();
  }
  keepPrevious(id: string) {
    const r = this.rows().find((r) => r.id === id);
    if (!r?.previous || r.uncertain || this.locked()) return;
    this.revoke(r.preview);
    this.rows.update((rows) =>
      rows.map((x) => (x.id === id ? { ...r.previous!, role: r.role } : x)),
    );
  }
  retry(id: string) {
    if (this.locked() || this.expired()) return;
    const r = this.rows().find((r) => r.id === id);
    if (!r || r.state !== 'error') return;
    if (this.persisted() && r.uncertain) {
      void this.reconcile(r);
      return;
    }
    this.patch(id, { state: 'queued', error: '' });
    this.paused.set(false);
    void this.pump();
  }
  canRemove(row: UploadItem) {
    const b = this.persisted();
    if (!b) return !row.uncertain;
    if (row.state !== 'READY')
      return row.state === 'error' && !row.mediaId && !row.previous && !row.uncertain;
    if (b.publication !== 'PUBLISHED') return true;
    const original = b.media.find((m) => m.id === row.mediaId)?.role;
    return !['FRONT', 'BACK'].includes(original ?? '') && !['FRONT', 'BACK'].includes(row.role);
  }
  async remove(id: string) {
    const row = this.rows().find((r) => r.id === id);
    if (!row || this.locked() || !this.canRemove(row)) return;
    try {
      if (
        row.mediaId &&
        (row.state === 'READY' || (!this.persisted() && !!row.previous && !row.uncertain))
      ) {
        this.patch(id, { state: 'removing' });
        const b = this.persisted();
        if (b) {
          const role = b.media.find((m) => m.id === row.mediaId)!.role;
          this.updateBook(await firstValueFrom(this.api.removeMedia(b.id, role, b.version)));
        } else if (this.sessionId())
          await firstValueFrom(this.api.removeTemporary(this.sessionId()!, row.mediaId));
      }
      this.rows.update((rows) => rows.filter((r) => r.id !== id));
      this.revoke(row.preview);
      if (row.previous) this.revoke(row.previous.preview);
    } catch (e) {
      this.patch(id, { state: 'READY' });
      this.report(e);
    }
  }
  private async session() {
    if (this.sessionId()) return this.sessionId()!;
    if (!this.sessionPromise)
      this.sessionPromise = firstValueFrom(this.api.createSession())
        .then((s) => {
          this.sessionId.set(s.id);
          return s.id;
        })
        .catch((e) => {
          this.sessionPromise = null;
          throw e;
        });
    return this.sessionPromise;
  }
  private updateBook(book: BookDetail) {
    this.persisted.set(book);
    this.updates.next(book);
  }
  private async pump() {
    if (this.processing() || this.locked() || this.paused() || this.destroyed) return;
    this.processing.set(true);
    try {
      let row: UploadItem | undefined;
      while (
        !this.locked() &&
        !this.paused() &&
        !this.destroyed &&
        (row = this.rows().find((r) => r.state === 'queued'))
      ) {
        const id = row.id;
        try {
          this.patch(id, { state: 'preparing' });
          if (!row.prepared) {
            const info = await sourceImageInfo(row.file!);
            this.patch(id, { large: info.large });
            row = { ...row, prepared: await this.prepare(row.file!) };
            this.patch(id, { prepared: row.prepared });
          }
          if (!this.rows().some((r) => r.id === id)) continue;
          const body = new FormData();
          body.set('file', row.prepared!, 'book.jpg');
          body.set('alt', row.alt);
          body.set('sourceRef', row.sourceRef);
          this.patch(id, { state: 'uploading', progress: 0 });
          let image: TemporaryMedia;
          const book = this.persisted();
          const progress = (event: any) => {
            if (event.type === HttpEventType.UploadProgress && event.total)
              this.patch(id, { progress: Math.round((event.loaded / event.total) * 100) });
          };
          if (book) {
            const existing = book.media.find((m) => m.id === row!.mediaId);
            const role =
              existing?.role ??
              MEDIA_ROLES.find((role) => !book.media.some((m) => m.role === role));
            if (!role) throw Error('Sách đã có đủ 6 ảnh.');
            this.patch(id, { uploadRole: role });
            const saved = await firstValueFrom(
              this.api.upload(book.id, role, book.version, body).pipe(
                tap(progress),
                filter((e): e is HttpResponse<BookDetail> => e.type === HttpEventType.Response),
              ),
            );
            if (!saved.body) throw Error('Chưa nhận được kết quả tải ảnh.');
            this.updateBook(saved.body);
            const m = saved.body.media.find((m) => m.role === role)!;
            image = { ...m, state: 'READY', width: null, height: null };
            if (!this.rows().some((r) => r.id === id)) {
              const current = this.persisted()!;
              this.updateBook(
                await firstValueFrom(this.api.removeMedia(current.id, role, current.version)),
              );
              continue;
            }
          } else {
            const session = await this.session();
            const response = await firstValueFrom(
              this.api.uploadTemporary(session, body, row.previous?.mediaId ?? null, id).pipe(
                tap(progress),
                filter((e): e is HttpResponse<TemporaryMedia> => e.type === HttpEventType.Response),
              ),
            );
            if (!response.body) throw Error('Chưa nhận được kết quả tải ảnh.');
            image = response.body;
            if (!this.rows().some((r) => r.id === id) || this.destroyed) {
              await firstValueFrom(this.api.removeTemporary(session, image.id));
              continue;
            }
          }
          const latest = this.rows().find((r) => r.id === id);
          if (!latest) continue;
          if (latest.previous) this.revoke(latest.previous.preview);
          this.patch(id, {
            state: 'READY',
            mediaId: image.id,
            progress: 100,
            error: '',
            previous: undefined,
            uncertain: false,
            alt: image.alt ?? '',
            sourceRef: image.sourceRef ?? '',
            storedAlt: image.alt ?? '',
            storedSource: image.sourceRef ?? '',
          });
        } catch (e) {
          this.report(e, id);
        }
      }
    } finally {
      this.processing.set(false);
    }
  }
  private async reconcile(row: UploadItem) {
    const before = this.persisted()!;
    this.patch(row.id, { state: 'uploading', error: '' });
    try {
      const current = await firstValueFrom(this.api.get(before.id));
      if (current.version === before.version) {
        this.patch(row.id, { state: 'queued', uncertain: false });
        void this.pump();
        return;
      }
      const content = (b: BookDetail) => {
        const { media, version, updatedAt, ...rest } = b;
        return JSON.stringify(rest);
      };
      const image = current.media.find((m) => m.role === row.uploadRole);
      const othersUnchanged = before.media
        .filter((m) => m.role !== row.uploadRole)
        .every((m) => current.media.some((n) => JSON.stringify(n) === JSON.stringify(m)));
      if (
        !image ||
        current.version !== before.version + 1 ||
        content(current) !== content(before) ||
        !othersUnchanged ||
        current.media.length !== before.media.length + (row.previous ? 0 : 1) ||
        image.id === row.mediaId
      )
        throw new Error(
          'Bản đã lưu có thay đổi khác. Giữ nguyên nội dung; mở bản đã lưu để đối chiếu trước khi tải lại.',
        );
      this.revoke(row.preview);
      if (row.previous) this.revoke(row.previous.preview);
      this.updateBook(current);
      this.patch(row.id, {
        state: 'READY',
        mediaId: image.id,
        preview: image.contentPath + '?v=' + current.version,
        previous: undefined,
        uncertain: false,
        progress: 100,
        alt: image.alt ?? '',
        sourceRef: image.sourceRef ?? '',
        storedAlt: image.alt ?? '',
        storedSource: image.sourceRef ?? '',
      });
    } catch (e) {
      this.patch(row.id, {
        state: 'error',
        uncertain: true,
        error:
          e instanceof Error
            ? e.message
            : 'Chưa đối chiếu được ảnh đã lưu. Thử lại để kiểm tra kết quả.',
      });
    }
  }
  private report(e: unknown, id?: string) {
    const http = e instanceof HttpErrorResponse ? e : null;
    const message =
      http?.status === 410
        ? 'Phiên ảnh đã hết hạn. Tạo lại phiên ảnh để tiếp tục.'
        : http?.status === 401
          ? 'Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục.'
          : http?.status === 429
            ? 'Đã đạt giới hạn tải ảnh. Giữ nguyên ảnh và thử lại sau.'
            : e instanceof Error
              ? e.message
              : 'Chưa tải được ảnh. Giữ nguyên thông tin và thử lại ảnh này.';
    if (id)
      this.patch(id, {
        state: 'error',
        error: message,
        uncertain: !!http && (http.status === 0 || (http.status >= 500 && http.status !== 502)),
      });
    else this.error.set(message);
    if (http?.status === 410) {
      this.expired.set(true);
      this.paused.set(true);
    }
    if (http?.status === 401 || http?.status === 403) this.paused.set(true);
    if (http) this.failures.next(http);
  }
  async flushMetadata() {
    for (const row of this.rows().filter(
      (r) =>
        r.state === 'READY' &&
        (r.alt.trim() !== r.storedAlt || r.sourceRef.trim() !== r.storedSource),
    )) {
      const book = this.persisted();
      let m: TemporaryMedia | BookDetail['media'][number];
      if (book) {
        const role = book.media.find((m) => m.id === row.mediaId)!.role;
        const saved = await firstValueFrom(
          this.api.updateMedia(
            book.id,
            role,
            book.version,
            row.alt.trim() || null,
            row.sourceRef.trim() || null,
          ),
        );
        this.updateBook(saved);
        m = saved.media.find((m) => m.id === row.mediaId)!;
      } else
        m = await firstValueFrom(
          this.api.updateTemporaryMetadata(
            this.sessionId()!,
            row.mediaId!,
            row.alt.trim() || null,
            row.sourceRef.trim() || null,
          ),
        );
      this.patch(row.id, {
        alt: m.alt ?? '',
        sourceRef: m.sourceRef ?? '',
        storedAlt: m.alt ?? '',
        storedSource: m.sourceRef ?? '',
      });
    }
  }
  renew() {
    if (this.locked() || this.persisted() || this.processing()) return;
    const old = this.sessionId();
    if (old) this.api.cancelSession(old).subscribe({ error: () => {} });
    this.rows().forEach((r) => {
      if (r.previous) this.revoke(r.previous.preview);
    });
    this.sessionId.set(null);
    this.sessionPromise = null;
    this.expired.set(false);
    this.paused.set(false);
    this.rows.update((rows) =>
      rows.map((r) => ({
        ...r,
        state: 'queued',
        mediaId: null,
        previous: undefined,
        error: '',
        uncertain: false,
      })),
    );
    void this.pump();
  }
  resume() {
    this.paused.set(false);
    this.rows.update((rows) =>
      rows.map((r) => (r.state === 'error' ? { ...r, state: 'queued', error: '' } : r)),
    );
    void this.pump();
  }
  markConsumed() {
    this.consumed = true;
  }
  private dispose() {
    this.destroyed = true;
    this.rows().forEach((r) => {
      this.revoke(r.preview);
      if (r.previous) this.revoke(r.previous.preview);
    });
    if (this.sessionId() && !this.consumed)
      this.api.cancelSession(this.sessionId()!).subscribe({ error: () => {} });
  }
}
