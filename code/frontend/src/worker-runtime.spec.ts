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

describe('deployed Worker origin boundary', () => {
  it('accepts the named workers.dev origin without an account-specific build', async () => {
    const online = {
      ...env,
      MEMAY_API_ORIGIN: 'https://me-may-api.onrender.com',
      MEMAY_SITE_ORIGIN: undefined,
      MEMAY_WORKER_NAME: 'me-may',
    };
    const response = await handleWorkerRequest(
      new Request('https://me-may.account.workers.dev/cach-mua', {
        headers: { 'x-forwarded-host': 'evil.example', 'x-forwarded-proto': 'http' },
      }),
      online,
      async (req, context) => {
        expect(context.MEMAY_SITE_ORIGIN).toBe('https://me-may.account.workers.dev');
        expect(req.headers.get('x-forwarded-host')).toBeNull();
        expect(req.headers.get('x-forwarded-proto')).toBeNull();
        return new Response('SSR');
      },
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('SSR');
  });
  it('refuses spoofed origins instead of trusting arbitrary Host or forwarded headers', async () => {
    for (const origin of [
      'https://other.account.workers.dev',
      'https://me-may.account.workers.dev.evil.example',
      'http://me-may.account.workers.dev',
    ]) {
      const response = await handleWorkerRequest(
        new Request(origin + '/cach-mua'),
        { ...env, MEMAY_SITE_ORIGIN: undefined, MEMAY_WORKER_NAME: 'me-may' },
        async () => new Response('unexpected'),
      );
      expect(response.status).toBe(400);
    }
    const response = await handleWorkerRequest(
      new Request('https://evil.example/cach-mua'),
      env,
      async () => new Response('unexpected'),
    );
    expect(response.status).toBe(400);
  });
});

describe('public edge cache', () => {
  function cache() {
    const entries = new Map<string, Response>();
    return {
      match: vi.fn(async (request: Request) => entries.get(request.url)?.clone()),
      put: vi.fn(async (request: Request, response: Response) => { entries.set(request.url, response.clone()); }),
    };
  }
  it('caches anonymous home only, separates releases and keeps browser no-store', async () => {
    const storage = cache();
    vi.stubGlobal('fetch', async () => Response.json({
      enabled: true, serverNow: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30000).toISOString(),
    }));
    const render = vi.fn(async () => new Response('<html>home</html>', {
      headers: { 'content-type': 'text/html' },
    }));
    const config = { ...env, MEMAY_PUBLIC_CACHE: 'true', MEMAY_VERSION: { id: 'one' } };
    const request = new Request(env.MEMAY_SITE_ORIGIN + '/');
    const first = await handleWorkerRequest(request, config, render, storage);
    const hit = await handleWorkerRequest(request, config, render, storage);
    expect(first.headers.get('x-memay-cache')).toBe('MISS');
    expect(hit.headers.get('x-memay-cache')).toBe('HIT');
    expect(hit.headers.get('cache-control')).toBe('no-store');
    expect(render).toHaveBeenCalledTimes(1);
    await handleWorkerRequest(request, { ...config, MEMAY_VERSION: { id: 'two' } }, render, storage);
    expect(render).toHaveBeenCalledTimes(2);
    for (const path of ['/?q=private', '/admin', '/quan-tam']) {
      await handleWorkerRequest(new Request(env.MEMAY_SITE_ORIGIN + path), config, render, storage);
    }
    await handleWorkerRequest(new Request(request, { headers: { cookie: 'session=1' } }), config, render, storage);
    expect(storage.put).toHaveBeenCalledTimes(2);
  });
  it('does not cache errors, cookies, disabled policy or a crossed sale boundary', async () => {
    const storage = cache();
    for (const response of [
      new Response('error', { status: 503 }),
      new Response('private', { headers: { 'set-cookie': 'session=x' } }),
    ]) {
      vi.stubGlobal('fetch', async () => Response.json({
        enabled: true, serverNow: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30000).toISOString(),
      }));
      await handleWorkerRequest(new Request(env.MEMAY_SITE_ORIGIN + '/'),
        { ...env, MEMAY_PUBLIC_CACHE: 'true' }, async () => response, storage);
    }
    vi.stubGlobal('fetch', async () => Response.json({ enabled: false }));
    await handleWorkerRequest(new Request(env.MEMAY_SITE_ORIGIN + '/'),
      { ...env, MEMAY_PUBLIC_CACHE: 'true' }, async () => new Response('home'), storage);
    vi.stubGlobal('fetch', async () => Response.json({
      enabled: true, serverNow: new Date().toISOString(), expiresAt: new Date(Date.now() - 1000).toISOString(),
    }));
    await handleWorkerRequest(new Request(env.MEMAY_SITE_ORIGIN + '/'),
      { ...env, MEMAY_PUBLIC_CACHE: 'true' }, async () => new Response('home'), storage);
    expect(storage.put).not.toHaveBeenCalled();
  });
});

