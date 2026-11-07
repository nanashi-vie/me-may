import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, ViewChild, inject, output } from '@angular/core';

@Component({
  selector: 'app-shipping-promo-dialog',
  templateUrl: './shipping-promo-dialog.html',
  styleUrl: './shipping-promo-dialog.scss',
})
export class ShippingPromoDialog {
  @ViewChild('dialog') dialog!: ElementRef<HTMLDialogElement>;
  readonly closed = output<void>();

  private readonly document = inject(DOCUMENT);
  private returnFocus: HTMLElement | null = null;

  open(returnFocus?: HTMLElement | null): void {
    this.returnFocus = returnFocus ?? (this.document.activeElement as HTMLElement | null);
    if (typeof this.dialog?.nativeElement?.showModal === 'function') {
      this.dialog.nativeElement.showModal();
    } else if (this.dialog?.nativeElement) {
      this.dialog.nativeElement.setAttribute('open', '');
    }
  }

  close(): void {
    if (typeof this.dialog?.nativeElement?.close === 'function') {
      this.dialog.nativeElement.close();
    } else if (this.dialog?.nativeElement) {
      this.dialog.nativeElement.removeAttribute('open');
      this.onClose();
    }
  }

  onClose(): void {
    this.closed.emit();
    if (this.returnFocus?.isConnected && !this.returnFocus.matches(':disabled')) {
      this.returnFocus.focus();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialog.nativeElement) {
      this.close();
    }
  }
}

