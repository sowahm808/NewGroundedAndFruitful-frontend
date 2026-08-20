import { HttpContextToken, HttpErrorResponse, HttpEvent, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FIREBASE_AUTH } from '../auth/firebase-auth.token';

/** Set this context flag only for API endpoints that intentionally accept anonymous requests. */
export const ANONYMOUS_API_REQUEST = new HttpContextToken<boolean>(() => false);
const AUTHENTICATION_RETRIED = new HttpContextToken<boolean>(() => false);

export const authenticationInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(FIREBASE_AUTH);
  const isApiRequest = request.url === environment.apiUrl || request.url.startsWith(`${environment.apiUrl}/`);

  if (!isApiRequest || request.context.get(ANONYMOUS_API_REQUEST)) {
    return next(request);
  }

  const send = (outgoing: HttpRequest<unknown>, forceRefresh: boolean): Observable<HttpEvent<unknown>> =>
    from(auth.currentUser?.getIdToken(forceRefresh) ?? Promise.resolve(null)).pipe(
      switchMap((idToken) => {
        const authenticated = idToken
          ? outgoing.clone({ setHeaders: { Authorization: `Bearer ${idToken}` } })
          : outgoing;
        return next(authenticated).pipe(
          catchError((error: unknown) => {
            if (
              error instanceof HttpErrorResponse &&
              error.status === 401 &&
              auth.currentUser &&
              !outgoing.context.get(AUTHENTICATION_RETRIED)
            ) {
              return send(outgoing.clone({ context: outgoing.context.set(AUTHENTICATION_RETRIED, true) }), true);
            }
            return throwError(() => error);
          }),
        );
      }),
    );

  return send(request, false);
};
