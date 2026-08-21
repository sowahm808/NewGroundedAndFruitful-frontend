import { Injectable, inject } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { SessionUser, UserRole } from '../models/domain.models';
import { roleDestination } from './role.utilities';

export type PostAuthReason =
  | 'disabled'
  | 'registration-intent'
  | 'personal-setup'
  | 'organization-setup'
  | 'workspace-recovery'
  | 'dashboard'
  | 'role-required'
  | 'invalid-onboarding-state';

export interface PostAuthDecision {
  readonly path: string;
  readonly reason: PostAuthReason;
}

/** The single policy boundary for all navigation after a backend session is available. */
@Injectable({ providedIn: 'root' })
export class PostAuthRouteCoordinator {
  private readonly router = inject(Router);

  decision(session: SessionUser): PostAuthDecision {
    if (session.disabled || session.memberships.some((membership) => membership.status === 'suspended'))
      return { path: '/account/disabled', reason: 'disabled' };
    if (session.nextStep === 'registration_intent' || session.onboardingStatus === 'registration_intent_required')
      return { path: '/onboarding/account-type', reason: 'registration-intent' };
    if (
      session.nextStep === 'personal_workspace_setup' ||
      session.onboardingStatus === 'personal_workspace_required' ||
      session.onboardingStatus === 'profile_required'
    )
      return { path: '/onboarding/personal', reason: 'personal-setup' };
    if (
      session.nextStep === 'organization_setup' ||
      session.onboardingStatus === 'organization_setup_required' ||
      session.onboardingStatus === 'organization_required' ||
      session.onboardingStatus === 'migration_required'
    )
      return { path: '/onboarding/organization', reason: 'organization-setup' };
    if (session.onboardingStatus !== 'complete') {
      if (session.onboardingStatus === 'pending_approval')
        return { path: '/account/pending', reason: 'workspace-recovery' };
      return { path: '/account/session-error', reason: 'invalid-onboarding-state' };
    }

    const workspaces = session.workspaces ?? [
      ...(session.personalWorkspace ? [{ type: 'personal' as const, id: session.personalWorkspace.id }] : []),
      ...session.memberships
        .filter((membership) => membership.status === 'active' && membership.organizationId)
        .map((membership) => ({ type: 'organization' as const, id: membership.organizationId! })),
    ];
    if (workspaces.length > 1 && !session.activeWorkspace)
      return { path: '/account/profile', reason: 'workspace-recovery' };

    const effectiveRoles: readonly UserRole[] = session.effectiveRoles ?? session.roles;
    const dashboard = roleDestination(effectiveRoles);
    return dashboard
      ? { path: dashboard, reason: 'dashboard' }
      : { path: '/account/role-required', reason: 'role-required' };
  }

  resolvePostAuthenticationRoute(session: SessionUser, currentUrl: string): UrlTree | null {
    const target = this.decision(session).path;
    return normalizePath(currentUrl) === target ? null : this.router.parseUrl(target);
  }
}

function normalizePath(url: string): string {
  return url.split(/[?#]/, 1)[0].replace(/\/$/, '') || '/';
}
