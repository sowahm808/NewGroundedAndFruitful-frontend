import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApiClient } from '../http/api-client.service';
import { ApiError } from '../http/api-error';
import { ApiResponse, SessionData } from '../models/domain.models';
import { AuthService } from './auth.service';
import { FIREBASE_AUTH } from './firebase-auth.token';
import { normalizeRoles, roleDestination } from './role.utilities';

describe('backend role boundary', () => {
  it('normalizes every legacy alias and rejects unknown values', () => {
    expect(
      normalizeRoles([
        ' participant ',
        'guardian',
        'authorizedAdult',
        'authorized_adult',
        'authorized-adult',
        'administrator',
        'superAdmin',
        'super-admin',
        'OWNER',
        'parent',
      ]),
    ).toEqual(['child', 'parent', 'observer', 'admin', 'super_admin']);
  });

  it('selects every canonical destination with deterministic privilege priority', () => {
    expect(roleDestination(['child'])).toBe('/child/today');
    expect(roleDestination(['parent'])).toBe('/parent/children');
    expect(roleDestination(['mentor'])).toBe('/mentor/teams');
    expect(roleDestination(['observer'])).toBe('/observer/observations');
    expect(roleDestination(['admin'])).toBe('/admin/quarters');
    expect(roleDestination(['super_admin'])).toBe('/admin/users');
    expect(roleDestination(['child', 'parent', 'mentor'])).toBe('/mentor/teams');
    expect(roleDestination([])).toBeNull();
  });
});

describe('AuthService registration intent', () => {
  it('waits for Firebase auth, gets a token, sends the exact DTO, reloads the session, and can retry', async () => {
    const events: string[] = [];
    const user = {
      uid: 'new-user',
      email: 'person@example.com',
      getIdToken: jasmine.createSpy().and.callFake(async () => {
        events.push('token');
        return 'current-token';
      }),
    };
    const postData = jasmine.createSpy().and.returnValues(
      throwError(() => new ApiError(0, 'network_error', 'offline')),
      of({ intent: 'personal', nextStep: 'personal_workspace_setup' }),
    );
    const get = jasmine.createSpy().and.returnValue(
      of({
        data: {
          uid: 'new-user',
          displayName: 'Person',
          roles: [],
          disabled: false,
          onboardingStatus: 'profile_required',
          memberships: [],
          claimSynchronization: { status: 'synchronized', tokenRefreshRequired: false },
        },
      }),
    );
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: ApiClient, useValue: { postData, get } },
        {
          provide: FIREBASE_AUTH,
          useValue: {
            currentUser: user,
            authStateReady: async () => {
              events.push('auth-ready');
            },
          },
        },
      ],
    });
    const service = TestBed.inject(AuthService);
    const complete = (
      service as unknown as { completeRegistration(user: unknown, intent: string): Promise<unknown> }
    ).completeRegistration.bind(service);

    await expectAsync(complete(user, 'personal')).toBeRejected();
    const result = (await complete(user, 'personal')) as { intentResult: { nextStep: string } };

    expect(events).toEqual(['auth-ready', 'token', 'auth-ready', 'token']);
    expect(user.getIdToken).toHaveBeenCalledTimes(2);
    expect(user.getIdToken).toHaveBeenCalledWith(false);
    expect(postData.calls.allArgs()).toEqual([
      ['/auth/registration-intent', { intent: 'personal' }],
      ['/auth/registration-intent', { intent: 'personal' }],
    ]);
    expect(get).toHaveBeenCalledOnceWith('/auth/session');
    expect(result.intentResult.nextStep).toBe('personal_workspace_setup');
  });
});

