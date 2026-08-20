import { ApiError } from '../../core/http/api-error';
import { parentViewError } from './parent-view.utilities';

describe('parentViewError', () => {
  it('preserves the backend request ID for support', () => {
    const result = parentViewError(
      new ApiError(422, 'validation_error', 'Invalid child', undefined, undefined, 'req-42'),
    );
    expect(result.title).toBe('Request could not be validated');
    expect(result.requestId).toBe('req-42');
  });

  it('does not offer a retry for forbidden resources', () => {
    const result = parentViewError(new ApiError(403, 'relationship_forbidden', 'Forbidden'));
    expect(result.title).toBe('Access denied');
    expect(result.retryable).toBeFalse();
  });

  it('distinguishes a network failure from an empty result', () => {
    const result = parentViewError(new ApiError(0, 'unexpected_error', 'Offline'));
    expect(result.title).toBe('Network unavailable');
    expect(result.message).toBe('Offline');
  });

  it('identifies an undeployed list contract without disguising other errors', () => {
    const result = parentViewError(new ApiError(404, 'resource_not_found', 'Not found'), true);
    expect(result.title).toBe('Contract unavailable');
  });

  it('distinguishes invalid sessions and backend failures', () => {
    expect(parentViewError(new ApiError(401, 'authentication_required', 'Sign in')).title).toBe('Session invalid');
    expect(parentViewError(new ApiError(500, 'dependency_failure', 'Failed')).title).toBe('Backend failure');
  });
});
