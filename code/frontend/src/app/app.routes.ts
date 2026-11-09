import { CanDeactivateFn, Routes, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './core/auth/auth.service';
import { requireAdmin } from './core/auth/auth.guard';

const pendingBookChanges: CanDeactivateFn<{ canLeave(): boolean }> = (component) =>
  component.canLeave();

const requireOwner = () =>
  inject(AuthService).user()?.role === 'OWNER' || inject(Router).createUrlTree(['/admin/sach']);

export const routes: Routes = [
  {
    path: 'admin/dang-nhap',
    title: 'Đăng nhập quản trị | Mẹ Mây',
    loadComponent: () => import('./features/admin/login/login').then((m) => m.Login),
  },
  {
    path: 'admin',
    canActivate: [requireAdmin],
    loadComponent: () => import('./layouts/admin-layout/admin-layout').then((m) => m.AdminLayout),
    children: [
      {
        path: 'nhan-vien',
        title: 'Nhân viên | Mẹ Mây',
        canActivate: [requireOwner],
        loadComponent: () => import('./features/admin/attendance/employees').then((m) => m.Employees),
      },
      {
        path: 'cham-cong/lich',
        title: 'Lịch làm việc | Mẹ Mây',
        canActivate: [requireOwner],
        canDeactivate: [pendingBookChanges],
        loadComponent: () => import('./features/admin/attendance/schedule').then((m) => m.Schedule),
      },
      {
        path: 'cham-cong/bao-cao',
        title: 'Bảng công | Mẹ Mây',
        canActivate: [requireOwner],
        loadComponent: () => import('./features/admin/attendance/report').then((m) => m.AttendanceReport),
      },
      {
        path: 'cham-cong',
        title: 'Chấm công | Mẹ Mây',
        canActivate: [requireOwner],
        loadComponent: () => import('./features/admin/attendance/punch').then((m) => m.Punch),
      },
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
        path: 'sach-noi-bat',
        title: 'Hiển thị sách nổi bật | Mẹ Mây',
        canDeactivate: [pendingBookChanges],
        canActivate: [
          () =>
            inject(AuthService).user()?.role === 'OWNER' ||
            inject(Router).createUrlTree(['/admin/sach']),
        ],
        loadComponent: () =>
          import('./features/admin/home-featured/home-featured').then(
            (m) => m.HomeFeaturedEditor,
          ),
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
          import('./features/admin/collections/collection-list/collection-list').then(
            (m) => m.CollectionList,
          ),
      },
      {
        path: 'sach',
        title: 'Quản lý sách | Mẹ Mây',
        loadComponent: () =>
          import('./features/admin/books/book-list/book-list').then((m) => m.BookList),
      },
      {
        path: 'sach/moi',
        title: 'Thêm sách | Mẹ Mây',
        canDeactivate: [pendingBookChanges],
        loadComponent: () =>
          import('./features/admin/books/book-editor/book-editor').then((m) => m.BookEditor),
      },
      {
        path: 'sach/import',
        title: 'Import sách | Mẹ Mây',
        canActivate: [
          () =>
            inject(AuthService).user()?.role === 'OWNER' ||
            inject(Router).createUrlTree(['/admin/sach']),
        ],
        canDeactivate: [pendingBookChanges],
        loadComponent: () =>
          import('./features/admin/books/book-import/book-import').then((m) => m.BookImport),
      },
      {
        path: 'sach/:id/xem-truoc',
        title: 'Xem trước sách | Mẹ Mây',
        loadComponent: () =>
          import('./features/admin/books/book-preview/book-preview').then((m) => m.BookPreview),
      },
      {
        path: 'sach/:id',
        title: 'Chỉnh sửa sách | Mẹ Mây',
        canDeactivate: [pendingBookChanges],
        loadComponent: () =>
          import('./features/admin/books/book-editor/book-editor').then((m) => m.BookEditor),
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
    loadComponent: () =>
      import('./layouts/public-layout/public-layout').then((m) => m.PublicLayout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./features/home/home-page').then((m) => m.HomePage),
      },
      {
        path: 'sach',
        loadComponent: () =>
          import('./features/catalogue/catalogue-page/catalogue-page').then((m) => m.CataloguePage),
      },
      {
        path: 'sach/:slug',
        loadComponent: () =>
          import('./features/catalogue/book-detail/book-detail').then((m) => m.BookDetail),
      },
      {
        path: 'bo-suu-tap/:slug',
        loadComponent: () =>
          import('./features/catalogue/catalogue-page/catalogue-page').then((m) => m.CataloguePage),
      },
      {
        path: 'flash-sale',
        loadComponent: () =>
          import('./features/catalogue/flash-sale-page/flash-sale-page').then(
            (m) => m.FlashSalePage,
          ),
      },
      {
        path: 'lien-he',
        loadComponent: () =>
          import('./features/information/contact-page/contact-page').then((m) => m.ContactPage),
      },
      {
        path: 'quan-tam',
        loadComponent: () =>
          import('./features/wishlist/wishlist-page/wishlist-page').then((m) => m.WishlistPage),
      },
      {
        path: '**',
        loadComponent: () => import('./features/information/not-found').then((m) => m.NotFound),
      },
    ],
  },
];
