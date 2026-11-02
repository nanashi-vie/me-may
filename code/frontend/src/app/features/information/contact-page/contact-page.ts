import { Component, inject, signal } from '@angular/core';
import { PublicApi } from '../../catalogue/public-api';
import { ContactConfig } from '../../catalogue/public.models';
import { PageMetadata } from '../../../core/page-metadata';

@Component({
  selector: 'app-contact-page',
  templateUrl: './contact-page.html',
})
export class ContactPage {
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
