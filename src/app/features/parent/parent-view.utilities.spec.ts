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
    const result = parentViewError(new ApiError(403, 'authorization_denied', 'Forbidden'));
    expect(result.title).toBe('Access denied');
    expect(result.retryable).toBeFalse();
  });

  it('distinguishes a network failure from an empty result', () => {
    const result = parentViewError(new ApiError(0, 'unexpected_error', 'Offline'));
    expect(result.title).toBe('Network unavailable');
    expect(result.message).toBe('Offline');
  });
});
