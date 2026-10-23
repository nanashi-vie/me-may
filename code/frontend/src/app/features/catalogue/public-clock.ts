import { Injectable, afterNextRender, inject, DestroyRef, signal } from '@angular/core';
@Injectable({ providedIn: 'root' })
export class PublicClock {
  readonly now = signal(0);
  private offset = 0;
  constructor() {
    afterNextRender(() => {
      this.now.set(Date.now() + this.offset);
      const id = setInterval(() => this.now.set(Date.now() + this.offset), 1000);
      this.destroy.onDestroy(() => clearInterval(id));
    });
  }
  private readonly destroy = inject(DestroyRef);
  align(serverNow: string) {
    const timestamp = Date.parse(serverNow);
    if (!Number.isFinite(timestamp)) return;
    this.offset = timestamp - Date.now();
    this.now.set(timestamp);
  }
}
