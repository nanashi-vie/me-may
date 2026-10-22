import { CanDeactivateFn, Routes } from '@angular/router';
import { requireAdmin } from './core/auth/auth.guard';

const pendingBookChanges:CanDeactivateFn<{canLeave():boolean}>=component=>component.canLeave();

export const routes: Routes = [
  {path: 'admin/dang-nhap', title: 'Đăng nhập quản trị | Mẹ Mây', loadComponent: () => import('./features/admin/login').then(m => m.Login)},
  {path: 'admin', canActivate: [requireAdmin], loadComponent: () => import('./layouts/admin-layout').then(m => m.AdminLayout), children: [
    {path:'sach',title:'Quản lý sách | Mẹ Mây',loadComponent:()=>import('./features/admin/books/book-list').then(m=>m.BookList)},
    {path:'sach/them',title:'Thêm sách | Mẹ Mây',canDeactivate:[pendingBookChanges],loadComponent:()=>import('./features/admin/books/book-editor').then(m=>m.BookEditor)},
    {path:'sach/:id/xem-truoc',title:'Xem trước sách | Mẹ Mây',loadComponent:()=>import('./features/admin/books/book-preview').then(m=>m.BookPreview)},
    {path:'sach/:id',title:'Chỉnh sửa sách | Mẹ Mây',canDeactivate:[pendingBookChanges],loadComponent:()=>import('./features/admin/books/book-editor').then(m=>m.BookEditor)},
    {path: '', pathMatch: 'full', title: 'Quản trị | Mẹ Mây', loadComponent: () => import('./features/admin/overview').then(m => m.Overview)},
  ]},
  {path: '', loadComponent: () => import('./layouts/public-layout').then(m => m.PublicLayout), children: [
    {path: '', pathMatch: 'full', loadComponent: () => import('./features/information/public-page').then(m => m.PublicPage), data: {
      title: 'Mẹ Mây — Sách ngoại văn cho bé', heading: 'Mỗi cuốn sách, một lần khám phá mới.',
      description: 'Khám phá sách ngoại văn đã qua sử dụng cho bé. Ảnh thật, tình trạng rõ ràng cho từng cuốn sách.', path: '/', home: true,
    }},
    {path: 'sach', loadComponent: () => import('./features/information/public-page').then(m => m.PublicPage), data: {
      title: 'Sách cho bé | Mẹ Mây', heading: 'Những cuốn sách cho bé', description: 'Sách đang được cập nhật. Bạn hãy ghé lại để khám phá những cuốn sách mới của tiệm.', path: '/sach',
    }},
    {path: 'cach-mua', loadComponent: () => import('./features/information/public-page').then(m => m.PublicPage), data: {
      title: 'Cách hỏi mua sách | Mẹ Mây', heading: 'Chọn sách và nhắn tiệm', description: 'Ghi lại mã và đường dẫn cuốn sách bạn quan tâm. Tiệm sẽ xác nhận tình trạng và hướng dẫn chốt mua qua Facebook hoặc Zalo.', path: '/cach-mua',
    }},
    {path: '**', loadComponent: () => import('./features/information/not-found').then(m => m.NotFound)},
  ]},
];
