import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FIREBASE_AUTH } from '../auth/firebase-auth.token';

/** Set this context flag only for API endpoints that intentionally accept anonymous requests. */
export const ANONYMOUS_API_REQUEST = new HttpContextToken<boolean>(() => false);

export const authenticationInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(FIREBASE_AUTH);
  const isApiRequest = request.url === environment.apiUrl || request.url.startsWith(`${environment.apiUrl}/`);

  if (!isApiRequest || request.context.get(ANONYMOUS_API_REQUEST)) {
    return next(request);
  }

  const token = auth.currentUser?.getIdToken() ?? Promise.resolve(null);
  return from(token).pipe(
    switchMap((idToken) =>
      next(idToken ? request.clone({ setHeaders: { Authorization: `Bearer ${idToken}` } }) : request),
    ),
  );
};
