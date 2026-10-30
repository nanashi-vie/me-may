import { PublicClock } from './public-clock';
import {
  Component,
  ElementRef,
  ViewChild,
  input,
  signal,
  inject,
  output,
  effect,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ContactConfig, PublicBook, PublicVariant } from './public.models';
import { enquiryText, effectiveBook } from './catalogue-state';
@Component({
  selector: 'app-contact-dialog',
  template: `<dialog #dialog (close)="onClose()" aria-labelledby="contact-title">
    <h2 id="contact-title">
      {{
        preparedText() !== null
          ? 'Hỏi mua các cuốn đã chọn'
          : book()?.availability === 'SOLD'
            ? 'Tư vấn sách tương đương'
            : 'Liên hệ tiệm'
      }}
    </h2>
    <p>Sao chép nội dung, mở Zalo rồi dán và gửi cho tiệm. Liên hệ không giữ sách.</p>
    @if (busy() || checking()) {
      <p role="status">Đang xác nhận lại giá và tình trạng…</p>
    }
    <p role="status">{{ notice() }}</p>
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
      <button
        [disabled]="busy() || checking() || (!text() && verified() === null)"
        (click)="copy()"
      >
        Sao chép nội dung
      </button>
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
  readonly variant = input<PublicVariant|null>(null);
  readonly book = input<PublicBook | null>(null);
  readonly preparedText = input<string | null>(null);
  readonly verifyText = input<(() => Promise<string>) | null>(null);
  readonly checking = signal(false);
  readonly verified = signal<string | null>(null);
  readonly busy = input(false);
  readonly notice = input('');
  readonly config = input<ContactConfig | null>(null);
  readonly url = input('');
  readonly closed = output<void>();
  readonly message = signal('');
  private readonly document = inject(DOCUMENT);
  private returnFocus: HTMLElement | null = null;
  constructor() {
    effect(() => {
      const text = this.preparedText();
      this.busy();
      this.book();
      this.variant();
      this.verified.set(null);
      if (text !== null) this.message.set('');
    });
  }
  open(returnFocus?: HTMLElement | null) {
    this.returnFocus = returnFocus ?? (this.document.activeElement as HTMLElement | null);
    this.message.set('');
    this.verified.set(null);
    this.dialog.nativeElement.showModal();
  }
  onClose() {
    this.closed.emit();
    if (this.returnFocus?.isConnected && !this.returnFocus.matches(':disabled'))
      this.returnFocus.focus();
  }
  private readonly clock = inject(PublicClock);
  text() {
    if (this.busy() || this.checking()) return '';
    if (this.verified() !== null) return this.verified()!;
    if (this.preparedText() !== null) return this.preparedText()!;
    const book = this.book();
    if (book?.availability === 'AVAILABLE' && book.variants.length > 1 && !this.variant()?.available)
      return '';
    return book ? enquiryText(effectiveBook(book, this.clock.now() || Date.now()), this.url(), this.variant() ?? undefined) : '';
  }
  select(event: Event) {
    (event.target as HTMLTextAreaElement).select();
  }
  async copy() {
    if (this.busy() || this.checking()) return;
    let text = this.text();
    const verify = this.verifyText();
    if (verify) {
      this.checking.set(true);
      try {
        text = await verify();
        this.verified.set(text);
        this.message.set(text ? '' : 'Các cuốn đã chọn không còn sẵn hoặc không còn hiển thị.');
      } catch {
        this.verified.set('');
        this.message.set('Chưa xác nhận được giá và tình trạng. Thử sao chép lại khi có mạng.');
        return;
      } finally {
        this.checking.set(false);
      }
    }
    if (!text || this.busy()) return;
    try {
      const clipboard = this.document.defaultView?.navigator.clipboard;
      if (!clipboard) throw new Error();
      await clipboard.writeText(text);
      if (text === this.text()) this.message.set('Đã sao chép. Mở Zalo, dán và gửi cho tiệm.');
    } catch {
      if (text === this.text())
        this.message.set('Chưa sao chép tự động được. Chọn nội dung trong ô để sao chép thủ công.');
    }
  }
}
