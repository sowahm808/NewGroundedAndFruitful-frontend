import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthStatus, AuthService } from '../auth/auth.service';
import { SessionUser } from '../models/domain.models';
import { authGuard, guestGuard, onboardingGuard, personalWorkspaceGuard, roleGuard } from './auth.guards';

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
      platformRoles: ['super_admin'],
      disabled: false,
      onboardingStatus: 'complete',
      memberships: [],
    };
    finishInitialization?.();
    expect(await result).toBeTrue();
  });

  it('captures every guard dependency before asynchronous initialization completes', async () => {
    auth.state = 'authenticated';
    auth.session = {
      uid: '1',
      displayName: 'Organization owner',
      roles: [],
      disabled: false,
      onboardingStatus: 'organization_setup_required',
      nextStep: 'organization_setup',
      memberships: [],
    };
    auth.initialize = () => new Promise<void>((resolve) => setTimeout(resolve));

    const guardedRoutes = TestBed.runInInjectionContext(() => [
      authGuard({} as never, { url: '/parent' } as never),
      guestGuard({} as never, { url: '/auth/login' } as never),
      onboardingGuard({} as never, { url: '/onboarding/organization' } as never),
      roleGuard(['parent'])({} as never, {} as never),
    ]);
    const results = await Promise.all(guardedRoutes);

    const router = TestBed.inject(Router);
    expect(router.serializeUrl(results[0] as ReturnType<Router['createUrlTree']>)).toBe('/onboarding/organization');
    expect(router.serializeUrl(results[1] as ReturnType<Router['createUrlTree']>)).toBe('/onboarding/organization');
    expect(results[2]).toBeTrue();
    expect(router.serializeUrl(results[3] as ReturnType<Router['createUrlTree']>)).toBe('/onboarding/organization');
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
      activeWorkspaceId: 'org-1',
      workspaces: [{ id: 'org-1', type: 'organization', status: 'active' }],
      memberships: [{ organizationId: 'org-1', roles: ['mentor'], status: 'active' }],
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
      activeWorkspaceId: 'org-1',
      workspaces: [{ id: 'org-1', type: 'organization', status: 'active' }],
      memberships: [{ organizationId: 'org-1', roles: ['admin'], status: 'active' }],
    };
    const result = await TestBed.runInInjectionContext(() => roleGuard(['super_admin'])({} as never, {} as never));
    expect(TestBed.inject(Router).serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe('/unauthorized');
  });

  it('allows a verified personal owner into family routes but denies admin and platform routes', async () => {
    auth.state = 'authenticated';
    auth.session = {
      uid: '1',
      displayName: 'Personal owner',
      roles: ['owner'],
      effectiveRoles: ['owner'],
      platformRoles: [],
      disabled: false,
      onboardingStatus: 'complete',
      registrationIntent: 'personal',
      activeWorkspaceId: 'personal-1',
      workspaces: [{ id: 'personal-1', type: 'personal', status: 'active' }],
      memberships: [{ workspaceId: 'personal-1', workspaceRoles: ['owner'], status: 'active' }],
    };

    expect(await TestBed.runInInjectionContext(() => personalWorkspaceGuard({} as never, {} as never))).toBeTrue();
    const router = TestBed.inject(Router);
    for (const roles of [['admin'], ['super_admin']] as const) {
      const denied = await TestBed.runInInjectionContext(() => roleGuard(roles)({} as never, {} as never));
      expect(router.serializeUrl(denied as ReturnType<Router['createUrlTree']>)).toBe('/unauthorized');
    }
  });
});
