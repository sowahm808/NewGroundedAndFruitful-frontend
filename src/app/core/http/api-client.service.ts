import {
  HttpClient,
  HttpContext,
  HttpErrorResponse,
  HttpHeaders,
  HttpParams,
  HttpResponse,
} from '@angular/common/http';
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

export interface ApiEnvelope<T> {
  readonly data: T;
  readonly requestId?: string;
}

export interface ApiCollection<T> {
  readonly items: readonly T[];
  readonly nextCursor?: string;
  readonly hasMore: boolean;
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
    return this.get<ApiEnvelope<T>>(path, options).pipe(map(unwrapEnvelope));
  }

  /** Normalizes both supported collection envelopes without converting transport errors to empty results. */
  getCollectionData<T>(path: string, options: ApiRequestOptions = {}): Observable<ApiCollection<T>> {
    return this.get<unknown>(path, options).pipe(map(unwrapCollectionEnvelope<T>));
  }

  postData<T>(path: string, body: unknown, options: ApiRequestOptions = {}): Observable<T> {
    return this.post<ApiEnvelope<T>>(path, body, options).pipe(map(unwrapEnvelope));
  }

  patchData<T>(path: string, body: unknown, options: ApiRequestOptions = {}): Observable<T> {
    return this.patch<ApiEnvelope<T>>(path, body, options).pipe(map(unwrapEnvelope));
  }

  putData<T>(path: string, body: unknown, options: ApiRequestOptions = {}): Observable<T> {
    return this.put<ApiEnvelope<T>>(path, body, options).pipe(map(unwrapEnvelope));
  }

  post<T>(path: string, body: unknown, options: ApiRequestOptions = {}): Observable<T> {
    return this.request('POST', path, body, options);
  }

  postResponse<T>(path: string, body: unknown, options: ApiRequestOptions = {}): Observable<HttpResponse<T>> {
    const url = `${this.baseUrl}/${path.replace(/^\/+/, '')}`;
    const context = options.anonymous ? new HttpContext().set(ANONYMOUS_API_REQUEST, true) : new HttpContext();
    return this.http
      .post<T>(url, body, { params: options.params, headers: options.headers, context, observe: 'response' })
      .pipe(catchError((error: unknown) => throwError(() => this.toApiError(error))));
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
      403: ['relationship_forbidden', 'You are not authorized to perform this operation.'],
      404: ['resource_not_found', 'The requested resource was not found.'],
      409: ['business_conflict', 'The operation conflicts with the current resource state.'],
      422: ['validation_error', 'Some submitted values are invalid.'],
      429: ['rate_limit', 'Too many requests. Please wait and try again.'],
      500: ['dependency_failure', 'A backend dependency could not complete the request.'],
    };
    const [code, fallback] =
      error.status >= 500
        ? (['dependency_failure', 'A backend dependency could not complete the request.'] as const)
        : (errors[error.status] ?? ['unexpected_error', 'The request could not be completed.']);
    const raw = error.error as {
      error?: unknown;
      code?: unknown;
      message?: unknown;
      details?: unknown;
      requestId?: unknown;
    } | null;
    const payload = (raw?.error && typeof raw.error === 'object' ? raw.error : raw) as {
      code?: unknown;
      message?: unknown;
      details?: unknown;
      requestId?: unknown;
    } | null;
    const message = typeof payload?.message === 'string' ? payload.message : fallback;
    const retryAfterSeconds = parseRetryAfter(error.headers.get('Retry-After'));

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
    'feature_unpublished',
    'role_required',
    'approval_pending',
    'account_disabled',
    'relationship_forbidden',
    'resource_not_found',
    'business_conflict',
    'validation_error',
    'rate_limit',
    'dependency_failure',
    'network_error',
    'unexpected_error',
  ];
  const normalized = backendCode?.toLowerCase();
  return known.includes(normalized as ApiErrorCode) ? (normalized as ApiErrorCode) : fallback;
}

function unwrapEnvelope<T>(response: ApiEnvelope<T>): T {
  if (!response || typeof response !== 'object' || !('data' in response)) {
    throw new ApiError(-1, 'unexpected_error', 'The backend returned an invalid response envelope.');
  }
  return response.data;
}

function unwrapCollectionEnvelope<T>(response: unknown): ApiCollection<T> {
  if (!response || typeof response !== 'object' || !('data' in response)) {
    throw new ApiError(-1, 'unexpected_error', 'The backend returned an invalid response envelope.');
  }
  const envelope = response as { data?: unknown; meta?: unknown };
  if (Array.isArray(envelope.data)) {
    const meta = envelope.meta;
    if (meta !== undefined && (!meta || typeof meta !== 'object')) {
      throw new ApiError(-1, 'unexpected_error', 'The backend returned invalid collection metadata.');
    }
    const cursor = (meta as { nextCursor?: unknown } | undefined)?.nextCursor;
    if (cursor !== undefined && cursor !== null && typeof cursor !== 'string') {
      throw new ApiError(-1, 'unexpected_error', 'The backend returned an invalid collection cursor.');
    }
    return {
      items: envelope.data as readonly T[],
      hasMore: typeof cursor === 'string' && cursor.length > 0,
      ...(typeof cursor === 'string' && cursor.length ? { nextCursor: cursor } : {}),
    };
  }
  const data = envelope.data;
  if (!data || typeof data !== 'object' || !Array.isArray((data as { items?: unknown }).items)) {
    throw new ApiError(-1, 'unexpected_error', 'The backend returned an invalid collection.');
  }
  const page = data as { items: readonly T[]; nextCursor?: unknown; hasMore?: unknown };
  if (page.nextCursor !== undefined && page.nextCursor !== null && typeof page.nextCursor !== 'string') {
    throw new ApiError(-1, 'unexpected_error', 'The backend returned an invalid collection cursor.');
  }
  if (page.hasMore !== undefined && typeof page.hasMore !== 'boolean') {
    throw new ApiError(-1, 'unexpected_error', 'The backend returned invalid collection pagination.');
  }
  const nextCursor = typeof page.nextCursor === 'string' && page.nextCursor.length ? page.nextCursor : undefined;
  return { items: page.items, hasMore: page.hasMore ?? Boolean(nextCursor), ...(nextCursor ? { nextCursor } : {}) };
}

function parseRetryAfter(value: string | null): number | undefined {
  if (value === null) return undefined;
  if (/^\d+$/.test(value)) return Number(value);
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? undefined : Math.max(0, Math.ceil((timestamp - Date.now()) / 1000));
}