describe('versioned media and asset caching', () => {
  it('serves cached images with ETag revalidation and rejects unknown query shapes', async () => {
    const entries = new Map<string, Response>();
    const storage = {
      match: async (r: Request) => entries.get(r.url)?.clone(),
      put: async (r: Request, response: Response) => { entries.set(r.url, response.clone()); },
    };
    const backend = vi.fn(async () => new Response('image', { headers: {
      'content-type': 'image/webp', 'X-Memay-Public-Cache': '30',
    } }));
    vi.stubGlobal('fetch', backend);
    const config = { ...env, MEMAY_PUBLIC_CACHE: 'true' };
    const url = env.MEMAY_SITE_ORIGIN
      + '/api/v1/books/mm-000001/media/FRONT?size=640&format=webp&v=12345678-1234-1234-1234-123456789012';
    const first = await handleWorkerRequest(new Request(url), config, async () => null, storage);
    const next = await handleWorkerRequest(new Request(url, {
      headers: { 'if-none-match': first.headers.get('etag')! },
    }), config, async () => null, storage);
    expect(next.status).toBe(304);
    expect(await next.text()).toBe('');
    expect(backend).toHaveBeenCalledTimes(1);
    expect(next.headers.get('cache-control')).toContain('must-revalidate');
    await handleWorkerRequest(new Request(url + '&unexpected=1'), config, async () => null, storage);
    expect(backend).toHaveBeenCalledTimes(2);
  });
  it('uses immutable only for successful root hashed bundles and self-hosted woff2 fonts', async () => {
    const hashed = await handleWorkerRequest(new Request(env.MEMAY_SITE_ORIGIN + '/main-ABC12345.js'), env, async () => null);
    expect(hashed.headers.get('cache-control')).toContain('immutable');
    const font = await handleWorkerRequest(new Request(env.MEMAY_SITE_ORIGIN + '/fonts/nunito-vietnamese.woff2'), env, async () => null);
    expect(font.headers.get('cache-control')).toContain('immutable');
    const plain = await handleWorkerRequest(new Request(env.MEMAY_SITE_ORIGIN + '/logo.png'), env, async () => null);
    expect(plain.headers.get('cache-control') ?? '').not.toContain('immutable');
  });
});

describe('cache timing during origin latency', () => {
  it('subtracts policy transit and render time before caching across a sale boundary', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
    const put = vi.fn();
    vi.stubGlobal('fetch', async () => {
      now.mockReturnValue(6000);
      return Response.json({
        enabled: true, serverNow: new Date(1000).toISOString(), expiresAt: new Date(5000).toISOString(),
      });
    });
    await handleWorkerRequest(new Request(env.MEMAY_SITE_ORIGIN + '/'),
      { ...env, MEMAY_PUBLIC_CACHE: 'true' }, async () => new Response('home'),
      { match: async () => undefined, put });
    expect(put).not.toHaveBeenCalled();
    now.mockRestore();
  });
});
