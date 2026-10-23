import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PageMetadata } from '../../core/page-metadata';

@Component({
  selector: 'app-public-page', imports: [RouterLink],
  template: `<section class="public-intro"><p class="eyebrow">Mẹ Mây · Sách cho bé</p>
    <h1>{{ page['heading'] }}</h1><p class="intro">{{ page['description'] }}</p>
    @if (page['home']) { <a class="button" routerLink="/sach">Xem sách</a> }
    @else { <a routerLink="/">Về trang chủ</a> }
  </section>`,
})
export class PublicPage {
  readonly page = inject(ActivatedRoute).snapshot.data;
  constructor() {
    inject(PageMetadata).set(this.page['title'], this.page['description'], this.page['path']);
  }
}
