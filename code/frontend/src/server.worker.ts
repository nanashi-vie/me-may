import { AngularAppEngine, createRequestHandler } from '@angular/ssr';
import { handleWorkerRequest, type WorkerEnvironment } from './worker-runtime';

const angularApp = new AngularAppEngine();
// Angular CLI uses the annotated handler when discovering server routes at build time.
export const reqHandler = createRequestHandler((request) => angularApp.handle(request));
export default {
  fetch(request: Request, env: WorkerEnvironment): Promise<Response> {
    return handleWorkerRequest(request, env, (req, context) => angularApp.handle(req, context));
  },
};
