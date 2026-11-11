import { Component, computed, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { BookUploadQueue, UploadItem } from '../book-upload-queue';
import { DriveBatch } from '../drive-batch';
import { MEDIA_ROLES, MEDIA_LABELS } from '../book-copy';
@Component({
  selector: 'app-book-media-panel',
  providers: [DriveBatch],
  templateUrl: './book-media-panel.html',
  styleUrl: './book-media-panel.scss',
})
export class BookMediaPanel {
  readonly photos = inject(BookUploadQueue);
  readonly drive = inject(DriveBatch);
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly writeLocked = computed(() => this.disabled() || this.photos.attaching());
  readonly driveTotal = computed(() => this.drive.view()?.items?.length ?? 0);
  readonly driveCompleted = computed(() => {
    const batch = this.drive.view();
    return batch?.state === 'CONFIRMED' ? batch.selections.length
      : batch?.items?.filter(item => ['READY','FAILED','CANCELLED'].includes(item.state)).length ?? 0;
  });
  readonly roles = MEDIA_ROLES;
  readonly labels = MEDIA_LABELS;
  readonly dragging = signal(false);
  readonly viewer = viewChild<ElementRef<HTMLDialogElement>>('viewer');
  readonly selectedPhoto = signal<{src:string;alt:string}|null>(null);
  readonly viewerFailed = signal(false);
  readonly previewLoaded=signal<Record<string,boolean>>({});
  readonly viewerLoaded=signal(false);
  readonly failedPreviews = signal<Record<string,boolean>>({});
  readonly previewRetries = signal<Record<string,number>>({});
  readonly sourceInputs = signal<Partial<Record<string, string>>>({});
  readonly batchInput = signal('');
  readonly sourceTargets = computed(() => this.photos.sorted()
    .filter(row => row.provider === 'LOCAL' && row.state === 'READY' && row.mediaId));
  readonly acceptedImages = computed(() => this.photos.capability()?.formats.join(',') || 'image/jpeg,image/png,image/webp');

  setSource(id: string, value: string) {
    this.sourceInputs.update(inputs => ({ ...inputs, [id]: value }));
  }
  setBatch(value: string) { this.batchInput.set(value); }
  async importSources() { if (!this.writeLocked() && !this.readonly()) await this.drive.submit('IMPORT',this.batchInput()); }
  async matchSources() { if (!this.writeLocked() && !this.readonly()) await this.drive.submit('MATCH',this.batchInput()); }
  sourceState(state: string) {
    const labels: Record<string,string> = {PENDING:'Đang chờ',DOWNLOADING:'Đang tải từ Drive',
      PROCESSING:'Đang xử lý',ENCODING:'Đang tạo bộ ảnh',READY:'Sẵn sàng',FAILED:'Có lỗi',
      CONFIRMED:'Đã xác nhận',CANCELLED:'Đã hủy',EXPIRED:'Đã hết hạn'};
    return labels[state] ?? state;
  }
  sourceError(code: string) {
    const labels: Record<string,string> = {ACCESS_ERROR:'Không đọc được nguồn. Kiểm tra quyền chia sẻ.',
      SOURCE_MISSING:'Không tìm thấy nguồn Drive.',SOURCE_CHANGED:'Nguồn Drive đã thay đổi.',
      source_hash_mismatch:'Không có ảnh đã tải nào khớp nguồn này.',
      invalid_image:'File ảnh không hợp lệ.',lease_expired:'Hết thời gian xử lý.'};
    return labels[code] ?? 'Không xử lý được nguồn ảnh này.';
  }
  private opener:HTMLElement|null=null;
  preview(row:UploadItem) {
    return row.state==='error' && row.previous ? row.previous.preview:row.preview;
  }
  thumbnail(row:UploadItem) {
    const src=this.preview(row);
    if(!src.startsWith('/api/v1/admin/'))return src;
    return src+(src.includes('?')?'&':'?')+'size=320&previewRetry='+(this.previewRetries()[row.id]??0);
  }
  openPhoto(row:UploadItem,event:Event) {
    this.opener=event.currentTarget as HTMLElement;
    this.viewerFailed.set(false);this.viewerLoaded.set(false);
    this.selectedPhoto.set({src:this.preview(row),alt:row.alt||this.labels[row.role]});
    this.viewer()?.nativeElement.showModal();
  }
  closePhoto() {
    this.viewer()?.nativeElement.close();
    this.selectedPhoto.set(null);
    this.opener?.focus();
    this.opener=null;
  }
  previewReady(id:string){this.previewLoaded.update(values=>({...values,[id]:true}));}
  retryPreview(row:UploadItem) {
    this.previewLoaded.update(values=>({...values,[row.id]:false}));
    this.failedPreviews.update(values=>({...values,[row.id]:false}));
    this.previewRetries.update(values=>({...values,[row.id]:(values[row.id]??0)+1}));
  }
  retryLargePhoto() {
    const photo=this.selectedPhoto();if(!photo)return;
    const src=photo.src;
    this.viewerFailed.set(false);this.viewerLoaded.set(false);
    this.selectedPhoto.set({...photo,src:src.startsWith('/api/v1/admin/')?src+(src.includes('?')?'&':'?')+'previewRetry='+Date.now():src});
  }
  previewFailed(id:string) {this.failedPreviews.update(values=>({...values,[id]:true}));}
  select(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!this.writeLocked() && !this.readonly()) this.photos.add(Array.from(input.files ?? []));
    input.value = '';
  }
  replace(id: string, event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0] && !this.writeLocked() && !this.readonly())
      this.photos.replace(id, input.files[0]);
    input.value = '';
  }
  over(event: DragEvent) {
    event.preventDefault();
    if (!this.writeLocked() && !this.readonly()) this.dragging.set(true);
  }
  dropFiles(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragging.set(false);
    if (!this.writeLocked() && !this.readonly())
      this.photos.add(Array.from(event.dataTransfer?.files ?? []));
  }
}
