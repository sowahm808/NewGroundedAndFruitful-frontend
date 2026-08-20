import { ApiError } from '../../core/http/api-error';

/** The complete, shared vocabulary for data-backed page states. */
export type DataPageStatus =
  | 'initializing'
  | 'loading'
  | 'ready'
  | 'empty'
  | 'saving'
  | 'submitting'
  | 'success'
  | 'validation-error'
  | 'conflict'
  | 'forbidden'
  | 'not-found'
  | 'throttled'
  | 'offline-network-error'
  | 'dependency-failure'
  | 'unpublished-disabled';

export interface DataPageFailure {
  readonly message: string;
  readonly requestId?: string;
  readonly fieldErrors?: Readonly<Record<string, readonly string[]>>;
  readonly retryAfterSeconds?: number;
}

export type DataPageState<T> =
  | { readonly status: 'initializing' | 'loading' }
  | { readonly status: 'ready' | 'success'; readonly data: T }
  | { readonly status: 'empty' }
  | { readonly status: 'saving' | 'submitting'; readonly data: T }
  | {
      readonly status: Exclude<
        DataPageStatus,
        'initializing' | 'loading' | 'ready' | 'empty' | 'saving' | 'submitting' | 'success'
      >;
      readonly error: DataPageFailure;
      readonly data?: T;
    };

export interface ErrorStateContext<T> {
  /** Preserve last confirmed server data while an operation error is presented. */
  readonly data?: T;
  /** Whether the current session has the page's canonical role. */
  readonly hasCanonicalRole?: boolean;
}

/**
 * Converts transport failures to page semantics. Unknown failures deliberately
 * retain a request ID when one is available, without exposing private details.
 */
export function dataErrorState<T>(error: unknown, context: ErrorStateContext<T> = {}): DataPageState<T> {
  const apiError = error instanceof ApiError ? error : undefined;
  const failure: DataPageFailure = {
    message: apiError?.message ?? 'The request could not be completed.',
    requestId: apiError?.requestId,
    fieldErrors: apiError?.fieldErrors,
    retryAfterSeconds: apiError?.retryAfterSeconds,
  };
  const withFailure = (status: DataPageState<T>['status']): DataPageState<T> =>
    ({ status, error: failure, ...(context.data === undefined ? {} : { data: context.data }) }) as DataPageState<T>;

  switch (apiError?.code) {
    case 'validation_error':
      return withFailure('validation-error');
    case 'business_conflict':
      return withFailure('conflict');
    case 'relationship_forbidden':
    case 'authentication_required':
      return withFailure('forbidden');
    case 'role_required':
      // A role-required screen is truthful only when the canonical role is absent.
      return withFailure(context.hasCanonicalRole === false ? 'forbidden' : 'dependency-failure');
    case 'resource_not_found':
      return withFailure('not-found');
    case 'rate_limit':
      return withFailure('throttled');
    case 'network_error':
      return withFailure('offline-network-error');
    case 'feature_unpublished':
    case 'account_disabled':
    case 'approval_pending':
      return withFailure('unpublished-disabled');
    case 'dependency_failure':
    case 'unexpected_error':
    default:
      return withFailure('dependency-failure');
  }
}

/** Empty is a successful read outcome, never an error. */
export function loadedState<T>(data: T, isEmpty: (value: T) => boolean): DataPageState<T> {
  return isEmpty(data) ? { status: 'empty' } : { status: 'ready', data };
}

/** A completed command always makes its server representation authoritative. */
export function completedState<T>(serverData: T): DataPageState<T> {
  return { status: 'success', data: serverData };
}
