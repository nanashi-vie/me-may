import { Routes } from '@angular/router';
import { requireAdmin } from './core/auth/auth.guard';

export const routes: Routes = [
  {path: 'admin/dang-nhap', title: 'Đăng nhập quản trị | Mẹ Mây', loadComponent: () => import('./features/admin/login').then(m => m.Login)},
  {path: 'admin', canActivate: [requireAdmin], loadComponent: () => import('./layouts/admin-layout').then(m => m.AdminLayout), children: [
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
