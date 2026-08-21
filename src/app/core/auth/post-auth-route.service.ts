import { Injectable, inject } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { SessionMembership, SessionUser, UserRole, WorkspaceType } from '../models/domain.models';
import { roleDestination } from './role.utilities';

export type PostAuthReason =
  | 'unauthenticated'
  | 'disabled'
  | 'registration-intent'
  | 'personal-setup'
  | 'organization-setup'
  | 'workspace-recovery'
  | 'dashboard'
  | 'role-required'
  | 'account-state-recovery';

export interface PostAuthDecision {
  /** Canonical destination; `path` is retained for existing Angular callers. */
  readonly destination: string;
  readonly path: string;
  readonly reason: PostAuthReason;
  readonly workspaceType?: WorkspaceType;
  readonly recoveryAction?: 'select-workspace' | 'restore-workspace' | 'contact-support';
}

const organizationRoles: readonly UserRole[] = ['child', 'parent', 'mentor', 'observer', 'admin'];

/** Pure policy boundary. It only interprets a fully hydrated, authoritative backend session. */
export function resolvePostAuthDestination(session: SessionUser | null | undefined): PostAuthDecision {
  const decision = decidePostAuthDestination(session);
  return { ...decision, destination: decision.path };
}

type InternalPostAuthDecision = Omit<PostAuthDecision, 'destination'>;

function decidePostAuthDestination(session: SessionUser | null | undefined): InternalPostAuthDecision {
  if (!session) return { path: '/auth/login', reason: 'unauthenticated' };
  if (session.disabled || session.memberships.some((membership) => membership.status === 'suspended'))
    return { path: '/account/disabled', reason: 'disabled' };
  if (session.nextStep === 'registration_intent' || session.onboardingStatus === 'registration_intent_required')
    return { path: '/onboarding/account-type', reason: 'registration-intent' };
  if (
    session.nextStep === 'personal_workspace_setup' ||
    session.onboardingStatus === 'personal_workspace_required' ||
    session.onboardingStatus === 'profile_required'
  )
    return { path: '/onboarding/personal', reason: 'personal-setup', workspaceType: 'personal' };
  if (
    session.nextStep === 'organization_setup' ||
    session.onboardingStatus === 'organization_setup_required' ||
    session.onboardingStatus === 'organization_required' ||
    session.onboardingStatus === 'migration_required'
  )
    return { path: '/onboarding/organization', reason: 'organization-setup', workspaceType: 'organization' };
  if (session.onboardingStatus === 'role_required') return resolveRoleRequiredDestination(session);
  if (session.onboardingStatus === 'pending_approval')
    return { path: '/account/pending', reason: 'workspace-recovery', recoveryAction: 'restore-workspace' };
  if (session.onboardingStatus !== 'complete')
    return { path: '/account/role-required', reason: 'account-state-recovery', recoveryAction: 'contact-support' };

  // Platform administration is independent of a workspace and must remain an explicit backend authority.
  if (session.platformRoles?.includes('super_admin')) return { path: '/admin/users', reason: 'dashboard' };

  const workspaces = session.workspaces ?? [];
  const activeWorkspace = workspaces.find(
    (workspace) => workspace.id === session.activeWorkspaceId && workspace.status !== 'deleted',
  );
  if (!activeWorkspace)
    return {
      path: '/account/profile',
      reason: 'workspace-recovery',
      recoveryAction: workspaces.length > 0 ? 'select-workspace' : 'restore-workspace',
    };

  const activeMembership = session.memberships.find(
    (membership) => membership.status === 'active' && membershipReferencesWorkspace(membership, activeWorkspace.id),
  );
  if (!activeMembership)
    return {
      path: '/account/profile',
      reason: 'workspace-recovery',
      workspaceType: activeWorkspace.type,
      recoveryAction: 'restore-workspace',
    };

  if (activeWorkspace.type === 'personal') {
    const membershipRoles = [...(activeMembership.workspaceRoles ?? []), ...(activeMembership.roles ?? [])];
    if (session.registrationIntent === 'personal' && membershipRoles.includes('owner'))
      return { path: '/parent/children', reason: 'dashboard', workspaceType: 'personal' };
    return {
      path: '/account/profile',
      reason: 'workspace-recovery',
      workspaceType: 'personal',
      recoveryAction: 'restore-workspace',
    };
  }

  const effectiveRoles = session.effectiveRoles ?? session.roles;
  const membershipRoles = activeMembership.roles ?? [];
  const recognizedRoles = effectiveRoles.filter(
    (role) => organizationRoles.includes(role) && membershipRoles.includes(role),
  );
  const dashboard = roleDestination(recognizedRoles);
  return dashboard
    ? { path: dashboard, reason: 'dashboard', workspaceType: 'organization' }
    : { path: '/account/role-required', reason: 'role-required', workspaceType: 'organization' };
}

/** Resolves an incomplete account exclusively from backend-provided intent and membership state. */
function resolveRoleRequiredDestination(session: SessionUser): InternalPostAuthDecision {
  if (session.memberships.some((membership) => membership.status === 'pending'))
    return { path: '/account/pending', reason: 'workspace-recovery', recoveryAction: 'restore-workspace' };
  if (session.registrationIntent === 'personal')
    return { path: '/onboarding/personal', reason: 'personal-setup', workspaceType: 'personal' };
  if (session.registrationIntent === 'organization')
    return { path: '/onboarding/organization', reason: 'organization-setup', workspaceType: 'organization' };
  return { path: '/account/role-required', reason: 'role-required', recoveryAction: 'contact-support' };
}

function membershipReferencesWorkspace(membership: SessionMembership, workspaceId: string): boolean {
  return membership.workspaceId === workspaceId || membership.organizationId === workspaceId;
}

/** Converts the pure policy result to Angular navigation after hydration has completed. */
@Injectable({ providedIn: 'root' })
export class PostAuthRouteCoordinator {
  private readonly router = inject(Router);

  decision(session: SessionUser): PostAuthDecision {
    return resolvePostAuthDestination(session);
  }

  resolvePostAuthenticationRoute(session: SessionUser, currentUrl: string): UrlTree | null {
    const target = this.decision(session).path;
    return normalizePath(currentUrl) === target ? null : this.router.parseUrl(target);
  }
}

function normalizePath(url: string): string {
  return url.split(/[?#]/, 1)[0].replace(/\/$/, '') || '/';
}
