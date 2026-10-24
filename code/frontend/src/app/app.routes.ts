import { CanDeactivateFn, Routes, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './core/auth/auth.service';
import { requireAdmin } from './core/auth/auth.guard';

const pendingBookChanges: CanDeactivateFn<{ canLeave(): boolean }> = (component) =>
  component.canLeave();

export const routes: Routes = [
  {
    path: 'admin/dang-nhap',
    title: 'Đăng nhập quản trị | Mẹ Mây',
    loadComponent: () => import('./features/admin/login').then((m) => m.Login),
  },
  {
    path: 'admin',
    canActivate: [requireAdmin],
    loadComponent: () => import('./layouts/admin-layout').then((m) => m.AdminLayout),
    children: [
      {
        path: 'flash-sale',
        canDeactivate: [pendingBookChanges],
        canActivate: [
          () =>
            inject(AuthService).user()?.role === 'OWNER' ||
            inject(Router).createUrlTree(['/admin/sach']),
        ],
        loadComponent: () =>
          import('./features/admin/flash-sale/flash-sale').then((m) => m.FlashSaleEditor),
      },
      {
        path: 'bo-suu-tap',
        title: 'Bộ sưu tập | Mẹ Mây',
        canActivate: [
          () =>
            inject(AuthService).user()?.role === 'OWNER' ||
            inject(Router).createUrlTree(['/admin/sach']),
        ],
        canDeactivate: [pendingBookChanges],
        loadComponent: () =>
          import('./features/admin/collections/collection-list').then((m) => m.CollectionList),
      },
      {
        path: 'sach',
        title: 'Quản lý sách | Mẹ Mây',
        loadComponent: () => import('./features/admin/books/book-list').then((m) => m.BookList),
      },
      {
        path: 'sach/moi',
        title: 'Thêm sách | Mẹ Mây',
        canDeactivate: [pendingBookChanges],
        loadComponent: () => import('./features/admin/books/book-editor').then((m) => m.BookEditor),
      },
      {
        path: 'sach/:id/xem-truoc',
        title: 'Xem trước sách | Mẹ Mây',
        loadComponent: () =>
          import('./features/admin/books/book-preview').then((m) => m.BookPreview),
      },
      {
        path: 'sach/:id',
        title: 'Chỉnh sửa sách | Mẹ Mây',
        canDeactivate: [pendingBookChanges],
        loadComponent: () => import('./features/admin/books/book-editor').then((m) => m.BookEditor),
      },
      {
        path: '',
        pathMatch: 'full',
        title: 'Quản trị | Mẹ Mây',
        loadComponent: () => import('./features/admin/overview').then((m) => m.Overview),
      },
    ],
  },
  {
    path: '',
    loadComponent: () => import('./layouts/public-layout').then((m) => m.PublicLayout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./features/home/home-page').then((m) => m.HomePage),
      },
      {
        path: 'sach',
        loadComponent: () =>
          import('./features/catalogue/catalogue-page').then((m) => m.CataloguePage),
      },
      {
        path: 'sach/:slug',
        loadComponent: () => import('./features/catalogue/book-detail').then((m) => m.BookDetail),
      },
      {
        path: 'bo-suu-tap/:slug',
        loadComponent: () =>
          import('./features/catalogue/catalogue-page').then((m) => m.CataloguePage),
      },
      {
        path: 'flash-sale',
        loadComponent: () =>
          import('./features/catalogue/flash-sale-page').then((m) => m.FlashSalePage),
      },
      {
        path: 'lien-he',
        loadComponent: () =>
          import('./features/information/contact-page').then((m) => m.ContactPage),
      },
      {
        path: 'quan-tam',
        loadComponent: () =>
          import('./features/wishlist/wishlist-page').then((m) => m.WishlistPage),
      },
      {
        path: 'cach-mua',
        loadComponent: () => import('./features/information/public-page').then((m) => m.PublicPage),
        data: {
          title: 'Cách hỏi mua sách | Mẹ Mây',
          heading: 'Chọn sách và nhắn tiệm',
          description:
            'Ghi lại mã và đường dẫn cuốn sách bạn quan tâm. Tiệm sẽ xác nhận tình trạng và hướng dẫn chốt mua qua Facebook hoặc Zalo.',
          path: '/cach-mua',
        },
      },
      {
        path: '**',
        loadComponent: () => import('./features/information/not-found').then((m) => m.NotFound),
      },
    ],
  },
];
