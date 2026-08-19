import { ApiError } from '../../core/http/api-error';
export interface ViewError {
  readonly title: string;
  readonly message: string;
  readonly requestId?: string;
  readonly retryable: boolean;
}
export function parentViewError(error: unknown, unavailableOnNotFound = false): ViewError {
  if (!(error instanceof ApiError))
    return {
      title: 'Something went wrong',
      message: 'An unexpected error prevented this page from loading.',
      retryable: true,
    };
  const title =
    error.status === 404 && unavailableOnNotFound
      ? 'Contract unavailable'
      : error.status === 401
        ? 'Session invalid'
        : error.status === 403
          ? 'Access denied'
          : error.status === 0 || error.status === -1
            ? 'Network unavailable'
            : error.code === 'validation_error'
              ? 'Request could not be validated'
              : error.status >= 500
                ? 'Backend failure'
                : 'Unable to load this page';
  return { title, message: error.message, requestId: error.requestId, retryable: error.status !== 403 };
}
