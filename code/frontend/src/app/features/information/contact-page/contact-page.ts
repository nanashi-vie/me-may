import { Component, inject, signal } from '@angular/core';
import { PublicApi } from '../../catalogue/public-api';
import { ContactConfig } from '../../catalogue/public.models';
import { PageMetadata } from '../../../core/page-metadata';
import { Breadcrumb, BreadcrumbItem } from '../../../shared/breadcrumb/breadcrumb';

@Component({
  selector: 'app-contact-page',
  imports: [Breadcrumb],
  templateUrl: './contact-page.html',
})
export class ContactPage {
  readonly breadcrumbs: readonly BreadcrumbItem[] = [
    { label: 'Trang chủ', link: '/' },
    { label: 'Liên hệ' },
  ];
  readonly config = signal<ContactConfig | null>(null);
  constructor() {
    inject(PageMetadata).set(
      'Liên hệ | Mẹ Mây',
      'Nhắn tiệm để được tư vấn và xác nhận tình trạng sách.',
      '/lien-he',
    );
    inject(PublicApi)
      .contact()
      .subscribe({ next: (c) => this.config.set(c), error: () => {} });
  }
}
