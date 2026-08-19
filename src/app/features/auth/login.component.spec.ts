import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { safeReturnUrl } from './login.component';

describe('safeReturnUrl', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  it('accepts an application path with its query string', () => {
    const router = TestBed.inject(Router);
    expect(router.serializeUrl(safeReturnUrl('/parent/reports?quarter=current', router)!)).toBe(
      '/parent/reports?quarter=current',
    );
  });

  it('rejects external, protocol-relative, and malformed destinations', () => {
    const router = TestBed.inject(Router);
    expect(safeReturnUrl('https://example.invalid', router)).toBeNull();
    expect(safeReturnUrl('//example.invalid', router)).toBeNull();
    expect(safeReturnUrl(null, router)).toBeNull();
  });
});
