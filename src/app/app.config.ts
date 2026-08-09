import { ApplicationConfig, ErrorHandler } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { FIREBASE_AUTH } from './core/auth/firebase-auth.token';
import { authenticationInterceptor } from './core/http/authentication.interceptor';
import { GlobalErrorHandler } from './core/error-handling/global-error-handler';
export const appConfig: ApplicationConfig = {
  providers: [
    { provide: FIREBASE_AUTH, useFactory: () => getAuth(initializeApp(environment.firebase)) },
    provideHttpClient(withInterceptors([authenticationInterceptor])),
    provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ],
};
