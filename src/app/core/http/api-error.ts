export type ApiErrorCode =
  | 'authentication_required'
  | 'authorization_denied'
  | 'resource_not_found'
  | 'business_conflict'
  | 'validation_error'
  | 'rate_limit'
  | 'server_error'
  | 'unexpected_error';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: unknown,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
