import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../auth/auth.service';
import { ApiClient } from '../http/api-client.service';
import { SessionUser } from '../models/domain.models';
import { ActiveOrganizationService } from './active-organization.service';
import { of } from 'rxjs';

describe('ActiveOrganizationService role isolation', () => {
  it('changes organization context through the backend without replacing effective platform roles', async () => {
    const session = signal<SessionUser>({
      uid: 'server-user',
      displayName: 'Administrator',
      roles: ['admin', 'super_admin'],
      platformRoles: ['super_admin'],
      disabled: false,
      onboardingStatus: 'complete',
      memberships: [
        { organizationId: 'organization-a', roles: ['admin'], status: 'active' },
        { organizationId: 'organization-b', roles: ['mentor'], status: 'active' },
      ],
      activeOrganizationId: 'organization-a',
    });
    TestBed.configureTestingModule({
      providers: [
        ActiveOrganizationService,
        {
          provide: AuthService,
          useValue: {
            user: session,
            roles: () => session().roles,
            refreshSession: async () =>
              session.update((value) => ({ ...value, activeOrganizationId: 'organization-b' })),
          },
        },
        { provide: ApiClient, useValue: { postData: () => of({}) } },
      ],
    });
    const organizations = TestBed.inject(ActiveOrganizationService);

    expect(organizations.hasRole('admin')).toBeTrue();
    expect(await organizations.selectWorkspace('organization', 'organization-b')).toBeTrue();
    expect(organizations.hasRole('admin')).toBeFalse();
    expect(session().roles).toEqual(['admin', 'super_admin']);
  });

  it('does not accept a stale server workspace outside current memberships', () => {
    const session = signal<SessionUser>({
      uid: 'server-user',
      displayName: 'Admin',
      roles: ['admin'],
      disabled: false,
      onboardingStatus: 'complete',
      memberships: [],
      activeOrganizationId: 'stale-organization',
    });
    TestBed.configureTestingModule({
      providers: [
        ActiveOrganizationService,
        { provide: AuthService, useValue: { user: session, roles: () => session().roles } },
        { provide: ApiClient, useValue: { postData: () => of({}) } },
      ],
    });
    const organizations = TestBed.inject(ActiveOrganizationService);

    expect(organizations.activeMembership()).toBeNull();
    expect(organizations.hasRole('admin')).toBeFalse();
  });
});
