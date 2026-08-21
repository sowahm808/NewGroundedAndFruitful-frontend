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
  | 'invitation'
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
  // nextStep is the backend's canonical account-state projection. Do not reconstruct it from
  // empty role, membership, or workspace arrays: those shapes are inherently ambiguous.
  switch (session.nextStep) {
    case 'choose_account_type':
      return { path: '/onboarding/account-type', reason: 'registration-intent' };
    case 'personal_workspace_setup':
      return { path: '/onboarding/personal', reason: 'personal-setup', workspaceType: 'personal' };
    case 'organization_setup':
      return { path: '/onboarding/organization', reason: 'organization-setup', workspaceType: 'organization' };
    case 'accept_invitation':
      return { path: '/account/invitation', reason: 'invitation' };
    case 'await_role_assignment':
      return { path: '/account/role-required', reason: 'role-required', workspaceType: 'organization' };
    case 'account_recovery':
      return { path: '/account/recovery', reason: 'account-state-recovery', recoveryAction: 'contact-support' };
    case 'dashboard':
      break;
    default:
      return { path: '/account/recovery', reason: 'account-state-recovery', recoveryAction: 'contact-support' };
  }

  if (session.onboardingStatus !== 'complete')
    return { path: '/account/recovery', reason: 'account-state-recovery', recoveryAction: 'contact-support' };

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
    if (session.personas?.includes('parent') && session.capabilities?.includes('parent.children.read'))
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
