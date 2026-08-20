import { ApiError } from '../../core/http/api-error';
import { completedState, dataErrorState, loadedState } from './data-page-state';

describe('data page state standard', () => {
  it('represents an empty response as a non-error state', () => {
    expect(loadedState([], (items) => items.length === 0)).toEqual({ status: 'empty' });
  });

  it('maps each API outcome without calling backend failure unpublished', () => {
    expect(dataErrorState(new ApiError(409, 'business_conflict', 'stale')).status).toBe('conflict');
    expect(dataErrorState(new ApiError(429, 'rate_limit', 'wait', undefined, 4)).status).toBe('throttled');
    expect(dataErrorState(new ApiError(503, 'dependency_failure', 'down')).status).toBe('dependency-failure');
    expect(dataErrorState(new ApiError(404, 'feature_unpublished', 'off')).status).toBe('unpublished-disabled');
  });

  it('uses role-required as forbidden only when the canonical role is absent', () => {
    const failure = new ApiError(403, 'role_required', 'role needed');
    expect(dataErrorState(failure, { hasCanonicalRole: false }).status).toBe('forbidden');
    expect(dataErrorState(failure, { hasCanonicalRole: true }).status).toBe('dependency-failure');
  });

  it('preserves request IDs and confirmed data for unknown failures', () => {
    const data = { version: 7 };
    const state = dataErrorState(new ApiError(520, 'unexpected_error', 'failed', undefined, undefined, 'req-7'), {
      data,
    });
    expect(state).toEqual({
      status: 'dependency-failure',
      error: { message: 'failed', requestId: 'req-7', fieldErrors: undefined, retryAfterSeconds: undefined },
      data,
    });
  });

  it('replaces local data with the command response', () => {
    const response = { id: 'server', version: 2 };
    expect(completedState(response)).toEqual({ status: 'success', data: response });
  });
});
