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

  it('does not evaluate roles while backend session initialization is pending', async () => {
    auth.state = 'loading-session';
    let finishInitialization: (() => void) | undefined;
    auth.initialize = () => new Promise<void>((resolve) => (finishInitialization = resolve));

    let settled = false;
    const result = Promise.resolve(
      TestBed.runInInjectionContext(() => roleGuard(['super_admin'])({} as never, {} as never)),
    );
    void result.then(() => (settled = true));
    await Promise.resolve();
    expect(settled).toBeFalse();

    auth.state = 'authenticated';
    auth.session = {
      uid: '1',
      displayName: 'Admin',
      roles: ['super_admin'],
      disabled: false,
      onboardingStatus: 'complete',
      memberships: [],
    };
    finishInitialization?.();
    expect(await result).toBeTrue();
  });

  it('redirects a role-less account separately and a wrong role to unauthorized', async () => {
    auth.state = 'role-required';
    let result = await TestBed.runInInjectionContext(() => roleGuard(['parent'])({} as never, {} as never));
    expect(TestBed.inject(Router).serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe(
      '/account/role-required',
    );
    auth.state = 'authenticated';
    auth.session = {
      uid: '1',
      displayName: 'Mentor',
      roles: ['mentor'],
      disabled: false,
      onboardingStatus: 'complete',
      memberships: [],
    };
    result = await TestBed.runInInjectionContext(() => roleGuard(['parent'])({} as never, {} as never));
    expect(TestBed.inject(Router).serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe('/unauthorized');
  });

  it('keeps direct super-admin routes unavailable to admin-only sessions', async () => {
    auth.state = 'authenticated';
    auth.session = {
      uid: '1',
      displayName: 'Organization admin',
      roles: ['admin'],
      disabled: false,
      onboardingStatus: 'complete',
      memberships: [{ roles: ['admin'], status: 'active' }],
    };
    const result = await TestBed.runInInjectionContext(() => roleGuard(['super_admin'])({} as never, {} as never));
    expect(TestBed.inject(Router).serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe('/unauthorized');
  });
});
