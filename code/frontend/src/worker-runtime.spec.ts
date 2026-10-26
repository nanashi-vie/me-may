import { describe, it, expect, vi, afterEach } from 'vitest';
import { handleWorkerRequest, serverOrigins } from './worker-runtime';

const env = {
  MEMAY_API_ORIGIN: 'http://127.0.0.1:8080',
  MEMAY_SITE_ORIGIN: 'http://127.0.0.1:8787',
  ASSETS: { fetch: async () => new Response('asset') },
};
afterEach(() => vi.unstubAllGlobals());
describe('Workers HTTP boundary', () => {
  it('proxies method, query, body and auth headers; preserves separate cookies and server time', async () => {
    vi.stubGlobal('fetch', async (url: URL, init: RequestInit) => {
      expect(String(url)).toBe('http://127.0.0.1:8080/api/v1/auth/login?next=1');
      expect(init.method).toBe('POST');
      expect(await new Response(init.body).text()).toBe('{"email":"test"}');
      const h = new Headers(init.headers);
      expect(h.get('cookie')).toBe('SESSION=old');
      expect(h.get('x-csrf-token')).toBe('csrf');
      expect(h.get('authorization')).toBeNull();
      expect(init.redirect).toBe('manual');
      const headers = new Headers({
        'X-Memay-Server-Time': '2026-10-26T00:00:00Z',
        'Cache-Control': 'public',
      });
      headers.append('Set-Cookie', 'SESSION=new; HttpOnly; Path=/');
      headers.append('Set-Cookie', 'CSRF=token; Path=/');
      return new Response('created', { status: 201, headers });
    });
    const response = await handleWorkerRequest(
      new Request('http://127.0.0.1:8787/api/v1/auth/login?next=1', {
        method: 'POST',
        body: '{"email":"test"}',
        headers: { cookie: 'SESSION=old', 'x-csrf-token': 'csrf', authorization: 'not-forwarded' },
      }),
      env,
      async () => null,
    );
    expect(response.status).toBe(201);
    expect(await response.text()).toBe('created');
    expect(response.headers.getSetCookie()).toEqual([
      'SESSION=new; HttpOnly; Path=/',
      'CSRF=token; Path=/',
    ]);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-memay-server-time')).toBe('2026-10-26T00:00:00Z');
  });
  it('keeps encoded slash paths on the configured backend, never an input host', async () => {
    vi.stubGlobal('fetch', async (url: URL) => new Response(new URL(url).origin));
    const r = await handleWorkerRequest(
      new Request('http://127.0.0.1:8787/api//other.example/test'),
      env,
      async () => null,
    );
    expect(await r.text()).toBe('http://127.0.0.1:8080');
  });
  it('returns no-store 503 without leaking upstream errors', async () => {
    vi.stubGlobal('fetch', async () => {
      throw Error('secret upstream');
    });
    const r = await handleWorkerRequest(
      new Request('http://127.0.0.1:8787/api/v1/books'),
      env,
      async () => null,
    );
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ error: 'backend_unavailable' });
    expect(r.headers.get('cache-control')).toBe('no-store');
  });
  it('renders HTML including index.html through SSR; enforces private headers and real 404', async () => {
    for (const path of ['/quan-tam', '/admin/sach', '/index.html', '/missing']) {
      const r = await handleWorkerRequest(
        new Request('http://127.0.0.1:8787' + path),
        env,
        async (_req, context) => {
          expect(context).toEqual({
            MEMAY_API_ORIGIN: env.MEMAY_API_ORIGIN,
            MEMAY_SITE_ORIGIN: env.MEMAY_SITE_ORIGIN,
          });
          return path === '/missing' ? null : new Response('rendered');
        },
      );
      expect(await r.text()).toBe(path === '/missing' ? 'Not found' : 'rendered');
      expect(r.status).toBe(path === '/missing' ? 404 : 200);
      expect(r.headers.get('cache-control')).toBe('no-store');
      if (path.startsWith('/admin') || path === '/quan-tam')
        expect(r.headers.get('x-robots-tag')).toContain('noindex');
    }
  });
  it('serves static files through assets without rendering and rejects non-page methods', async () => {
    const r = await handleWorkerRequest(
      new Request('http://127.0.0.1:8787/main-ABC.js'),
      env,
      async () => {
        throw Error('unexpected SSR');
      },
    );
    expect(await r.text()).toBe('asset');
    const post = await handleWorkerRequest(
      new Request('http://127.0.0.1:8787/sach', { method: 'POST' }),
      env,
      async () => null,
    );
    expect(post.status).toBe(405);
  });
});
describe('private asset-like URLs', () => {
  it('keeps privacy headers even when an admin path looks like a static file', async () => {
    const response = await handleWorkerRequest(
      new Request('http://127.0.0.1:8787/admin/preview.json'),
      env,
      async () => null,
    );
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-robots-tag')).toContain('noindex');
  });
});
describe('server origins', () => {
  it('isolates per-request configuration and validates an origin instead of accepting credentials/paths', () => {
    expect(serverOrigins(env).MEMAY_SITE_ORIGIN).toBe('http://127.0.0.1:8787');
    expect(
      serverOrigins({ ...env, MEMAY_SITE_ORIGIN: 'https://books.example' }).MEMAY_SITE_ORIGIN,
    ).toBe('https://books.example');
    expect(serverOrigins(env).MEMAY_SITE_ORIGIN).toBe('http://127.0.0.1:8787');
    for (const value of [
      '',
      'https://name:secret@example.com',
      'https://example.com/path',
      'http://example.com',
      'file:///tmp',
    ]) {
      expect(() => serverOrigins({ ...env, MEMAY_API_ORIGIN: value })).toThrow();
    }
  });
});
