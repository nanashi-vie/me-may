import {
  mergeApplicationConfig,
  ApplicationConfig,
  inject,
  TransferState,
  REQUEST_CONTEXT,
} from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import {
  PUBLIC_API_ORIGIN,
  PUBLIC_SITE_ORIGIN,
  PUBLIC_SITE_STATE,
} from './features/catalogue/public-api';

import { serverOrigins, type ServerOrigins } from '../worker-runtime';

function origins(): ServerOrigins {
  const context = inject(REQUEST_CONTEXT, { optional: true }) as ServerOrigins | null;
  return serverOrigins(
    context ?? {
      MEMAY_API_ORIGIN:
        (typeof process !== 'undefined' && process.env['MEMAY_API_ORIGIN']) ||
        'http://127.0.0.1:8080',
      MEMAY_SITE_ORIGIN:
        (typeof process !== 'undefined' && process.env['MEMAY_SITE_ORIGIN']) ||
        'http://localhost:4200',
    },
  );
}

const serverConfig: ApplicationConfig = {
  providers: [
    {
      provide: PUBLIC_API_ORIGIN,
      useFactory: () => origins().MEMAY_API_ORIGIN,
    },
    {
      provide: PUBLIC_SITE_ORIGIN,
      useFactory: () => {
        const origin = origins().MEMAY_SITE_ORIGIN;
        inject(TransferState).set(PUBLIC_SITE_STATE, origin);
        return origin;
      },
    },
    provideServerRendering(withRoutes(serverRoutes)),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
