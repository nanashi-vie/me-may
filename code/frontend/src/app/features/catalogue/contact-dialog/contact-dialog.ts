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
  @ViewChild('enquiry') enquiry!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('dialog') dialog!: ElementRef<HTMLDialogElement>;
  readonly book = input<PublicBook | null>(null);
  readonly preparedText = input<string | null>(null);
  readonly verifyText = input<(() => Promise<string>) | null>(null);
  readonly checking = signal(false);
  readonly copying = signal(false);
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
    const area=event.target as HTMLTextAreaElement;
    area.select();area.setSelectionRange(0,area.value.length);
  }
  private async checkedText() {
    let text=this.text();
    const verify=this.verifyText();
    if(verify) {
      this.checking.set(true);
      try {
        text=await verify();
        this.verified.set(text);
        this.message.set(text?'':'Các cuốn đã chọn không còn sẵn hoặc không còn hiển thị.');
      } catch {
        this.verified.set('');
        this.message.set('Chưa xác nhận được giá và tình trạng. Thử sao chép lại khi có mạng.');
        return '';
      } finally {this.checking.set(false);}
    }
    return this.busy()?'':text;
  }
  async copy() {
    if(this.busy() || this.checking() || this.copying()) return;
    this.copying.set(true);this.message.set('');
    const view=this.document.defaultView;
    const clipboard=view?.navigator.clipboard;
    const Item=view?.ClipboardItem;
    const ready=this.checkedText();
    let text='';
    try {
      if(this.verifyText() && clipboard?.write && Item) {
        // Safari requires write() during the tap; resolve the verified payload later.
        const data=ready.then(value=>{
          if(!value || this.busy() || value!==this.text()) throw new Error('Enquiry changed');
          return new Blob([value],{type:'text/plain'});
        });
        // A synchronous API/constructor rejection must also consume the payload rejection.
        void data.catch(()=>{});
        await clipboard.write([new Item({'text/plain':data})]);
        text=await ready;
      } else {
        text=await ready;
        if(!text) return;
        if(!clipboard) throw new Error('Clipboard unavailable');
        await clipboard.writeText(text);
      }
      if(text===this.text()) this.message.set('Đã sao chép. Mở Zalo, dán và gửi cho tiệm.');
    } catch {
      text=await ready;
      if(!text || text!==this.text()) return;
      const area=this.enquiry.nativeElement;
      area.value=text;area.focus({preventScroll:true});
      area.select();area.setSelectionRange(0,text.length);
      let copied=false;
      try {copied=typeof this.document.execCommand==='function' && this.document.execCommand('copy');} catch { /* Keep the selected text available. */ }
      this.message.set(copied?'Đã sao chép. Mở Zalo, dán và gửi cho tiệm.':
        'Chưa sao chép tự động được. Nội dung đã được chọn để sao chép thủ công; nhấn giữ trong ô và chọn Sao chép.');
    } finally {this.copying.set(false);}
  }
}
