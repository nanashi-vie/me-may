import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-public-layout', imports: [RouterLink, RouterOutlet],
  template: `
    <a class="skip-link" href="#main">Bỏ qua điều hướng</a>
    <div class="utility">Sách ngoại văn đã qua sử dụng cho bé</div>
    <header class="site-header wrap">
      <a routerLink="/" class="brand" aria-label="Mẹ Mây — Trang chủ">Mẹ Mây<span>Sách ngoại văn cho bé</span></a>
      <nav aria-label="Điều hướng chính"><a routerLink="/sach">Sách</a><a routerLink="/cach-mua">Cách mua</a><a routerLink="/admin">Quản trị</a></nav>
    </header>
    <main id="main" class="wrap"><router-outlet /></main>
    <footer class="wrap">Mẹ Mây · Mỗi cuốn sách, một lần khám phá mới.</footer>
  `,
})
export class PublicLayout {}
