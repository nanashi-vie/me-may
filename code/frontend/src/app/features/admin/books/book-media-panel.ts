import { Component, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { BookUploadQueue, UploadItem } from './book-upload-queue';
import { MEDIA_ROLES, MEDIA_LABELS } from './book-copy';
@Component({
  selector: 'app-book-media-panel',
  templateUrl: './book-media-panel.html',
  styleUrl: './book-media-panel.scss',
})
export class BookMediaPanel {
  readonly photos = inject(BookUploadQueue);
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly roles = MEDIA_ROLES;
  readonly labels = MEDIA_LABELS;
  readonly dragging = signal(false);
  readonly viewer = viewChild<ElementRef<HTMLDialogElement>>('viewer');
  readonly selectedPhoto = signal<{src:string;alt:string}|null>(null);
  readonly viewerFailed = signal(false);
  readonly failedPreviews = signal<Record<string,boolean>>({});
  readonly previewRetries = signal<Record<string,number>>({});
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
    this.viewerFailed.set(false);
    this.selectedPhoto.set({src:this.preview(row),alt:row.alt||this.labels[row.role]});
    this.viewer()?.nativeElement.showModal();
  }
  closePhoto() {
    this.viewer()?.nativeElement.close();
    this.selectedPhoto.set(null);
    this.opener?.focus();
    this.opener=null;
  }
  retryPreview(row:UploadItem) {
    this.failedPreviews.update(values=>({...values,[row.id]:false}));
    this.previewRetries.update(values=>({...values,[row.id]:(values[row.id]??0)+1}));
  }
  retryLargePhoto() {
    const photo=this.selectedPhoto();if(!photo)return;
    const src=photo.src;
    this.viewerFailed.set(false);
    this.selectedPhoto.set({...photo,src:src.startsWith('/api/v1/admin/')?src+(src.includes('?')?'&':'?')+'previewRetry='+Date.now():src});
  }
  previewFailed(id:string) {this.failedPreviews.update(values=>({...values,[id]:true}));}
  select(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!this.disabled() && !this.readonly()) this.photos.add(Array.from(input.files ?? []));
    input.value = '';
  }
  replace(id: string, event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0] && !this.disabled() && !this.readonly())
      this.photos.replace(id, input.files[0]);
    input.value = '';
  }
  over(event: DragEvent) {
    event.preventDefault();
    if (!this.disabled() && !this.readonly()) this.dragging.set(true);
  }
  dropFiles(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragging.set(false);
    if (!this.disabled() && !this.readonly())
      this.photos.add(Array.from(event.dataTransfer?.files ?? []));
  }
}
