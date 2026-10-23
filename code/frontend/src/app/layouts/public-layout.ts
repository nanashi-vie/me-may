import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { PublicApi } from '../features/catalogue/public-api';
import { Collection } from '../features/catalogue/public.models';
@Component({
  selector: 'app-public-layout',
  imports: [RouterLink, RouterOutlet, FormsModule],
  template: ` <a class="skip-link" href="#main">Bỏ qua điều hướng</a>
    <div class="utility">Sách ngoại văn đã qua sử dụng cho bé · Ảnh thật từng cuốn</div>
    <header class="site-header wrap">
      <a routerLink="/" class="brand" aria-label="Mẹ Mây — Trang chủ"
        ><img src="/logo.jpg" alt="" width="72" height="72" /><span class="brand-name"
          >Mẹ Mây<small>Sách ngoại văn cho bé</small></span
        ></a
      >
      <form class="header-search" (ngSubmit)="search()" role="search">
        <label class="sr-only" for="site-search">Tìm tên hoặc mã sách</label
        ><input
          id="site-search"
          name="q"
          [(ngModel)]="q"
          placeholder="Tìm tên sách hoặc mã sách…"
          maxlength="200"
        /><button type="submit">Tìm sách</button>
      </form>
      <a class="header-contact" routerLink="/lien-he">Nhắn tiệm ↗</a>
    </header>
    <nav class="public-nav wrap" aria-label="Điều hướng chính">
      <a routerLink="/sach">Tất cả sách</a><a routerLink="/flash-sale">Flash Sale</a
      ><a routerLink="/sach" [queryParams]="{ category: 'BOARD_BOOK' }">Board book</a
      ><a routerLink="/sach" [queryParams]="{ category: 'PICTURE_BOOK' }">Picture book</a>
      <details>
        <summary>Bộ sưu tập</summary>
        <div class="collection-menu">
          @for (c of collections(); track c.slug) {
            <a [routerLink]="['/bo-suu-tap', c.slug]">{{ c.name }}</a>
          } @empty {
            <span>Tiệm đang cập nhật</span>
          }
        </div>
      </details>
      <a routerLink="/cach-mua">Cách mua</a>
    </nav>
    <main id="main" class="wrap"><router-outlet /></main>
    <footer class="wrap">
      <div>
        <a class="brand" routerLink="/">Mẹ Mây</a>
        <p>Mỗi cuốn sách, một lần khám phá mới.</p>
      </div>
      <nav aria-label="Thông tin tiệm">
        <a routerLink="/sach">Khám phá sách</a><a routerLink="/cach-mua">Cách hỏi mua</a
        ><a routerLink="/lien-he">Liên hệ</a><a routerLink="/admin">Quản trị</a>
      </nav>
      <small>Tiệm xác nhận giá và tình trạng khi trao đổi. Website không giữ sách.</small>
    </footer>`,
  styles: `
    .site-header {
      gap: 1.5rem;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 1.8rem;
      line-height: 1.2;
      flex-shrink: 0;
    }
    .brand img {
      object-fit: contain;
    }
    .brand-name {
      display: block;
      font-size: 1.8rem;
      font-weight: 750;
      color: var(--red);
    }
    .brand small {
      display: block;
      font-size: 0.7rem;
      color: var(--muted);
      font-weight: 400;
      margin-top: 0.4rem;
    }
    .header-search {
      display: flex;
      align-items: center;
      flex: 1;
      max-width: 560px;
    }
    .header-search input {
      margin: 0;
      border-radius: 4px 0 0 4px;
      min-width: 0;
    }
    .header-search button {
      width: auto;
      margin: 0;
      white-space: nowrap;
      border-radius: 0 4px 4px 0;
      padding: 0.65rem 1rem;
    }
    .header-contact {
      font-size: 0.85rem;
      white-space: nowrap;
    }
    .public-nav {
      display: flex;
      gap: 1.8rem;
      padding-block: 0.85rem;
      border-bottom: 1px solid var(--line);
      font-size: 0.9rem;
      align-items: center;
    }
    .public-nav a {
      text-decoration: none;
      white-space: nowrap;
    }
    details {
      position: relative;
    }
    summary {
      cursor: pointer;
    }
    .collection-menu {
      position: absolute;
      background: #fff;
      box-shadow: 0 5px 18px #29272420;
      min-width: 220px;
      padding: 1rem;
      z-index: 5;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }
    footer {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    footer p {
      margin: 0.6rem 0;
    }
    footer nav {
      flex-wrap: wrap;
      justify-content: end;
      font-size: 0.85rem;
    }
    footer small {
      grid-column: 1/-1;
      font-size: 0.75rem;
    }
    @media (max-width: 720px) {
      .site-header {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 1rem;
      }
      .header-search {
        grid-column: 1/-1;
        grid-row: 2;
        max-width: none;
      }
      .brand img {
        width: 52px;
        height: 52px;
      }
      .brand {
        font-size: 1.5rem;
      }
      .public-nav {
        gap: 1.2rem;
        flex-wrap: wrap;
        font-size: 0.8rem;
      }
      .collection-menu {
        left: auto;
        right: 0;
      }
      footer {
        grid-template-columns: 1fr;
      }
      footer nav {
        justify-content: start;
      }
      .header-search button {
        font-size: 0.85rem;
      }
    }
  `,
})
export class PublicLayout {
  q = '';
  readonly collections = signal<Collection[]>([]);
  private readonly router = inject(Router);
  constructor() {
    inject(PublicApi)
      .collections()
      .subscribe({ next: (c) => this.collections.set(c), error: () => {} });
  }
  search() {
    void this.router.navigate(['/sach'], {
      queryParams: this.q.trim() ? { q: this.q.trim() } : {},
    });
  }
}
