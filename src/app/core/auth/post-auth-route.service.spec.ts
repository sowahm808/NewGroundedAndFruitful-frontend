import { SessionUser } from '../models/domain.models';
import { resolvePostAuthDestination } from './post-auth-route.service';

describe('resolvePostAuthDestination', () => {
  const session = (changes: Partial<SessionUser> = {}): SessionUser => ({
    uid: 'user',
    displayName: 'Person',
    roles: [],
    disabled: false,
    onboardingStatus: 'complete',
    memberships: [],
    ...changes,
  });
  const personalOwner = (changes: Partial<SessionUser> = {}): SessionUser =>
    session({
      roles: ['owner'],
      effectiveRoles: ['owner'],
      workspaceRoles: ['owner'],
      personas: ['parent'],
      capabilities: ['parent.children.read'],
      platformRoles: [],
      registrationIntent: 'personal',
      nextStep: 'dashboard',
      activeWorkspaceId: 'personal-1',
      workspaces: [{ id: 'personal-1', type: 'personal', name: 'Personal', status: 'active', roles: ['owner'] }],
      memberships: [
        {
          organizationId: 'personal-1',
          workspaceId: 'personal-1',
          workspaceRoles: ['owner'],
          roles: ['owner'],
          status: 'active',
        },
      ],
      ...changes,
    });

  it('routes an absent session to login', () => {
    expect(resolvePostAuthDestination(null)).toEqual({
      destination: '/auth/login',
      path: '/auth/login',
      reason: 'unauthenticated',
    });
  });

  it('safely recovers an HTTP-success role-required account whose canonical nextStep is missing', () => {
    const decision = resolvePostAuthDestination(
      session({ onboardingStatus: 'role_required', roles: [], memberships: [], workspaces: [] }),
    );
    expect(decision).toEqual({
      destination: '/account/recovery',
      path: '/account/recovery',
      reason: 'account-state-recovery',
      recoveryAction: 'contact-support',
    });
    expect(decision.path).not.toBe('/account/session-error');
  });

  it('routes a pending invitation to pending acceptance', () => {
    expect(
      resolvePostAuthDestination(
        session({ onboardingStatus: 'invitation_required', nextStep: 'accept_invitation', pendingInvitation: true }),
      ).path,
    ).toBe('/account/invitation');
  });

  it('does not use registration intent as a substitute for nextStep', () => {
    expect(
      resolvePostAuthDestination(session({ onboardingStatus: 'role_required', registrationIntent: 'personal' })).path,
    ).toBe('/account/recovery');
    expect(
      resolvePostAuthDestination(session({ onboardingStatus: 'role_required', registrationIntent: 'organization' }))
        .path,
    ).toBe('/account/recovery');
  });

  it('routes every canonical setup state and unknown states without using session-error', () => {
    expect(
      resolvePostAuthDestination(
        session({ onboardingStatus: 'personal_workspace_required', nextStep: 'personal_workspace_setup' }),
      ).path,
    ).toBe('/onboarding/personal');
    expect(
      resolvePostAuthDestination(
        session({ onboardingStatus: 'organization_setup_required', nextStep: 'organization_setup' }),
      ).path,
    ).toBe('/onboarding/organization');
    const unknown = resolvePostAuthDestination(
      session({ onboardingStatus: 'future_state' as SessionUser['onboardingStatus'] }),
    );
    expect(unknown.path).toBe('/account/recovery');
    expect(unknown.reason).toBe('account-state-recovery');
  });

  it('routes the supplied complete personal owner session to the established family dashboard', () => {
    const decision = resolvePostAuthDestination(personalOwner());
    expect(decision).toEqual({
      destination: '/parent/children',
      path: '/parent/children',
      reason: 'dashboard',
      workspaceType: 'personal',
    });
    expect(decision.path).not.toBe('/account/role-required');
  });

  it('accepts server-issued parent capability independently from workspace ownership', () => {
    expect(personalOwner().effectiveRoles).toContain('owner');
    expect(resolvePostAuthDestination(personalOwner({ platformRoles: [] })).reason).toBe('dashboard');
  });

  it('does not manufacture a parent experience from personal intent and ownership', () => {
    expect(resolvePostAuthDestination(personalOwner({ personas: [], capabilities: [] })).path).toBe('/account/profile');
  });

  it('requires activeWorkspaceId to reference the personal workspace', () => {
    const decision = resolvePostAuthDestination(personalOwner({ activeWorkspaceId: 'somewhere-else' }));
    expect(decision.reason).toBe('workspace-recovery');
    expect(decision.path).toBe('/account/profile');
  });

  it('requires an active membership for a personal workspace without requiring ownership', () => {
    const decision = resolvePostAuthDestination(
      personalOwner({ memberships: [{ workspaceId: 'personal-1', personas: ['parent'], status: 'pending' }] }),
    );
    expect(decision.reason).toBe('workspace-recovery');
  });

  it('keeps personal and organization onboarding separate', () => {
    expect(resolvePostAuthDestination(session({ nextStep: 'personal_workspace_setup' })).path).toBe(
      '/onboarding/personal',
    );
    expect(resolvePostAuthDestination(session({ nextStep: 'organization_setup' })).path).toBe(
      '/onboarding/organization',
    );
  });

  it('routes a completed session without a workspace to recovery rather than role-required', () => {
    const decision = resolvePostAuthDestination(session());
    expect(decision).toEqual({
      destination: '/account/profile',
      path: '/account/profile',
      reason: 'workspace-recovery',
      recoveryAction: 'restore-workspace',
    });
  });

  it('preserves organization admin routing with an active admin membership', () => {
    const decision = resolvePostAuthDestination(
      session({
        roles: ['admin'],
        effectiveRoles: ['admin'],
        activeWorkspaceId: 'org-1',
        workspaces: [{ id: 'org-1', type: 'organization', status: 'active' }],
        memberships: [{ organizationId: 'org-1', roles: ['admin'], status: 'active' }],
      }),
    );
    expect(decision).toEqual({
      destination: '/admin/quarters',
      path: '/admin/quarters',
      reason: 'dashboard',
      workspaceType: 'organization',
    });
  });

  it('uses role-required only for an organization membership missing a program role', () => {
    const decision = resolvePostAuthDestination(
      session({
        activeWorkspaceId: 'org-1',
        workspaces: [{ id: 'org-1', type: 'organization', status: 'active' }],
        memberships: [{ organizationId: 'org-1', roles: [], status: 'active' }],
        onboardingStatus: 'role_required',
        nextStep: 'await_role_assignment',
      }),
    );
    expect(decision).toEqual({
      destination: '/account/role-required',
      path: '/account/role-required',
      reason: 'role-required',
      workspaceType: 'organization',
    });
  });

  it('routes a disabled session before considering its workspace', () => {
    expect(resolvePostAuthDestination(personalOwner({ disabled: true })).path).toBe('/account/disabled');
  });

  it('preserves platform administration as an explicit platform authority', () => {
    expect(resolvePostAuthDestination(session({ roles: ['super_admin'], platformRoles: ['super_admin'] })).path).toBe(
      '/admin/users',
    );
  });
});
