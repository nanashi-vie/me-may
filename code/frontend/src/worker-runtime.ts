/** Only these non-secret origins cross the Angular request-context boundary. */
export interface ServerOrigins {
  MEMAY_API_ORIGIN: string;
  MEMAY_SITE_ORIGIN: string;
}
export interface WorkerEnvironment extends ServerOrigins {
  ASSETS: { fetch(request: Request): Promise<Response> };
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
): Promise<Response> {
  const url = new URL(request.url);
  const privatePage = /^\/(admin|quan-tam)(\/|$)/.test(url.pathname);
  const noStore = (response: Response) => {
    const result = new Response(response.body, response);
    result.headers.set('Cache-Control', 'no-store');
    if (privatePage) result.headers.set('X-Robots-Tag', 'noindex, nofollow, nosnippet');
    return result;
  };
  let origins: ServerOrigins;
  try {
    origins = serverOrigins(env);
  } catch {
    return noStore(new Response('Invalid server configuration', { status: 503 }));
  }
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
      return noStore(
        await fetch(target, {
          method: request.method,
          headers,
          body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
          redirect: 'manual',
          signal: AbortSignal.timeout(70000),
        }),
      );
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
    return env.ASSETS.fetch(request);
  }
  try {
    return noStore((await render(request, origins)) ?? new Response('Not found', { status: 404 }));
  } catch {
    return noStore(new Response('Service unavailable', { status: 503 }));
  }
}
