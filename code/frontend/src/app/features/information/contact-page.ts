import { Component, inject, signal } from '@angular/core';
import { PublicApi } from '../catalogue/public-api';
import { ContactConfig } from '../catalogue/public.models';
import { PageMetadata } from '../../core/page-metadata';
@Component({
  selector: 'app-contact-page',
  template: `<section class="public-intro">
    <p class="eyebrow">Tiệm sách Mẹ Mây</p>
    <h1>Nhắn tiệm nhé.</h1>
    <p class="intro">
      Tiệm tư vấn sách ngoại văn phù hợp và xác nhận tình trạng từng cuốn khi bạn hỏi mua.
    </p>
    @if (config()?.hotlineUrl) {
      <p>
        <a class="button" [href]="config()!.hotlineUrl" target="_blank" rel="noopener noreferrer"
          >Liên hệ Zalo</a
        >
      </p>
    } @else {
      <p>Zalo hotline đang được cập nhật.</p>
    }
    @if (config()?.groupUrl) {
      <p>
        <a [href]="config()!.groupUrl" target="_blank" rel="noopener noreferrer"
          >Tham gia cộng đồng để nhận thông tin ưu đãi ↗</a
        >
      </p>
    } @else {
      <p>Link cộng đồng Zalo đang được cập nhật.</p>
    }
    <p class="muted">Website không giữ sách và không tự gửi tin nhắn.</p>
  </section>`,
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
