import { AngularAppEngine, createRequestHandler } from '@angular/ssr';
import { handleWorkerRequest, type EdgeCache, type WorkerEnvironment } from './worker-runtime';

const angularApp = new AngularAppEngine();
// Angular CLI uses the annotated handler when discovering server routes at build time.
export const reqHandler = createRequestHandler((request) => angularApp.handle(request));
export default {
  async fetch(
    request: Request,
    env: WorkerEnvironment,
    ctx: { waitUntil(task: Promise<unknown>): void },
  ): Promise<Response> {
    let cache: EdgeCache | undefined;
    if (env.MEMAY_PUBLIC_CACHE === 'true') {
      try { cache = await caches.open('memay-public'); }
      catch { /* Serve the origin if edge storage is unavailable. */ }
    }
    return handleWorkerRequest(request, env, (req, context) =>
      new AngularAppEngine({ allowedHosts: [new URL(context.MEMAY_SITE_ORIGIN).hostname] }).handle(
        req,
        context,
      ),
      cache,
      (task) => ctx.waitUntil(task),
    );
  },
};
