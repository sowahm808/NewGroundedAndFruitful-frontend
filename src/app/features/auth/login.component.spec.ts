import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { safeReturnUrl } from './login.component';

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
    expect(safeReturnUrl('/auth/login', router, ['parent'])).toBeNull();
    expect(safeReturnUrl('//example.invalid', router, ['parent'])).toBeNull();
    expect(safeReturnUrl('https://example.invalid', router, ['parent'])).toBeNull();
    expect(safeReturnUrl('/admin/users', router, ['parent'])).toBeNull();
  });
});
