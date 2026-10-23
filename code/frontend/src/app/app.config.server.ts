import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { PUBLIC_API_ORIGIN, PUBLIC_SITE_ORIGIN } from './features/catalogue/public-api';

const serverConfig: ApplicationConfig = {
  providers: [
    {
      provide: PUBLIC_API_ORIGIN,
      useValue: process.env['MEMAY_API_ORIGIN'] || 'http://127.0.0.1:8080',
    },
    {
      provide: PUBLIC_SITE_ORIGIN,
      useValue: process.env['MEMAY_SITE_ORIGIN'] || 'http://localhost:4200',
    },
    provideServerRendering(withRoutes(serverRoutes)),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
