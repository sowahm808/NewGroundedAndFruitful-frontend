import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiClient } from '../http/api-client.service';
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
    expect(roleDestination(['admin'])).toBe('/admin/users');
    expect(roleDestination(['super_admin'])).toBe('/admin/users');
    expect(roleDestination(['child', 'parent', 'mentor'])).toBe('/mentor/teams');
    expect(roleDestination([])).toBeNull();
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
