import { afterNextRender, Component, ElementRef, HostListener, inject, Injector, input, output, signal } from '@angular/core';
import { ACTION_LABELS, HeaderAction } from './order-detail-view';

let menus = 0;
const STEP: Record<string, (i: number, n: number) => number> = {
  ArrowDown: (i, n) => (i + 1) % n,
  ArrowUp: (i, n) => (i - 1 + n) % n,
  Home: () => 0,
  End: (_, n) => n - 1,
};

/** The ⋮ menu of the order header: secondary actions valid for the order's state. */
@Component({
  selector: 'app-order-actions-menu',
  templateUrl: './order-actions-menu.html',
  styleUrl: './order-actions-menu.scss',
})
export class OrderActionsMenu {
  readonly orderCode = input.required<string>();
  readonly actions = input.required<HeaderAction[]>();
  readonly disabled = input(false);
  readonly select = output<HeaderAction>();
  readonly open = signal(false);
  readonly labels = ACTION_LABELS;
  readonly menuId = `order-actions-${++menus}`;
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);

  toggle() {
    this.open.update((v) => !v);
    if (this.open()) afterNextRender(() => this.items()[0]?.focus(), { injector: this.injector });
  }
  choose(action: HeaderAction) {
    this.close(false);
    this.select.emit(action);
  }
  keydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close(true);
      return;
    }
    const move = STEP[event.key];
    if (!move) return;
    event.preventDefault();
    const items = this.items();
    items[move(items.indexOf(document.activeElement as HTMLButtonElement), items.length)]?.focus();
  }
  /** Tab or a click elsewhere moves focus out of the open menu: it closes. */
  focusout(event: FocusEvent) {
    if (this.open() && !this.host.nativeElement.contains(event.relatedTarget as Node | null)) this.close(false);
  }
  @HostListener('document:click', ['$event'])
  outside(event: MouseEvent) {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.close(false);
  }
  private close(refocus: boolean) {
    this.open.set(false);
    if (refocus) this.host.nativeElement.querySelector('.actions-menu-toggle')?.focus();
  }
  private items() {
    return Array.from(this.host.nativeElement.querySelectorAll('[role="menuitem"]')) as HTMLButtonElement[];
  }
}
