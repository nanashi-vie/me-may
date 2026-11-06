import { DOCUMENT } from '@angular/common';
import {
  Component,
  ElementRef,
  ViewChild,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { effectiveBook, enquiryText } from '../catalogue-state';
import { PublicClock } from '../public-clock';
import { ContactConfig, PublicBook } from '../public.models';

@Component({
  selector: 'app-contact-dialog',
  templateUrl: './contact-dialog.html',
  styleUrl: './contact-dialog.scss',
})
export class ContactDialog {
  @ViewChild('dialog') dialog!: ElementRef<HTMLDialogElement>;
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
    return book
      ? enquiryText(
          effectiveBook(book, this.clock.now() || Date.now()),
          this.url(),
        )
      : '';
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
