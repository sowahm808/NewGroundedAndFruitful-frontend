import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { authGuard, roleGuard } from './auth.guards';
describe('roleGuard', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));
  it('allows only a verified session role', () => {
    const auth = TestBed.inject(AuthService);
    auth.restore({ uid: '1', displayName: 'Parent', roles: ['parent'], disabled: false });
    expect(TestBed.runInInjectionContext(() => roleGuard(['parent'])({} as never, {} as never))).toBeTrue();
    expect(TestBed.runInInjectionContext(() => roleGuard(['admin'])({} as never, {} as never))).toEqual(
      TestBed.inject(Router).createUrlTree(['/unauthorized']),
    );
  });
  it('preserves a protected in-app destination for sign-in recovery', () => {
    const auth = TestBed.inject(AuthService);
    auth.restore(null);
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/parent/reports?quarter=current' } as never),
    );
    expect(TestBed.inject(Router).serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe(
      '/auth/login?returnUrl=%2Fparent%2Freports%3Fquarter%3Dcurrent',
    );
  });
});
