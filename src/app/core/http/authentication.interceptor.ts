import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthTokenProvider } from '../auth/auth-token-provider.service';

/** Set this context flag only for API endpoints that intentionally accept anonymous requests. */
export const ANONYMOUS_API_REQUEST = new HttpContextToken<boolean>(() => false);
export const authenticationInterceptor: HttpInterceptorFn = (request, next) => {
  const tokens = inject(AuthTokenProvider);
  const isApiRequest = request.url === environment.apiUrl || request.url.startsWith(`${environment.apiUrl}/`);

  if (!isApiRequest || request.context.get(ANONYMOUS_API_REQUEST)) {
    return next(request);
  }

  return from(tokens.token()).pipe(
    switchMap((idToken) =>
      next(idToken ? request.clone({ setHeaders: { Authorization: `Bearer ${idToken}` } }) : request),
    ),
  );
};
