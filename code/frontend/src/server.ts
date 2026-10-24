import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// Local built-server API bridge. Backend origin is server configuration only.
const backendOrigin = process.env['MEMAY_API_ORIGIN'] || 'http://127.0.0.1:8080';
app.use('/api', express.raw({ type: () => true, limit: '11mb' }), async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const headers = new Headers();
    for (const name of ['accept', 'content-type', 'cookie', 'x-csrf-token']) {
      const value = req.headers[name];
      if (typeof value === 'string') headers.set(name, value);
    }
    const upstream = await fetch(new URL(req.originalUrl, backendOrigin), {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
      signal: AbortSignal.timeout(70000),
      redirect: 'manual',
    });
    res.status(upstream.status);
    upstream.headers.forEach((value, name) => {
      if (
        ![
          'set-cookie',
          'content-length',
          'content-encoding',
          'transfer-encoding',
          'connection',
        ].includes(name)
      )
        res.setHeader(name, value);
    });
    const cookies = upstream.headers.getSetCookie();
    if (cookies.length) res.setHeader('Set-Cookie', cookies);
    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch {
    res.status(503).json({ error: 'backend_unavailable' });
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = Number(process.env['PORT'] || 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer from 1 to 65535');
  }
  app.listen(port, '127.0.0.1', (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
