import { computed, DestroyRef, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { BookApi } from './book-api';
import { BookUploadQueue } from './book-upload-queue';
import { DriveBatchCreate, DriveBatchItem, DriveBatchMode, DriveBatchSelection, DriveBatchView, MediaRole } from './book.models';
import { driveFileIds } from './drive-source';
import { MEDIA_LABELS, MEDIA_ROLES } from './book-copy';

@Injectable()
export class DriveBatch {
  private readonly api = inject(BookApi);
  private readonly photos = inject(BookUploadQueue);
  private readonly auth = inject(AuthService);
  readonly view = signal<DriveBatchView | null>(null);
  readonly error = signal('');
  readonly loading = signal(false);
  readonly choices = signal<Record<string, {mediaId: string; role: MediaRole | null}>>({});
  readonly active = computed(() => this.loading() || !!this.view() && !['CONFIRMED', 'CANCELLED', 'EXPIRED'].includes(this.view()!.state));
  readonly confirmProblem = computed(() => {
    const view = this.view();
    if (!view || view.state !== 'READY' || this.loading()) return 'Chờ xử lý xong lô ảnh.';
    const selections = this.selected();
    if (!selections.length) return 'Chọn ít nhất một ảnh sẵn sàng để xác nhận.';
    if (new Set(selections.map(row => row.mediaId)).size !== selections.length)
      return 'Mỗi nguồn phải ghép với một ảnh khác nhau.';
    if (view.mode === 'IMPORT') {
      const roles = selections.map(row => row.role);
      if (roles.some(role => !role)) return 'Chọn vai trò cho từng ảnh được dùng.';
      for (const role of roles) {
        if (roles.filter(value => value === role).length > 1)
          return `Vai trò ${MEDIA_LABELS[role!]} đang được chọn cho nhiều ảnh. Hãy đổi vai trò hoặc bỏ chọn ảnh trùng.`;
        if (this.photos.rows().some(row => row.role === role))
          return `Bộ ảnh đã có vai trò ${MEDIA_LABELS[role!]}. Chọn vai trò còn trống hoặc dùng Thay ảnh ở ảnh hiện có.`;
      }
      if (this.photos.rows().length + roles.length > 8) return 'Tối đa 8 ảnh. Bỏ chọn ảnh vượt giới hạn.';
    }
    return '';
  });
  readonly canConfirm = computed(() => !this.confirmProblem());
  private key = '';
  private authEpoch = -1;
  private generation = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private reading = false;
  private attempts = 0;
  private session: string | null = null;
  private restoredMedia: Set<string> | undefined;
  private pendingCreate: DriveBatchCreate | null = null;
  private confirmRequest: {requestKey: string; digest: string; selections: DriveBatchSelection[]} | null = null;
  private readonly stopped = new Subject<void>();
  private readonly visibility = () => {
    this.clearTimer();
    if (document.visibilityState !== 'hidden' && this.needsPoll()) void this.read();
  };

  constructor() {
    effect(() => {
      this.auth.user(); this.auth.epoch(); this.photos.persisted();
      untracked(() => this.syncContext(true));
    });
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.visibility);
    inject(DestroyRef).onDestroy(() => {
      this.reset();
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.visibility);
      this.stopped.complete();
    });
  }
  private syncContext(restore: boolean) {
    const user = this.auth.user();
    const key = user ? 'memay.drive-batch.' + user.id + '.' + (this.photos.persisted()?.id ?? 'new') : '';
    if (key === this.key && this.authEpoch === this.auth.epoch()) return;
    if (this.key) this.forget();
    this.reset();
    this.key = key;
    this.authEpoch = this.auth.epoch();
    if (restore && key) void this.restore();
  }
  private reset() {
    this.generation++;
    this.clearTimer();
    this.stopped.next();
    this.view.set(null); this.error.set(''); this.loading.set(false); this.choices.set({});
    this.reading = false; this.attempts = 0; this.session = null;
    this.pendingCreate = null; this.confirmRequest = null; this.restoredMedia = undefined;
  }
  private remember() {
    if (!this.key) return;
    try { sessionStorage.setItem(this.key, JSON.stringify({id:this.view()?.id, session:this.session, request:this.pendingCreate})); }
    catch { /* Browser session storage is optional. */ }
  }
  private forget() {
    try { if (this.key) sessionStorage.removeItem(this.key); } catch { /* Browser storage unavailable. */ }
  }
  private async restore() {
    const generation = this.generation;
    try {
      const stored = sessionStorage.getItem(this.key);
      if (!stored) return;
      const saved = JSON.parse(stored) as {id?:string;session:string|null;request:DriveBatchCreate|null};
      this.loading.set(true);
      this.session = saved.session;
      if (saved.session) {
        const session = await this.photos.restoreDriveSession(saved.session);
        if (generation !== this.generation) return;
        if (session.state !== 'OPEN') { this.forget(); return; }
        this.restoredMedia = new Set(session.media.map(media=>media.id));
      }
      if (saved.id) {
        this.view.set({id:saved.id} as DriveBatchView);
        await this.read();
      } else if (saved.request) {
        this.pendingCreate = saved.request;
        await this.create(saved.request);
      }
    } catch (error) { if (generation === this.generation) this.fail(error); }
    finally { if (generation === this.generation) this.loading.set(false); }
  }

  async submit(mode: DriveBatchMode, text: string) {
    this.syncContext(false);
    if (this.loading() || this.active()) return;
    this.error.set('');
    const generation = this.generation;
    this.loading.set(true);
    try {
      if (this.pendingCreate) { await this.create(this.pendingCreate); return; }
      const fileIds = driveFileIds(text);
      const context = await this.photos.driveContext(mode);
      if (generation !== this.generation) return;
      const request: DriveBatchCreate = {...context, mode, fileIds, requestKey: crypto.randomUUID()};
      this.session = context.sessionId;
      this.pendingCreate = request;
      this.view.set(null); this.choices.set({}); this.confirmRequest = null;
      this.remember();
      await this.create(request);
    } catch (error) { if (generation === this.generation) this.fail(error); }
    finally { if (generation === this.generation) this.loading.set(false); }
  }
  private async create(request: DriveBatchCreate) {
    const generation = this.generation;
    const view = await firstValueFrom(this.api.createDriveBatch(request).pipe(takeUntil(this.stopped)));
    if (generation !== this.generation) return;
    this.pendingCreate = null;
    this.adopt(view);
    this.remember();
    this.schedule();
  }
  private adopt(view: DriveBatchView) {
    if (this.confirmRequest && view.state !== 'CONFIRMED' && view.digest !== this.confirmRequest.digest)
      this.confirmRequest = null;
    this.view.set(view);
    if (view.state === 'READY' && !Object.keys(this.choices()).length) {
      const freeRoles = MEDIA_ROLES.filter(role => !this.photos.rows().some(row => row.role === role));
      const choices: Record<string,{mediaId:string;role:MediaRole|null}> = {};
      let ordinal = 0;
      for (const item of view.items) {
        if (item.state !== 'READY') continue;
        choices[item.id] = {mediaId:item.candidates.length===1?item.candidates[0]:'',
          role:view.mode==='IMPORT'?(freeRoles[ordinal++]??null):null};
      }
      this.choices.set(choices);
    }
    if (view.state === 'CONFIRMED') this.photos.acceptDriveBatch(view,this.session,this.restoredMedia);
    this.restoredMedia = undefined;
  }
  selectMedia(item: string, mediaId: string) {
    this.choices.update(rows => ({...rows,[item]:{mediaId,role:rows[item]?.role??null}}));
    this.confirmRequest = null;
  }
  selectRole(item: string, role: string) {
    if (!MEDIA_ROLES.includes(role as MediaRole)) return;
    this.choices.update(rows => ({...rows,[item]:{...rows[item],role:role as MediaRole}}));
    this.confirmRequest = null;
  }
  selected(): DriveBatchSelection[] {
    return (this.view()?.items??[]).filter(item=>item.state==='READY' && !!this.choices()[item.id]?.mediaId)
      .map(item=>({itemId:item.id,...this.choices()[item.id]}));
  }
  thumbnail(item: DriveBatchItem) {
    if (this.view()?.mode==='IMPORT') {
      const path = this.photos.rows().find(row=>row.mediaId===item.mediaId)?.preview ?? item.contentPath;
      return path ? path + (path.includes('?')?'&':'?') + 'size=320' : '';
    }
    const media = this.choices()[item.id]?.mediaId;
    return this.photos.rows().find(row=>row.mediaId===media)?.preview ?? '';
  }
  targetLabel(media: string) {
    const role = this.photos.rows().find(row=>row.mediaId===media)?.role;
    return role ? MEDIA_LABELS[role] : media;
  }
  async confirm() {
    if (!this.canConfirm()) return;
    const view = this.view()!, generation = this.generation;
    const selections = this.selected();
    this.confirmRequest ??= {requestKey:crypto.randomUUID(),digest:view.digest,selections};
    this.loading.set(true); this.error.set('');
    try {
      const result = await firstValueFrom(this.api.confirmDriveBatch(view.id,this.confirmRequest).pipe(takeUntil(this.stopped)));
      if (generation !== this.generation) return;
      this.adopt(result); this.remember();
    } catch (error) { if (generation===this.generation) this.fail(error); }
    finally { if (generation===this.generation) this.loading.set(false); }
  }
  async cancel() {
    if (!this.view() || this.loading()) return;
    const generation = this.generation;
    this.loading.set(true);
    try {
      await firstValueFrom(this.api.cancelDriveBatch(this.view()!.id).pipe(takeUntil(this.stopped)));
      if (generation!==this.generation) return;
      this.forget(); this.reset();
    } catch (error) { if (generation===this.generation) this.fail(error); }
    finally { if (generation===this.generation) this.loading.set(false); }
  }
  async read() {
    if (!this.view()?.id || this.reading) return;
    const generation = this.generation;
    this.reading = true;
    try {
      const view = await firstValueFrom(this.api.driveBatch(this.view()!.id).pipe(takeUntil(this.stopped)));
      if (generation!==this.generation) return;
      this.error.set(''); this.adopt(view);
    } catch (error) { if (generation===this.generation) this.fail(error); }
    finally {
      if (generation===this.generation) {this.reading=false;this.schedule();}
    }
  }
  private needsPoll() { return !!this.view() && ['PENDING','PROCESSING'].includes(this.view()!.state); }
  private clearTimer() { if (this.timer) clearTimeout(this.timer); this.timer=null; }
  private schedule() {
    this.clearTimer();
    if (!this.needsPoll() || typeof document!=='undefined' && document.visibilityState==='hidden') return;
    const delay = this.attempts===0?1000:this.attempts===1?2000:5000;
    this.attempts++;
    this.timer=setTimeout(()=>void this.read(),delay);
  }
  private fail(error: unknown) {
    if (error instanceof HttpErrorResponse && error.status >= 400 && error.status < 500
        && ![408,429].includes(error.status)) { this.pendingCreate = null; this.remember(); }
    if (error instanceof HttpErrorResponse && [401,403,404,410].includes(error.status)) {
      this.forget();
      this.clearTimer();
      this.pendingCreate = null;
      this.view.update(view=>view?{...view,state:error.status===410?'EXPIRED':'CANCELLED'}:null);
    }
    const code = error instanceof HttpErrorResponse ? error.error?.error : null;
    const messages: Record<string,string> = {
      media_limit:'Tối đa 8 ảnh, gồm cả ảnh đang xử lý.',
      SOURCE_CHANGED:'Nguồn Drive đã thay đổi. Tạo lô mới để kiểm tra lại.',
      drive_batch_conflict:'Sách hoặc nguồn đã thay đổi. Làm mới kết quả trước khi xác nhận.',
      drive_batch_expired:'Lô nhập đã hết hạn. Hãy nhập lại các link.',
    };
    this.error.set(messages[code] ?? (error instanceof HttpErrorResponse?'Không xử lý được lô Drive. Thử làm mới tiến độ.':
      error instanceof Error?error.message:'Không xử lý được lô Drive.'));
  }
}