describe('AuthService backend session bootstrap', () => {
  const backendSession = (
    tokenRefreshRequired: boolean,
    roles: SessionData['roles'] = ['super_admin'],
  ): ApiResponse<SessionData> => ({
    data: {
      uid: 'firebase-uid',
      email: 'admin@example.com',
      displayName: 'Admin User',
      roles,
      platformRoles: roles.includes('super_admin') ? ['super_admin'] : [],
      disabled: false,
      onboardingStatus: 'complete',
      memberships: [],
      claimSynchronization: {
        status: tokenRefreshRequired ? 'refresh_required' : 'synchronized',
        tokenRefreshRequired,
      },
    },
  });

  let getSession: jasmine.Spy;
  let getIdToken: jasmine.Spy;
  let auth: AuthService;

  beforeEach(() => {
    getSession = jasmine.createSpy('get').and.returnValue(of(backendSession(false)));
    getIdToken = jasmine.createSpy('getIdToken').and.resolveTo('refreshed-token');
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: ApiClient, useValue: { get: getSession } },
        {
          provide: FIREBASE_AUTH,
          useValue: { currentUser: { uid: 'firebase-uid', getIdToken } },
        },
      ],
    });
    auth = TestBed.inject(AuthService);
  });

  it('unwraps response.data and preserves the authoritative complete super-admin session', async () => {
    const session = await auth.retrySession();

    expect(session).toEqual({
      uid: 'firebase-uid',
      email: 'admin@example.com',
      displayName: 'Admin User',
      roles: ['super_admin'],
      platformRoles: ['super_admin'],
      disabled: false,
      onboardingStatus: 'complete',
      memberships: [],
    });
    expect(auth.status()).toBe('authenticated');
    expect(roleDestination(session?.roles ?? [])).toBe('/admin/users');
  });

  it('forces one token refresh and makes exactly one follow-up request', async () => {
    getSession.and.returnValues(of(backendSession(true)), of(backendSession(false)));

    await auth.retrySession();

    expect(getIdToken).toHaveBeenCalledOnceWith(true);
    expect(getSession).toHaveBeenCalledTimes(2);
    expect(auth.user()?.roles).toEqual(['super_admin']);
  });

  it('does not force the token twice when a mutation already requested a forced refresh', async () => {
    getSession.and.returnValue(of(backendSession(true)));

    await auth.refreshSession(true);

    expect(getIdToken).toHaveBeenCalledOnceWith(true);
    expect(getSession).toHaveBeenCalledTimes(1);
  });

  it('refreshes at most once while the same synchronization event remains pending', async () => {
    getSession.and.returnValue(of(backendSession(true)));

    await auth.retrySession();
    await auth.retrySession();

    expect(getIdToken).toHaveBeenCalledTimes(1);
    expect(getSession).toHaveBeenCalledTimes(3);
  });

  it('keeps effective, platform, and membership roles separate', async () => {
    const response = backendSession(false, ['super_admin', 'admin']);
    getSession.and.returnValue(
      of({
        data: {
          ...response.data,
          platformRoles: ['super_admin'],
          activeOrganizationId: 'organization-a',
          memberships: [{ organizationId: 'organization-a', roles: ['admin'], status: 'active' }],
        },
      }),
    );

    await auth.retrySession();

    expect(auth.roles()).toEqual(['admin', 'super_admin']);
    expect(auth.platformRoles()).toEqual(['super_admin']);
    expect(auth.user()?.memberships[0].roles).toEqual(['admin']);
  });

  it('does not loop or discard backend roles when synchronization is still pending', async () => {
    getSession.and.returnValues(of(backendSession(true)), of(backendSession(true)));

    await auth.retrySession();

    expect(getIdToken).toHaveBeenCalledTimes(1);
    expect(getSession).toHaveBeenCalledTimes(2);
    expect(auth.user()?.roles).toEqual(['super_admin']);
    expect(auth.status()).toBe('authenticated');
    expect(auth.sessionSynchronizationWarning()).toContain('backend session roles');
  });

  it('routes an empty-role backend session to role-required', async () => {
    getSession.and.returnValue(of(backendSession(false, [])));

    await auth.retrySession();

    expect(auth.status()).toBe('role-required');
  });

  it('treats organization-required and contradictory migration state as account setup', () => {
    const session = backendSession(false).data;
    auth.restore({ ...session, onboardingStatus: 'organization_required' });
    expect(auth.status()).toBe('organization-required');
    auth.restore({ ...session, authorization: { source: 'legacy_user_profile', migrationRequired: true } });
    expect(auth.status()).toBe('organization-required');
  });

  it('uses canonical membership state for pending and suspended accounts', () => {
    const session = backendSession(false).data;
    auth.restore({ ...session, memberships: [{ status: 'pending' }] });
    expect(auth.status()).toBe('pending-approval');

    auth.restore({ ...session, memberships: [{ status: 'suspended' }] });
    expect(auth.status()).toBe('disabled');

    auth.restore({ ...session, memberships: [{ status: 'active' }, { status: 'pending' }] });
    expect(auth.status()).toBe('authenticated');
  });
});
