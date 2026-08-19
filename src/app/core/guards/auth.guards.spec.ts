import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthStatus, AuthService } from '../auth/auth.service';
import { SessionUser } from '../models/domain.models';
import { authGuard, roleGuard } from './auth.guards';

class AuthStub {
  state: AuthStatus = 'anonymous';
  session: SessionUser | null = null;
  initialized = false;
  status = () => this.state;
  initialize = async () => {
    this.initialized = true;
  };
  hasRole = (roles: readonly string[]) => this.session?.roles.some((role) => roles.includes(role)) ?? false;
}

describe('authentication guards', () => {
  let auth: AuthStub;
  beforeEach(() => {
    auth = new AuthStub();
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthService, useValue: auth }] });
  });

  it('waits for initialization and redirects anonymous users with the attempted URL', async () => {
    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/parent/reports?quarter=current' } as never),
    );
    expect(auth.initialized).toBeTrue();
    expect(TestBed.inject(Router).serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe(
      '/auth/login?returnUrl=%2Fparent%2Freports%3Fquarter%3Dcurrent',
    );
  });

  it('redirects a role-less account separately and a wrong role to unauthorized', async () => {
    auth.state = 'role-required';
    let result = await TestBed.runInInjectionContext(() => roleGuard(['parent'])({} as never, {} as never));
    expect(TestBed.inject(Router).serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe(
      '/account/role-required',
    );
    auth.state = 'authenticated';
    auth.session = { uid: '1', displayName: 'Mentor', roles: ['mentor'], disabled: false, membershipState: 'active' };
    result = await TestBed.runInInjectionContext(() => roleGuard(['parent'])({} as never, {} as never));
    expect(TestBed.inject(Router).serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe('/unauthorized');
  });
});
