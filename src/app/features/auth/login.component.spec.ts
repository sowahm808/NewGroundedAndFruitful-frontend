import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { authErrorMessage, safeReturnUrl } from './login.component';
import { SessionBootstrapError } from '../../core/auth/auth.service';

describe('safeReturnUrl', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  it('accepts a same-role path and preserves query parameters and fragment', () => {
    const router = TestBed.inject(Router);
    const result = safeReturnUrl('/parent/reports?quarter=current#summary', router, ['parent']);
    expect(router.serializeUrl(result!)).toBe('/parent/reports?quarter=current#summary');
  });

  it('rejects stale, auth, protocol-relative, external, and cross-role destinations', () => {
    const router = TestBed.inject(Router);
    expect(safeReturnUrl('/unauthorized', router, ['parent'])).toBeNull();
    expect(safeReturnUrl('/account/role-required', router, ['super_admin'])).toBeNull();
    expect(safeReturnUrl('/auth/login', router, ['parent'])).toBeNull();
    expect(safeReturnUrl('//example.invalid', router, ['parent'])).toBeNull();
    expect(safeReturnUrl('https://example.invalid', router, ['parent'])).toBeNull();
    expect(safeReturnUrl('/admin/users', router, ['parent'])).toBeNull();
  });
});

describe('session bootstrap error messages', () => {
  it('uses the unreachable message only for a network-classified error', () => {
    expect(authErrorMessage(new SessionBootstrapError('network'))).toContain('session service is unreachable');
    for (const kind of ['authentication', 'forbidden', 'not-found', 'rate-limit', 'server', 'unexpected'] as const)
      expect(authErrorMessage(new SessionBootstrapError(kind))).not.toContain('session service is unreachable');
  });

  it('preserves a safe backend request ID for support', () => {
    expect(authErrorMessage(new SessionBootstrapError('server', 'request-123'))).toContain(
      'Support reference: request-123',
    );
  });
});
