import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { PostAuthRouteCoordinator } from '../auth/post-auth-route.service';
import { UserRole } from '../models/domain.models';
import { ActiveOrganizationService } from '../organizations/active-organization.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const coordinator = inject(PostAuthRouteCoordinator);
  await auth.initialize();
  if (auth.status() === 'anonymous')
    return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: safeAttemptedUrl(state.url) } });
  if (auth.status() === 'error') return router.createUrlTree(['/account/session-error']);
  const user = auth.user();
  if (!user) return router.createUrlTree(['/account/session-error']);
  const decision = coordinator.decision(user);
  if (decision.reason === 'dashboard') return true;
  return coordinator.resolvePostAuthenticationRoute(user, state.url) ?? true;
};

export const guestGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const coordinator = inject(PostAuthRouteCoordinator);
  await auth.initialize();
  if (auth.status() === 'anonymous') return true;
  if (auth.status() === 'error') return router.createUrlTree(['/account/session-error']);
  const user = auth.user();
  return user
    ? (coordinator.resolvePostAuthenticationRoute(user, state.url) ?? true)
    : router.createUrlTree(['/account/session-error']);
};

/** Allows only the exact onboarding journey selected by the authoritative session. */
export const onboardingGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const coordinator = inject(PostAuthRouteCoordinator);
  await auth.initialize();
  if (auth.status() === 'anonymous') return router.createUrlTree(['/auth/login']);
  if (auth.status() === 'error') return router.createUrlTree(['/account/session-error']);
  const user = auth.user();
  if (!user) return router.createUrlTree(['/account/session-error']);
  return coordinator.resolvePostAuthenticationRoute(user, state.url) ?? true;
};

export const organizationSetupGuard = onboardingGuard;

export const roleGuard =
  (roles: readonly UserRole[]): CanActivateFn =>
  async () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const coordinator = inject(PostAuthRouteCoordinator);
    await auth.initialize();
    const user = auth.user();
    if (!user) return router.createUrlTree(['/auth/login']);
    const onboarding = coordinator.decision(user);
    if (onboarding.reason !== 'dashboard' && onboarding.reason !== 'role-required')
      return router.parseUrl(onboarding.path);
    return (
      auth.hasRole(roles) ||
      router.createUrlTree([onboarding.reason === 'role-required' ? '/account/role-required' : '/unauthorized'])
    );
  };

export const organizationRoleGuard =
  (role: UserRole): CanActivateFn =>
  async () => {
    const auth = inject(AuthService);
    const organizations = inject(ActiveOrganizationService);
    const router = inject(Router);
    await auth.initialize();
    return organizations.hasRole(role) || router.createUrlTree(['/unauthorized']);
  };

/** Allows the family area to program parents or to the verified owner of the active personal workspace. */
export const personalWorkspaceGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const coordinator = inject(PostAuthRouteCoordinator);
  await auth.initialize();
  const user = auth.user();
  if (!user) return router.createUrlTree(['/auth/login']);
  const decision = coordinator.decision(user);
  return (
    auth.hasRole(['parent']) ||
    (decision.reason === 'dashboard' && decision.workspaceType === 'personal') ||
    router.createUrlTree(['/unauthorized'])
  );
};

export function safeAttemptedUrl(url: string): string {
  const rejected = ['/account/role-required', '/unauthorized', '/login', '/auth/'];
  // eslint-disable-next-line no-control-regex -- URLs containing control bytes are deliberately rejected.
  if (!url.startsWith('/') || url.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(url)) return '/';
  try {
    decodeURIComponent(url);
  } catch {
    return '/';
  }
  return !rejected.some((path) => url === path || url.startsWith(path)) ? url : '/';
}
