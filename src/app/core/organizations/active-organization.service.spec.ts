import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../auth/auth.service';
import { SessionUser } from '../models/domain.models';
import { ActiveOrganizationService } from './active-organization.service';

describe('ActiveOrganizationService role isolation', () => {
  it('changes organization context without replacing effective platform roles', () => {
    localStorage.clear();
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
        { provide: AuthService, useValue: { user: session, roles: () => session().roles } },
      ],
    });
    const organizations = TestBed.inject(ActiveOrganizationService);

    expect(organizations.hasRole('admin')).toBeTrue();
    expect(organizations.select('organization-b')).toBeTrue();
    expect(organizations.hasRole('admin')).toBeFalse();
    expect(session().roles).toEqual(['admin', 'super_admin']);
  });

  it('does not accept a stale cached organization outside server memberships', () => {
    localStorage.setItem('gf.activeOrganizationId', 'stale-organization');
    const session = signal<SessionUser>({
      uid: 'server-user',
      displayName: 'Admin',
      roles: ['admin'],
      disabled: false,
      onboardingStatus: 'complete',
      memberships: [],
    });
    TestBed.configureTestingModule({
      providers: [
        ActiveOrganizationService,
        { provide: AuthService, useValue: { user: session, roles: () => session().roles } },
      ],
    });
    const organizations = TestBed.inject(ActiveOrganizationService);

    expect(organizations.activeMembership()).toBeNull();
    expect(organizations.hasRole('admin')).toBeFalse();
  });
});
