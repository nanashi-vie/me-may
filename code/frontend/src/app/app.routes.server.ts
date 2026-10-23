import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'admin/**',
    renderMode: RenderMode.Client,
    headers: { 'X-Robots-Tag': 'noindex, nofollow, nosnippet', 'Cache-Control': 'no-store' },
  },
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];
