import { BookPerformance } from './book-performance';
import { Injectable, InjectionToken, DestroyRef, inject, signal, computed } from '@angular/core';
import { HttpErrorResponse, HttpEventType, HttpResponse } from '@angular/common/http';
import { firstValueFrom, filter, tap, Subject, takeUntil, timer } from 'rxjs';
import { BookApi } from './book-api';
import { BookDetail, MediaRole, MediaAssignment, TemporaryMedia, ImageCapability, ImageOperation, DriveBatchMode, DriveBatchView, UploadSession } from './book.models';
import { driveFileId } from './drive-source';
import { MEDIA_ROLES, MEDIA_LABELS } from './book-copy';
import { prepareImage, prepareValidatedImage, SourceImageInfo, sourceImageInfo } from './image-upload';
export const PREPARE_BOOK_IMAGE = new InjectionToken<(file:File,info?:SourceImageInfo)=>Promise<Blob>>('Prepare book image', {
  providedIn: 'root',
  factory: () => (file,info)=>info?prepareValidatedImage(file,info):prepareImage(file),
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
  provider?: ImageCapability['provider'];
  jobId?: string;
  pendingLocal?: boolean;
  sourceStatus?: string;
  sourceJob?: string;
  sourceFile?: string;
  sourceRequest?: string;
  sourceError?: string;
  sourceBusy?: boolean;
  commitBusy?: boolean;
}
@Injectable()
export class BookUploadQueue {
  private readonly api = inject(BookApi);
  private readonly metrics = inject(BookPerformance);
  private readonly selectedAt = new Map<string,number>();
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
  private preparing:{id:string;promise:Promise<void>}|null=null;
  private consumed = false;
  private readonly stopped = new Subject<void>();
  readonly capability = signal<ImageCapability | null>(null);
  private capabilityRequest: Promise<ImageCapability> | null = null;
  private localSession = false;
  readonly sorted = computed(() =>
    [...this.rows()].sort((a, b) => MEDIA_ROLES.indexOf(a.role) - MEDIA_ROLES.indexOf(b.role)),
  );
  readonly pending = computed(() => this.rows().some((r) => r.state !== 'READY' || r.pendingLocal || r.sourceBusy));
  readonly ready = computed(
    () =>
      (!!this.persisted() || !!this.sessionId()) &&
      !this.expired() &&
      this.rows().length >= 2 &&
      this.rows().length <= 8 &&
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
          JSON.stringify(this.persisted()!.media.map((m) => mediaAssignment(m.id,m.role))),
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
  configure(book: BookDetail | null) {
    this.rows().forEach((r) => {
      this.revoke(r.preview);
      if (r.previous) this.revoke(r.previous.preview);
    });
    this.persisted.set(book);
    this.rows.set(
      book?.media.map((m) => ({
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
        provider: m.provider,
      })) ?? [],
    );
    if (book) void this.restoreLocal();
  }
  restoreDraft() {
    if (!this.persisted() && !this.rows().length) void this.restoreLocal();
  }
  private async capabilities() {
    if (this.capability()) return this.capability()!;
    if (!this.capabilityRequest) {
      this.capabilityRequest = firstValueFrom(this.api.capabilities().pipe(takeUntil(this.stopped)))
        .then(value => { this.capability.set(value); return value; })
        .finally(() => { this.capabilityRequest = null; });
    }
    return this.capabilityRequest;
  }
  private sessionStorageKey() {
    return 'memay.image-session.' + (this.persisted()?.id ?? 'new');
  }
  private rememberLocal() {
    if (!this.localSession || !this.sessionId()) return;
    try {
      sessionStorage.setItem(this.sessionStorageKey(), JSON.stringify({
        session: this.sessionId(),
        roles: Object.fromEntries(this.rows().map(row => [row.id, row.role])),
      }));
    } catch { /* Session restoration is optional when browser storage is unavailable. */ }
  }
  private restoring: {session: string; promise: Promise<UploadSession>} | null = null;
  private async restoreLocal() {
    const key = this.sessionStorageKey();
    try {
      const stored = sessionStorage.getItem(key);
      if (!stored || this.sessionId()) return;
      const saved = JSON.parse(stored) as {session: string; roles: Record<string, MediaRole>};
      await this.restoreDriveSession(saved.session);
    } catch (error) {
      if (error instanceof HttpErrorResponse && [403, 404, 410].includes(error.status)) {
        try { sessionStorage.removeItem(key); } catch { /* Browser storage unavailable. */ }
      }
    }
  }

  assignments(): MediaAssignment[] {
    return this.sorted()
      .filter((r) => r.mediaId !== null)
      .map((r) => mediaAssignment(r.mediaId!, r.role));
  }
  add(files: File[]) {
    if (this.locked() || this.destroyed || !files.length) return;
    if (this.rows().length + files.length > 8) {
      this.error.set('Tối đa 8 ảnh. Đợt ảnh vừa chọn chưa được thêm; ảnh hiện có vẫn được giữ.');
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
    added.forEach(r=>this.selectedAt.set(r.id,performance.now()));
    this.rows.update((rows) => [...rows, ...added]);
    this.error.set('');
    void this.pump();
  }
  assignRole(id: string, role: MediaRole) {
    if (this.locked() || !MEDIA_ROLES.includes(role)) return;
    const item = this.rows().find((r) => r.id === id);
    if (!item || item.role === role) return;
    this.rows.update((rows) =>
      rows.map((r) =>
        r.id === id ? { ...r, role }
          : r.role === role ? { ...r, role: item.role } : r,
      ),
    );
    this.rememberLocal();
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
    if (!old || old.state !== 'READY' || old.pendingLocal) return;
    this.rows.update((rows) =>
      rows.map((r) =>
        r.id === id
          ? {
              ...r,
              id: crypto.randomUUID(),
              file,
              preview: this.preview(file),
              prepared: undefined,
              jobId: undefined,
              sourceStatus: undefined,
              sourceJob: undefined,
              sourceFile: undefined,
              sourceRequest: undefined,
              sourceError: undefined,
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
    if (r.provider === 'LOCAL' && r.mediaId && r.mediaId !== r.previous.mediaId) {
      void this.remove(id);
      return;
    }
    this.revoke(r.preview);
    this.rows.update((rows) =>
      rows.map((x) => (x.id === id ? { ...r.previous!, role: r.role } : x)),
    );
  }
  retry(id: string) {
    if (this.locked() || this.expired()) return;
    const r = this.rows().find((r) => r.id === id);
    if (!r || r.state !== 'error') return;
    if (r.jobId) {
      void this.resumeLocal(r, true);
      return;
    }
    if (this.persisted() && r.uncertain && r.provider !== 'LOCAL') {
      void this.reconcile(r);
      return;
    }
    this.patch(id, { state: 'queued', error: '' });
    this.paused.set(false);
    void this.pump();
  }
  canRemove(row: UploadItem) {
    if (row.pendingLocal || (row.provider === 'LOCAL' && !this.persisted()))
      return !row.sourceBusy && !row.commitBusy && ['READY', 'error'].includes(row.state);
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
      if (row.provider === 'LOCAL' && (row.pendingLocal || !this.persisted())) {
        if (row.mediaId && this.sessionId())
          await firstValueFrom(this.api.removeTemporary(this.sessionId()!, row.mediaId));
        this.rows.update(rows => row.previous
          ? rows.map(r => r.id === id ? row.previous! : r)
          : rows.filter(r => r.id !== id));
        this.revoke(row.preview);
        this.rememberLocal();
        return;
      }
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
  async driveContext(mode: DriveBatchMode) {
    const capability = await this.capabilities();
    if (capability.provider !== 'LOCAL') throw new Error('Backend chưa bật nhập ảnh LOCAL.');
    if (mode === 'IMPORT') {
      if (this.persisted()) throw new Error('Nhập từ Drive hiện dùng cho sách mới.');
      this.localSession = true;
      const sessionId = await this.session();
      this.rememberLocal();
      return {sessionId, bookId: null, bookVersion: null, targets: []};
    }
    const rows = this.sorted().filter(row => row.provider === 'LOCAL' && row.state === 'READY' && row.mediaId);
    if (!rows.length) throw new Error('Tải ảnh LOCAL trước khi ghép nguồn.');
    const temporary = rows.filter(row => row.pendingLocal || !this.persisted());
    if (temporary.length && temporary.length !== rows.length)
      throw new Error('Ghép riêng ảnh của sách đã lưu và ảnh trong phiên thay thế.');
    const book = temporary.length ? null : this.persisted();
    return {sessionId: book ? null : await this.session(), bookId: book?.id ?? null,
      bookVersion: book?.version ?? null, targets: rows.map(row => ({mediaId: row.mediaId!}))};
  }

  async restoreDriveSession(sessionId: string): Promise<UploadSession> {
    if (this.restoring?.session === sessionId) return this.restoring.promise;
    if (this.sessionId() && this.sessionId() !== sessionId) throw new Error('Phiên nhập ảnh đã thay đổi.');
    const key = this.sessionStorageKey();
    let roles: Record<string, MediaRole> = {};
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) ?? '{}');
      if (saved.session === sessionId) roles = saved.roles ?? {};
    } catch { /* Optional restoration metadata. */ }
    const promise = (async () => {
      const session = await firstValueFrom(this.api.session(sessionId).pipe(takeUntil(this.stopped)));
      if (this.destroyed || this.sessionStorageKey() !== key) throw new Error('Phiên nhập ảnh đã thay đổi.');
      if (session.state !== 'OPEN') { sessionStorage.removeItem(key); return session; }
      this.localSession = true;
      this.sessionId.set(session.id);
      for (const media of session.media) {
        if (media.provider !== 'LOCAL' || !media.requestKey || !media.jobId
            || this.rows().some(row => row.mediaId === media.id)) continue;
        const role = roles[media.requestKey];
        if (!MEDIA_ROLES.includes(role)) continue;
        const previous = this.rows().find(row => row.role === role);
        const item: UploadItem = {
          id: media.requestKey, role, file: null, mediaId: media.id, jobId: media.jobId,
          provider: 'LOCAL', pendingLocal: !!this.persisted(),
          preview: media.state === 'READY' ? media.contentPath : '',
          state: media.state === 'READY' ? 'READY' : 'error', progress: 0,
          error: media.state === 'READY' ? '' : 'Tiếp tục kiểm tra ảnh đã gửi.',
          alt: media.alt ?? '', sourceRef: media.sourceRef ?? '',
          storedAlt: media.alt ?? '', storedSource: media.sourceRef ?? '', previous,
        };
        this.rows.update(rows => [...rows.filter(row => row.role !== role), item]);
        if (media.state !== 'READY' && media.jobStatus !== 'FAILED') void this.resumeLocal(item, false);
      }
      this.rememberLocal();
      return session;
    })();
    this.restoring = {session:sessionId,promise};
    try { return await promise; }
    finally { if (this.restoring?.promise === promise) this.restoring = null; }
  }

  acceptDriveBatch(view: DriveBatchView, session: string | null, currentMedia?: Set<string>) {
    if (view.mode === 'IMPORT') {
      if (!session) throw new Error('Thiếu phiên nhập ảnh.');
      if (this.sessionId() && this.sessionId() !== session) throw new Error('Phiên nhập ảnh đã thay đổi.');
      this.localSession = true; this.sessionId.set(session);
      for (const selection of view.selections) {
        if (currentMedia && !currentMedia.has(selection.mediaId)) continue;
        const item = view.items.find(row => row.id === selection.itemId);
        if (!item?.contentPath || !selection.role) continue;
        const existing = this.rows().find(row => row.mediaId === selection.mediaId);
        if (existing) { this.patch(existing.id, {sourceStatus:'VERIFIED', sourceFile:item.fileId}); continue; }
        const role = selection.role;
        this.rows.update(rows => [...rows, {
          id: item.id, role, file: null, preview: item.contentPath!, mediaId: selection.mediaId,
          state: 'READY', progress: 100, error: '', alt: '', sourceRef: '', storedAlt: '', storedSource: '',
          provider: 'LOCAL', sourceStatus: 'VERIFIED', sourceFile: item.fileId,
        }]);
      }
      this.rememberLocal();
    } else {
      const book = this.persisted();
      if (book && view.bookVersion != null && view.bookVersion >= book.version)
        this.updateBook({...book, version: view.bookVersion});
      for (const selected of view.selections) {
        const item = view.items.find(row => row.id === selected.itemId);
        const row = this.rows().find(row => row.mediaId === selected.mediaId);
        if (row) this.patch(row.id, {sourceStatus: 'VERIFIED', sourceFile: item?.fileId, sourceError: ''});
      }
    }
  }

  async ensureSession() {return this.session();}
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
  private async normalize(row:UploadItem) {
    const start=performance.now();
    this.metrics.record({phase:'queue',item:row.id,durationMs:start-(this.selectedAt.get(row.id)??start)});
    this.patch(row.id,{state:'preparing'});
    try {
      const info=await sourceImageInfo(row.file!);
      if(this.destroyed || !this.rows().some(r=>r.id===row.id))return;
      const prepared=await this.prepare(row.file!,info);
      if(this.destroyed || !this.rows().some(r=>r.id===row.id))return;
      this.patch(row.id,{prepared,large:info.large,state:'queued'});
      this.metrics.record({phase:'prepare',item:row.id,durationMs:performance.now()-start,sourceBytes:row.file?.size,outputBytes:prepared.size});
    } catch(error){if(!this.destroyed&&this.rows().some(r=>r.id===row.id))this.report(error,row.id);}
  }
  private async prepareRow(id:string) {
    if(this.preparing) {
      const pending=this.preparing;await pending.promise;
      if(this.preparing===pending)this.preparing=null;
      if(pending.id===id)return;
    }
    const row=this.rows().find(r=>r.id===id);
    if(!row || row.prepared || this.paused() || this.destroyed)return;
    const pending={id,promise:this.normalize(row)};this.preparing=pending;
    await pending.promise;if(this.preparing===pending)this.preparing=null;
  }
  private prepareNext() {
    if(this.preparing || this.paused() || this.destroyed || this.locked())return;
    const next=this.rows().find(r=>r.state==='queued'&&!r.prepared);
    if(next)void this.prepareRow(next.id);
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
        (row = this.rows().find((r) => r.state === 'queued' || r.state==='preparing'))
      ) {
        const id = row.id;
        try {
          const capability = await this.capabilities();
          if (capability.provider === 'LOCAL') {
            await this.sendLocal(row, capability);
            continue;
          }
          await this.prepareRow(id);
          row=this.rows().find(r=>r.id===id);
          if(!row?.prepared || row.state==='error' || this.paused() || this.destroyed)continue;
          const uploadingAt=performance.now();
          const body = new FormData();
          body.set('file', row.prepared!, 'book.jpg');
          body.set('providerRevision', capability.revision);
          body.set('alt', row.alt);
          body.set('sourceRef', row.sourceRef);
          this.patch(id, { state: 'uploading', progress: 0 });
          this.prepareNext();
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
            if (!role) throw Error('Đã đủ 8 vị trí ảnh.');
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
          this.metrics.record({phase:'upload',item:id,durationMs:performance.now()-uploadingAt});
          this.metrics.record({phase:'ready',item:id,durationMs:performance.now()-(this.selectedAt.get(id)??uploadingAt)});
          const latest = this.rows().find((r) => r.id === id);
          if (!latest) continue;
          if (latest.previous) this.revoke(latest.previous.preview);
          this.patch(id, {
            state: 'READY',
            prepared:undefined,
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
  private async waitOperation(job: string): Promise<ImageOperation> {
    for (let attempt = 0; attempt < 75; attempt++) {
      const operation = await firstValueFrom(this.api.imageOperation(job).pipe(takeUntil(this.stopped)));
      if (operation.status === 'READY') return operation;
      if (operation.status === 'FAILED') throw new Error(
        operation.errorCode === 'source_hash_mismatch' ? 'Ảnh Drive khác file gốc đã tải.'
          : operation.errorCode === 'SOURCE_MISSING' ? 'Không tìm thấy ảnh trên Drive.'
          : operation.errorCode === 'ACCESS_ERROR' ? 'Không đọc được ảnh Drive. Kiểm tra quyền của tài khoản dịch vụ.'
          : 'Xử lý hoặc xác minh ảnh thất bại.');
      if (operation.status === 'CANCELLED') throw new Error('Tác vụ ảnh đã bị hủy.');
      await firstValueFrom(timer(attempt === 0 ? 1000 : attempt === 1 ? 2000 : 5000)
        .pipe(takeUntil(this.stopped)));
    }
    throw new Error('Ảnh vẫn đang xử lý. Thử lại để tiếp tục kiểm tra.');
  }

  private async sendLocal(row: UploadItem, capability: ImageCapability) {
    if (!row.file || row.file.size > capability.maxBytes || !capability.formats.includes(row.file.type))
      throw new Error('Chọn ảnh JPEG, PNG hoặc WebP tĩnh không quá 10 MiB.');
    this.localSession = true;
    const session = await this.session();
    const { id } = row;
    if (this.destroyed || !this.rows().some(item => item.id === id)) return;
    this.patch(id, { provider: 'LOCAL', pendingLocal: !!this.persisted(), state: 'uploading', mediaId: null });
    this.rememberLocal();
    const body = new FormData();
    body.set('file', row.file);
    body.set('alt', row.alt);
    body.set('sourceRef', row.sourceRef);
    body.set('providerRevision', capability.revision);
    body.set('requestKey', id);
    if (!this.persisted() && row.previous?.mediaId) body.set('replaceId', row.previous.mediaId);
    let operation: ImageOperation;
    try {
      const response = await firstValueFrom(this.api.uploadLocal(session, body).pipe(
        takeUntil(this.stopped),
        tap(event => {
          if (event.type === HttpEventType.UploadProgress && event.total)
            this.patch(id, { progress: Math.round(event.loaded / event.total * 100) });
        }),
        filter((event): event is HttpResponse<ImageOperation> => event.type === HttpEventType.Response),
      ));
      if (!response.body) throw new Error('Chưa nhận được kết quả tải ảnh.');
      operation = response.body;
    } catch (error) {
      if (!(error instanceof HttpErrorResponse) || (error.status !== 0 && error.status < 500)) throw error;
      const remote = await firstValueFrom(this.api.session(session).pipe(takeUntil(this.stopped)));
      const media = remote.media.find(item => item.requestKey === id);
      if (!media?.jobId) throw error;
      operation = { mediaId: media.id, jobId: media.jobId, status: 'PENDING', statusPath: '' };
    }
    this.patch(id, { jobId: operation.jobId, mediaId: operation.mediaId });
    await this.waitOperation(operation.jobId);
    await this.finishLocal(id, session, operation.mediaId);
  }

  private async finishLocal(id: string, session: string, mediaId: string) {
    const data = await firstValueFrom(this.api.session(session).pipe(takeUntil(this.stopped)));
    const image = data.media.find(item => item.id === mediaId && item.state === 'READY');
    if (!image) throw new Error('Ảnh chưa sẵn sàng trong phiên này.');
    const row = this.rows().find(item => item.id === id);
    if (!row || this.destroyed) return;
    this.revoke(row.preview);
    if (!row.pendingLocal && row.previous) this.revoke(row.previous.preview);
    this.patch(id, { state: 'READY', progress: 100, error: '', uncertain: false, preview: image.contentPath,
      prepared: undefined, previous: row.pendingLocal ? row.previous : undefined,
      storedAlt: image.alt ?? '', storedSource: image.sourceRef ?? '' });
    this.rememberLocal();
  }

  private async resumeLocal(row: UploadItem, retry: boolean) {
    if (!row.jobId || !this.sessionId()) return;
    this.patch(row.id, { state: 'uploading', error: '' });
    try {
      const operation = await firstValueFrom(this.api.imageOperation(row.jobId).pipe(takeUntil(this.stopped)));
      if (retry && operation.status === 'FAILED')
        await firstValueFrom(this.api.retryImageOperation(row.jobId).pipe(takeUntil(this.stopped)));
      await this.waitOperation(row.jobId);
      await this.finishLocal(row.id, this.sessionId()!, operation.mediaId);
    } catch (error) {
      this.report(error, row.id);
    }
  }

  async verifySource(id: string, input: string): Promise<boolean> {
    const row = this.rows().find(item => item.id === id);
    if (!row?.mediaId || row.provider !== 'LOCAL' || row.state !== 'READY' || row.sourceBusy || row.commitBusy) return false;
    this.patch(id, { sourceBusy: true, sourceError: '' });
    try {
      const fileId = driveFileId(input);
      let job = fileId === row.sourceFile ? row.sourceJob : undefined;
      const book = row.pendingLocal ? null : this.persisted();
      if (!job) {
        const status = await firstValueFrom(this.api.sourceStatus(row.mediaId).pipe(takeUntil(this.stopped)));
        if (book && status.bookVersion !== book.version)
          throw new Error('Sách đã thay đổi. Tải lại sách trước khi xác minh nguồn.');
        const requestKey = fileId === row.sourceFile && row.sourceRequest
          ? row.sourceRequest : crypto.randomUUID();
        this.patch(id, { sourceFile: fileId, sourceJob: undefined, sourceRequest: requestKey });
        const result = await firstValueFrom(this.api.verifySource(row.mediaId, {
          fileId, bindingVersion: status.bindingVersion, bookVersion: status.bookVersion, requestKey,
        }).pipe(takeUntil(this.stopped)));
        job = result.operationId;
        this.patch(id, { sourceJob: job });
      }
      await this.waitOperation(job);
      const status = await firstValueFrom(this.api.sourceStatus(row.mediaId).pipe(takeUntil(this.stopped)));
      if (book && status.bookVersion === book.version + 1)
        this.updateBook({ ...book, version: status.bookVersion });
      this.patch(id, { sourceStatus: status.status, sourceJob: undefined, sourceRequest: undefined });
      return status.status === 'VERIFIED';
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không xác minh được nguồn Drive.';
      if (message !== 'Ảnh vẫn đang xử lý. Thử lại để tiếp tục kiểm tra.')
        this.patch(id, { sourceJob: undefined, sourceRequest: undefined });
      this.patch(id, { sourceError: message });
      return false;
    } finally {
      this.patch(id, { sourceBusy: false });
    }
  }

  async commitLocal(id: string) {
    const row = this.rows().find(item => item.id === id);
    const book = this.persisted();
    if (!row?.mediaId || !row.pendingLocal || !book || row.state !== 'READY' || row.sourceBusy || row.commitBusy) return;
    this.patch(id, { commitBusy: true, sourceError: '' });
    try {
      const saved = await firstValueFrom(this.api.commitReplacement(book.id, row.mediaId, {
        version: book.version, role: row.role, requestKey: row.id,
      }).pipe(takeUntil(this.stopped)));
      const image = saved.media.find(media => media.id === row.mediaId);
      if (!image) throw new Error('Ảnh đã thay đổi. Tải lại sách để đối chiếu.');
      if (row.previous) this.revoke(row.previous.preview);
      this.updateBook(saved);
      this.patch(id, { pendingLocal: false, previous: undefined, preview: image.contentPath + '?v=' + saved.version });
      this.rememberLocal();
    } catch (error) {
      this.patch(id, { sourceError: error instanceof HttpErrorResponse && error.error?.error === 'image_source_unverified'
        ? 'Hãy xác minh nguồn Drive trước khi gắn ảnh vào sách công khai.'
        : 'Chưa gắn được ảnh. Kiểm tra phiên ảnh và phiên bản sách rồi thử lại.' });
    } finally {
      this.patch(id, { commitBusy: false });
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
    if (this.destroyed) return;
    if (http?.error?.error === 'image_capability_changed') this.capability.set(null);
    const message =
      http?.error?.error === 'image_capability_changed'
        ? 'Cấu hình ảnh đã đổi. Thử lại để tải cấu hình mới.'
        : http?.status === 410
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
  metadataAssignments() {
    return this.rows().filter(r=>r.state==='READY' && (r.alt.trim()!==r.storedAlt || r.sourceRef.trim()!==r.storedSource))
      .map(r=>({mediaId:r.mediaId!,alt:r.alt.trim()||null,sourceRef:r.sourceRef.trim()||null}));
  }
  async flushMetadata() {
    if(this.persisted()) return;
    for (const row of this.rows().filter(
      (r) =>
        r.state === 'READY' &&
        (r.alt.trim() !== r.storedAlt || r.sourceRef.trim() !== r.storedSource),
    )) {
      const m = await firstValueFrom(
        this.api.updateTemporaryMetadata(this.sessionId()!,row.mediaId!,row.alt.trim()||null,row.sourceRef.trim()||null),
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
      rows.filter(r => r.file).map((r) => ({
        ...r,
        state: 'queued',
        mediaId: null,
        jobId: undefined,
        sourceJob: undefined,
        sourceRequest: undefined,
        sourceStatus: undefined,
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
    try { sessionStorage.removeItem(this.sessionStorageKey()); } catch { /* Browser storage unavailable. */ }
  }
  private dispose() {
    this.destroyed = true;
    this.stopped.next();
    this.stopped.complete();
    this.rows().forEach((r) => {
      this.revoke(r.preview);
      if (r.previous) this.revoke(r.previous.preview);
    });
    if (this.sessionId() && !this.consumed && !this.localSession)
      this.api.cancelSession(this.sessionId()!).subscribe({ error: () => {} });
  }
}

export function mediaAssignment(mediaId: string, role: MediaRole): MediaAssignment {
  return { mediaId, role };
}
