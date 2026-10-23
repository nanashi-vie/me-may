import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Injectable({ providedIn: 'root' })
export class PageMetadata {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  admin(title: string) {
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow, nosnippet' });
    for (const selector of [
      'name="description"',
      'property="og:title"',
      'property="og:description"',
      'property="og:type"',
    ])
      this.meta.removeTag(selector);
    this.document.querySelector('link[rel="canonical"]')?.remove();
  }

  set(title: string, description: string, path: string) {
    this.meta.removeTag('name="robots"');
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    let canonical = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = this.document.createElement('link');
      canonical.rel = 'canonical';
      this.document.head.appendChild(canonical);
    }
    // Local foundation origin; replace through deployment configuration before staging.
    canonical.href = `http://localhost:4200${path}`;
  }
}
