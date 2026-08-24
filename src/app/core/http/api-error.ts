export type ApiErrorCode =
  | 'feature_unpublished'
  | 'authentication_required'
  | 'role_required'
  | 'approval_pending'
  | 'account_disabled'
  | 'relationship_forbidden'
  | 'resource_not_found'
  | 'business_conflict'
  | 'validation_error'
  | 'rate_limit'
  | 'dependency_failure'
  | 'network_error'
  | 'unexpected_error'
  | 'BIBLE_QUARTER_LIFECYCLE_CONFLICT';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: unknown,
    readonly retryAfterSeconds?: number,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get fieldErrors(): Readonly<Record<string, readonly string[]>> | undefined {
    if (!isRecord(this.details) || !isRecord(this.details['fields'])) return undefined;
    const fields: Record<string, readonly string[]> = {};
    for (const [field, value] of Object.entries(this.details['fields'])) {
      if (typeof value === 'string') fields[field] = [value];
      else if (Array.isArray(value) && value.every((entry) => typeof entry === 'string')) fields[field] = value;
    }
    return fields;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
