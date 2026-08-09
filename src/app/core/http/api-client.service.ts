import { HttpClient, HttpContext, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiError, ApiErrorCode } from './api-error';
import { ANONYMOUS_API_REQUEST } from './authentication.interceptor';

export interface ApiRequestOptions {
  params?: HttpParams | Record<string, string | number | boolean | readonly (string | number | boolean)[]>;
  anonymous?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly baseUrl = environment.apiUrl.replace(/\/$/, '');

  constructor(private readonly http: HttpClient) {}

  get<T>(path: string, options: ApiRequestOptions = {}): Observable<T> {
    return this.request('GET', path, undefined, options);
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
      .request<T>(method, url, { body, params: options.params, context })
      .pipe(catchError((error: unknown) => throwError(() => this.toApiError(error))));
  }

  private toApiError(error: unknown): ApiError {
    if (!(error instanceof HttpErrorResponse)) {
      return new ApiError(0, 'unexpected_error', 'The request could not be completed.', error);
    }

    const errors: Record<number, [ApiErrorCode, string]> = {
      401: ['authentication_required', 'Authentication is required. Please sign in again.'],
      403: ['authorization_denied', 'You are not authorized to perform this operation.'],
      404: ['resource_not_found', 'The requested resource was not found.'],
      409: ['business_conflict', 'The operation conflicts with the current resource state.'],
      422: ['validation_error', 'Some submitted values are invalid.'],
      429: ['rate_limit', 'Too many requests. Please wait and try again.'],
      500: ['server_error', 'The server could not complete the request.'],
    };
    const [code, fallback] = errors[error.status] ?? ['unexpected_error', 'The request could not be completed.'];
    const payload = error.error as { message?: unknown; details?: unknown } | null;
    const message = typeof payload?.message === 'string' ? payload.message : fallback;
    const retryAfter = error.headers.get('Retry-After');
    const retryAfterSeconds = retryAfter !== null && /^\d+$/.test(retryAfter) ? Number(retryAfter) : undefined;

    return new ApiError(error.status, code, message, payload?.details, retryAfterSeconds);
  }
}
