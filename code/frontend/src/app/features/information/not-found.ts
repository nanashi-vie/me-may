import { Component, RESPONSE_INIT, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-not-found', imports: [RouterLink],
  template: `<section class="public-intro"><h1>Không tìm thấy trang</h1><p>Đường dẫn này không còn hoặc chưa tồn tại.</p><a routerLink="/">Về trang chủ</a></section>`,
})
export class NotFound {
  constructor() {
    const response = inject(RESPONSE_INIT, {optional: true});
    if (response) response.status = 404;
    inject(Title).setTitle('Không tìm thấy trang | Mẹ Mây');
    inject(Meta).updateTag({name: 'robots', content: 'noindex'});
  }
}
