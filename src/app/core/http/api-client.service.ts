import { HttpClient, HttpContext, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiError, ApiErrorCode } from './api-error';
import { ANONYMOUS_API_REQUEST } from './authentication.interceptor';

export interface ApiRequestOptions {
  params?: HttpParams | Record<string, string | number | boolean | readonly (string | number | boolean)[]>;
  anonymous?: boolean;
  headers?: HttpHeaders | Record<string, string>;
}

@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/$/, '');

  get<T>(path: string, options: ApiRequestOptions = {}): Observable<T> {
    return this.request('GET', path, undefined, options);
  }

  /** Reads the API's standard envelope in one place. */
  getData<T>(path: string, options: ApiRequestOptions = {}): Observable<T> {
    return this.get<{ readonly data: T }>(path, options).pipe(map((response) => response.data));
  }

  postData<T>(path: string, body: unknown, options: ApiRequestOptions = {}): Observable<T> {
    return this.post<{ readonly data: T }>(path, body, options).pipe(map((response) => response.data));
  }

  patchData<T>(path: string, body: unknown, options: ApiRequestOptions = {}): Observable<T> {
    return this.patch<{ readonly data: T }>(path, body, options).pipe(map((response) => response.data));
  }

  putData<T>(path: string, body: unknown, options: ApiRequestOptions = {}): Observable<T> {
    return this.put<{ readonly data: T }>(path, body, options).pipe(map((response) => response.data));
  }

  post<T>(path: string, body: unknown, options: ApiRequestOptions = {}): Observable<T> {
    return this.request('POST', path, body, options);
  }

  put<T>(path: string, body: unknown, options: ApiRequestOptions = {}): Observable<T> {
    return this.request('PUT', path, body, options);
  }

  patch<T>(path: string, body: unknown, options: ApiRequestOptions = {}): Observable<T> {
    return this.request('PATCH', path, body, options);
  }

  delete<T>(path: string, options: ApiRequestOptions = {}): Observable<T> {
    return this.request('DELETE', path, undefined, options);
  }

  private request<T>(method: string, path: string, body: unknown, options: ApiRequestOptions): Observable<T> {
    const url = `${this.baseUrl}/${path.replace(/^\/+/, '')}`;
    const context = options.anonymous ? new HttpContext().set(ANONYMOUS_API_REQUEST, true) : new HttpContext();

    return this.http
      .request<T>(method, url, { body, params: options.params, headers: options.headers, context })
      .pipe(catchError((error: unknown) => throwError(() => this.toApiError(error))));
  }

  private toApiError(error: unknown): ApiError {
    if (!(error instanceof HttpErrorResponse)) {
      return new ApiError(-1, 'unexpected_error', 'The request could not be completed.', error);
    }

    const errors: Record<number, [ApiErrorCode, string]> = {
      0: ['network_error', 'The backend could not be reached. Check your network connection and try again.'],
      401: ['authentication_required', 'Authentication is required. Please sign in again.'],
      403: ['authorization_denied', 'You are not authorized to perform this operation.'],
      404: ['resource_not_found', 'The requested resource was not found.'],
      409: ['business_conflict', 'The operation conflicts with the current resource state.'],
      422: ['validation_error', 'Some submitted values are invalid.'],
      429: ['rate_limit', 'Too many requests. Please wait and try again.'],
      500: ['server_error', 'The server could not complete the request.'],
    };
    const [code, fallback] = errors[error.status] ?? ['unexpected_error', 'The request could not be completed.'];
    const payload = error.error as { code?: unknown; message?: unknown; details?: unknown; requestId?: unknown } | null;
    const message = typeof payload?.message === 'string' ? payload.message : fallback;
    const retryAfter = error.headers.get('Retry-After');
    const retryAfterSeconds = retryAfter !== null && /^\d+$/.test(retryAfter) ? Number(retryAfter) : undefined;

    const backendCode = typeof payload?.code === 'string' ? payload.code : undefined;
    const requestIdHeader = error.headers.get('X-Request-Id') ?? error.headers.get('X-Request-ID');
    const requestId = requestIdHeader ?? (typeof payload?.requestId === 'string' ? payload.requestId : undefined);
    return new ApiError(
      error.status,
      backendCodeToApiCode(backendCode, code),
      message,
      payload?.details,
      retryAfterSeconds,
      requestId,
    );
  }
}

function backendCodeToApiCode(backendCode: string | undefined, fallback: ApiErrorCode): ApiErrorCode {
  const known: readonly ApiErrorCode[] = [
    'authentication_required',
    'authorization_denied',
    'resource_not_found',
    'business_conflict',
    'validation_error',
    'rate_limit',
    'server_error',
    'network_error',
    'unexpected_error',
  ];
  const normalized = backendCode?.toLowerCase();
  return known.includes(normalized as ApiErrorCode) ? (normalized as ApiErrorCode) : fallback;
}
