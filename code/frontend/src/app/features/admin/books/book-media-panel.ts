import { Component, inject, input, signal } from '@angular/core';
import { BookUploadQueue } from './book-upload-queue';
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
  private dragged = '';
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
  start(event: DragEvent, id: string) {
    if (this.disabled() || this.readonly()) {
      event.preventDefault();
      return;
    }
    this.dragged = id;
    event.dataTransfer?.setData('application/x-memay-photo', id);
  }
  dropCard(event: DragEvent, id: string) {
    if (event.dataTransfer?.files.length) {
      this.dropFiles(event);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (!this.disabled() && !this.readonly()) this.photos.move(this.dragged, id);
    this.dragged = '';
    this.dragging.set(false);
  }
}
