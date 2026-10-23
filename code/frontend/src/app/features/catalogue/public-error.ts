import { Component, input, output } from '@angular/core';
@Component({
  selector: 'app-public-error',
  template: `<section class="public-error" role="alert">
    <h1>
      {{ status() === 404 ? 'Không tìm thấy sách hoặc bộ sưu tập' : 'Chưa tải được dữ liệu' }}
    </h1>
    <p>
      {{
        status() === 404
          ? 'Nội dung chưa công khai hoặc không còn tồn tại.'
          : 'Vui lòng thử lại. Tiệm chưa xác nhận được dữ liệu lúc này.'
      }}
    </p>
    <button class="secondary" (click)="retry.emit()">Thử lại</button>
    <a href="/sach">Xem tất cả sách</a>
  </section>`,
  styles: `
    .public-error {
      padding: 3rem 0;
      min-height: 50vh;
    }
    h1 {
      font-size: 2rem;
      max-width: none;
    }
  `,
})
export class PublicError {
  readonly status = input(503);
  readonly retry = output<void>();
}
