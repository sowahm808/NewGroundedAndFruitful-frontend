import { ApplicationConfig, ErrorHandler } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { GlobalErrorHandler } from './core/error-handling/global-error-handler';
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ],
};
