import { afterNextRender, Component, ElementRef, HostListener, inject, Injector, input, output, signal } from '@angular/core';
import { OrderSummary } from '../order-models';

/** The ⋮ menu of one order row. It only offers deleting, and only where deleting can apply. */
@Component({
  selector: 'app-order-row-menu',
  templateUrl: './order-row-menu.html',
  styleUrl: './order-row-menu.scss',
})
export class OrderRowMenu {
  readonly order = input.required<Pick<OrderSummary, 'orderCode' | 'trashable' | 'status'>>();
  readonly remove = output<void>();
  readonly open = signal(false);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);

  /** Deletable now, or a cancelled order whose dialog explains the money still held. */
  offered() {
    const o = this.order();
    return !!o.trashable || o.status === 'CANCELLED';
  }
  toggle() {
    this.open.update((v) => !v);
    if (this.open()) afterNextRender(() => this.item()?.focus(), { injector: this.injector });
  }
  choose() {
    this.close(false);
    this.remove.emit();
  }
  keydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close(true);
    } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      this.item()?.focus();
    }
  }
  @HostListener('document:click', ['$event'])
  outside(event: MouseEvent) {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.close(false);
  }
  private close(refocus: boolean) {
    this.open.set(false);
    if (refocus) this.host.nativeElement.querySelector('.row-menu-toggle')?.focus();
  }
  private item() {
    return this.host.nativeElement.querySelector('[role="menuitem"]') as HTMLButtonElement | null;
  }
}
