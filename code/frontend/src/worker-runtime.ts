/** Only these non-secret origins cross the Angular request-context boundary. */
export interface ServerOrigins {
  MEMAY_API_ORIGIN: string;
  MEMAY_SITE_ORIGIN: string;
}
export interface WorkerEnvironment extends Omit<ServerOrigins, 'MEMAY_SITE_ORIGIN'> {
  MEMAY_SITE_ORIGIN?: string;
  MEMAY_WORKER_NAME?: string;
  MEMAY_PUBLIC_CACHE?: string;
  MEMAY_VERSION?: { id: string };
  ASSETS: { fetch(request: Request): Promise<Response> };
}
export interface EdgeCache {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<unknown>;
}
export function serverOrigins(value: ServerOrigins): ServerOrigins {
  const origin = (raw: string) => {
    const url = new URL(raw);
    if (
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash ||
      !(
        url.protocol === 'https:' ||
        (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))
      )
    ) {
      throw new Error('Expected an HTTPS origin (HTTP allowed only for localhost)');
    }
    return url.origin;
  };
  return {
    MEMAY_API_ORIGIN: origin(value.MEMAY_API_ORIGIN),
    MEMAY_SITE_ORIGIN: origin(value.MEMAY_SITE_ORIGIN),
  };
}
export async function handleWorkerRequest(
  request: Request,
  env: WorkerEnvironment,
  render: (request: Request, context: ServerOrigins) => Promise<Response | null>,
  cache?: EdgeCache,
  waitUntil?: (task: Promise<unknown>) => void,
): Promise<Response> {
  const url = new URL(request.url);
  const privatePage = /^\/(admin|quan-tam)(\/|$)/.test(url.pathname);
  const noStore = (response: Response) => {
    const result = new Response(response.body, response);
    result.headers.set('Cache-Control', 'no-store');
    if (privatePage) result.headers.set('X-Robots-Tag', 'noindex, nofollow, nosnippet');
    return result;
  };
  let siteOrigin = env.MEMAY_SITE_ORIGIN;
  if (!siteOrigin) {
    const name = env.MEMAY_WORKER_NAME;
    const labels = url.hostname.split('.');
    if (
      !name ||
      !/^[a-z0-9-]+$/.test(name) ||
      url.protocol !== 'https:' ||
      url.port ||
      labels.length !== 4 ||
      labels[0] !== name ||
      !/^[a-z0-9-]+$/.test(labels[1]) ||
      labels.slice(2).join('.') !== 'workers.dev'
    ) {
      return noStore(new Response('Unrecognized site origin', { status: 400 }));
    }
    siteOrigin = url.origin;
  }
  let origins: ServerOrigins;
  try {
    origins = serverOrigins({ ...env, MEMAY_SITE_ORIGIN: siteOrigin });
  } catch {
    return noStore(new Response('Invalid server configuration', { status: 503 }));
  }
  if (url.origin !== origins.MEMAY_SITE_ORIGIN) {
    return noStore(new Response('Unrecognized site origin', { status: 400 }));
  }
  const anonymous = !request.headers.has('cookie') && !request.headers.has('authorization');
  const home = request.method === 'GET' && url.pathname === '/' && !url.search;
  const media = request.method === 'GET'
    && /^\/api\/v1\/books\/[a-z0-9-]+\/media\/(FRONT|BACK|SPINE|INSIDE_[123])$/.test(url.pathname)
    && /^[a-f0-9-]{36}$/.test(url.searchParams.get('v') ?? '')
    && ['320', '640'].includes(url.searchParams.get('size') ?? '')
    && ['webp', 'jpg'].includes(url.searchParams.get('format') ?? '')
    && [...url.searchParams.keys()].sort().join(',') === 'format,size,v';
  const cacheable = env.MEMAY_PUBLIC_CACHE === 'true' && anonymous && (home || media) && cache;
  const keyUrl = new URL(url);
  if (home) keyUrl.searchParams.set('__release', env.MEMAY_VERSION?.id ?? 'local');
  const key = new Request(keyUrl);
  const finish = (response: Response, status: string) => {
    const result = noStore(response);
    result.headers.set('X-Memay-Cache', status);
    result.headers.delete('X-Memay-Cache-Expires');
    result.headers.delete('X-Memay-Public-Cache');
    if (media) {
      result.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
      if (result.status === 200 && request.headers.get('if-none-match') === result.headers.get('etag'))
        return new Response(null, { status: 304, headers: result.headers });
    }
    return result;
  };
  if (cacheable) {
    try {
      const hit = await cache.match(key);
      if (hit && Number(hit.headers.get('X-Memay-Cache-Expires')) > Date.now())
        return finish(hit, 'HIT');
    } catch { /* A cache outage falls back to the authoritative origin. */ }
  }
  const store = async (response: Response, expires: number) => {
    const seconds = Math.min(30, Math.floor((expires - Date.now()) / 1000));
    if (cacheable && response.status === 200 && !response.headers.has('set-cookie')
        && !response.headers.has('X-Memay-No-Cache') && seconds > 0) {
      const copy = new Response(response.clone().body, response);
      copy.headers.set('Cache-Control', 'public, max-age=' + seconds);
      copy.headers.set('X-Memay-Cache-Expires', String(Date.now() + seconds * 1000));
      copy.headers.delete('Vary');
      const task = cache.put(key, copy).catch(() => {});
      if (waitUntil) waitUntil(task);
      else await task;
    }
    return finish(response, cacheable ? 'MISS' : 'BYPASS');
  };
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
    try {
      const target = new URL(origins.MEMAY_API_ORIGIN);
      target.pathname = url.pathname;
      target.search = url.search;
      const headers = new Headers();
      for (const name of ['accept', 'content-type', 'cookie', 'x-csrf-token']) {
        const value = request.headers.get(name);
        if (value !== null) headers.set(name, value);
      }
      const started = Date.now();
      const response = await fetch(target, {
          method: request.method,
          headers,
          body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
          redirect: 'manual',
          signal: AbortSignal.timeout(70000),
        });
      if (media && response.ok && response.headers.get('X-Memay-Public-Cache') === '30') {
        const headers = new Headers(response.headers);
        headers.set('ETag', '"' + url.searchParams.get('v') + '-' + url.searchParams.get('size')
          + '-' + url.searchParams.get('format') + '"');
        return store(new Response(response.body, { status: response.status, headers }), started + 30000);
      }
      return noStore(response);
    } catch {
      return noStore(Response.json({ error: 'backend_unavailable' }, { status: 503 }));
    }
  }
  if (!['GET', 'HEAD'].includes(request.method)) {
    return noStore(
      new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } }),
    );
  }
  // Never let an HTML asset or SPA fallback bypass Angular status/privacy/metadata.
  if (/\.[a-z0-9]+$/i.test(url.pathname) && !/\.html?$/i.test(url.pathname)) {
    const asset = await env.ASSETS.fetch(request);
    if (privatePage) return noStore(asset);
    if (asset.status === 200 && (/^\/(?:main|styles|chunk|polyfills)-[A-Z0-9]{8,}\.(?:js|css)$/.test(url.pathname) || /^\/fonts\/[a-z0-9-]+\.woff2$/.test(url.pathname))) {
      const result = new Response(asset.body, asset);
      result.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      return result;
    }
    return asset;
  }
  try {
    // Cloudflare adds forwarding headers; the validated URL is the authoritative origin.
    // Strip them before Angular validation so untrusted headers cannot force CSR fallback.
    const headers = new Headers(request.headers);
    for (const name of [...headers.keys()]) {
      if (name.toLowerCase().startsWith('x-forwarded-')) headers.delete(name);
    }
    let expires = 0;
    if (cacheable && home) {
      const started = Date.now();
      try {
        const policyResponse = await fetch(origins.MEMAY_API_ORIGIN + '/api/v1/cache-policy',
          { signal: AbortSignal.timeout(3000), headers: { accept: 'application/json' } });
        if (policyResponse.ok) {
          const policy = await policyResponse.json() as { enabled: boolean; expiresAt: string; serverNow: string };
          if (policy.enabled) expires = started + Math.min(30000,
            Date.parse(policy.expiresAt) - Date.parse(policy.serverNow));
        }
      } catch { /* Render without caching when policy cannot be verified. */ }
    }
    const renderRequest = new Request(request, { headers });
    const response = (await render(renderRequest, origins)) ?? new Response('Not found', { status: 404 });
    return store(response, expires);
  } catch {
    return noStore(new Response('Service unavailable', { status: 503 }));
  }
}
