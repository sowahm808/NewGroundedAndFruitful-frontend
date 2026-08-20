import { HttpErrorResponse, HttpEvent, HttpInterceptorFn } from '@angular/common/http';
import { Observable, catchError, timer, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';

const MAX_GET_RETRIES = 2;
const MAX_RETRY_AFTER_SECONDS = 30;
const TRANSIENT_STATUSES = new Set([0, 429, 502, 503, 504]);

/** Retries only idempotent reads, with a small fixed bound and server-directed 429 delay. */
export const transientRetryInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.method !== 'GET') return next(request);

  const send = (attempt: number): Observable<HttpEvent<unknown>> =>
    next(request).pipe(
      catchError((error: unknown) => {
        if (
          !(error instanceof HttpErrorResponse) ||
          !TRANSIENT_STATUSES.has(error.status) ||
          attempt >= MAX_GET_RETRIES
        ) {
          return throwError(() => error);
        }
        const delayMilliseconds = retryDelayMilliseconds(error, attempt);
        return timer(delayMilliseconds).pipe(switchMap(() => send(attempt + 1)));
      }),
    );

  return send(0);
};

function retryDelayMilliseconds(error: HttpErrorResponse, attempt: number): number {
  if (error.status === 429) {
    const header = error.headers.get('Retry-After');
    if (header && /^\d+$/.test(header)) return Math.min(Number(header), MAX_RETRY_AFTER_SECONDS) * 1000;
    if (header) {
      const dateDelay = Date.parse(header) - Date.now();
      if (!Number.isNaN(dateDelay)) return Math.min(Math.max(dateDelay, 0), MAX_RETRY_AFTER_SECONDS * 1000);
    }
  }
  return 250 * 2 ** attempt;
}
