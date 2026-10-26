import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { PUBLIC_SITE_ORIGIN } from '../features/catalogue/public-api';

@Injectable({ providedIn: 'root' })
export class PageMetadata {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  private readonly origin = inject(PUBLIC_SITE_ORIGIN);

  unavailable(status: number) {
    this.admin(status === 404 ? 'Không tìm thấy | Mẹ Mây' : 'Chưa tải được dữ liệu | Mẹ Mây');
  }

  admin(title: string) {
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow, nosnippet' });
    for (const selector of [
      'name="description"',
      'property="og:title"',
      'property="og:description"',
      'property="og:type"',
      'property="og:image"',
      'property="og:url"',
    ])
      this.meta.removeTag(selector);
    this.document.querySelector('link[rel="canonical"]')?.remove();
  }

  set(title: string, description: string, path: string, image?: string) {
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
    canonical.href = this.origin + path;
    this.meta.updateTag({ property: 'og:url', content: canonical.href });
    if (image) this.meta.updateTag({ property: 'og:image', content: this.origin + image });
    else this.meta.removeTag('property="og:image"');
  }
}
