import { Component, computed, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { NavigationStart, Router, RouterOutlet } from '@angular/router';
import { BackendStatus } from './core/outage/backend-status';
import { OutagePage } from './core/outage/outage-page';
import { AdminOutageBanner } from './core/outage/admin-outage-banner';

const isAdmin = (url: string) => /^\/admin(\/|$|\?)/.test(url);

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, OutagePage, AdminOutageBanner],
  templateUrl: './app.html',
})
export class App {
  private readonly outage = inject(BackendStatus).outage;
  // NavigationStart fires before guards, so a failing admin guard keeps the banner view.
  private readonly admin = signal(isAdmin(inject(DOCUMENT).location?.pathname ?? '/'));
  protected readonly publicOutage = computed(() => !!this.outage() && !this.admin());
  protected readonly adminView = this.admin.asReadonly();

  constructor() {
    inject(Router).events.subscribe((event) => {
      if (event instanceof NavigationStart) this.admin.set(isAdmin(event.url));
    });
  }
}
