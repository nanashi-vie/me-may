import { Component, ElementRef, ViewChild, input, signal, inject, output } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ContactConfig, PublicBook } from './public.models';
import { enquiryText, effectiveBook } from './catalogue-state';
@Component({
  selector: 'app-contact-dialog',
  template: `<dialog #dialog (close)="closed.emit()" aria-labelledby="contact-title">
    <h2 id="contact-title">
      {{ book().availability === 'SOLD' ? 'Tư vấn sách tương đương' : 'Liên hệ tiệm' }}
    </h2>
    <p>Sao chép nội dung, mở Zalo rồi dán và gửi cho tiệm. Liên hệ không giữ sách.</p>
    <label
      >Nội dung hỏi sách<textarea
        readonly
        rows="7"
        [value]="text()"
        (focus)="select($event)"
      ></textarea>
    </label>
    <p role="status">{{ message() }}</p>
    <div class="actions">
      <button (click)="copy()">Sao chép nội dung</button>
      @if (config()?.hotlineUrl) {
        <a
          class="button secondary"
          [href]="config()!.hotlineUrl"
          target="_blank"
          rel="noopener noreferrer"
          >Mở Zalo</a
        >
      } @else {
        <span>Zalo hotline chưa được cấu hình.</span>
      }
      <button class="secondary" (click)="dialog.close()">Đóng</button>
    </div>
  </dialog>`,
  styles: `
    dialog {
      width: min(560px, calc(100% - 32px));
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 1.5rem;
    }
    dialog::backdrop {
      background: #29272480;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.6rem;
      align-items: center;
    }
    textarea {
      font-size: 0.9rem;
    }
  `,
})
export class ContactDialog {
  @ViewChild('dialog') dialog!: ElementRef<HTMLDialogElement>;
  readonly book = input.required<PublicBook>();
  readonly config = input<ContactConfig | null>(null);
  readonly url = input.required<string>();
  readonly closed = output<void>();
  readonly message = signal('');
  private readonly document = inject(DOCUMENT);
  open() {
    this.message.set('');
    this.dialog.nativeElement.showModal();
  }
  text() {
    return enquiryText(effectiveBook(this.book(), Date.now()), this.url());
  }
  select(event: Event) {
    (event.target as HTMLTextAreaElement).select();
  }
  async copy() {
    try {
      const clipboard = this.document.defaultView?.navigator.clipboard;
      if (!clipboard) throw new Error();
      await clipboard.writeText(this.text());
      this.message.set('Đã sao chép. Mở Zalo, dán và gửi cho tiệm.');
    } catch {
      this.message.set('Chưa sao chép tự động được. Chọn nội dung trong ô để sao chép thủ công.');
    }
  }
}
