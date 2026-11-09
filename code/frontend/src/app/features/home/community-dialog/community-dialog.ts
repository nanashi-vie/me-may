import { Component, ElementRef, signal, viewChild } from '@angular/core';

export const COMMUNITY_URL = 'https://zalo.me/g/mwzwwq694';

@Component({
  selector: 'app-community-dialog',
  templateUrl: './community-dialog.html',
  styleUrl: './community-dialog.scss',
})
export class CommunityDialog {
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private returnFocus: HTMLElement | null = null;
  readonly url = COMMUNITY_URL;
  readonly qrSource = signal('');
  readonly qrFailed = signal(false);
  readonly copyMessage = signal('');
  readonly copying = signal(false);

  open(trigger: HTMLElement): boolean {
    const dialog = this.dialog().nativeElement;
    if (typeof dialog.showModal !== 'function') return false;
    if (dialog.open) return true;

    this.returnFocus = trigger;
    this.copyMessage.set('');
    dialog.showModal();
    if (!this.qrSource()) void this.generateQr();
    return true;
  }

  onClose(): void {
    const trigger = this.returnFocus;
    this.returnFocus = null;
    if (trigger?.isConnected) trigger.focus();
  }

  async copy(): Promise<void> {
    if (this.copying()) return;
    const dialog = this.dialog().nativeElement;
    this.copyMessage.set('');
    this.copying.set(true);
    try {
      const clipboard = dialog.ownerDocument.defaultView?.navigator.clipboard;
      if (!clipboard) throw new Error('Clipboard unavailable');
      await clipboard.writeText(this.url);
      if (dialog.open) this.copyMessage.set('Đã sao chép liên kết.');
    } catch {
      if (dialog.open) {
        this.copyMessage.set('Chưa sao chép được. Bạn có thể sao chép địa chỉ từ nút Mở bằng Zalo Web.');
      }
    } finally {
      this.copying.set(false);
    }
  }

  private async generateQr(): Promise<void> {
    this.qrFailed.set(false);
    try {
      const { default: qrcode } = await import('qrcode-generator');
      const qr = qrcode(0, 'M');
      qr.addData(this.url);
      qr.make();
      this.qrSource.set(qr.createDataURL(6));
    } catch {
      this.qrFailed.set(true);
    }
  }
}
