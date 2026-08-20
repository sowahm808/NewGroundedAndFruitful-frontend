import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserRole } from '../models/domain.models';
import { AuthService } from '../auth/auth.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.initialize();
  if (auth.status() === 'anonymous')
    return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: safeAttemptedUrl(state.url) } });
  if (auth.status() === 'organization-required') return router.createUrlTree(['/onboarding/organization']);
  if (auth.status() === 'role-required') return router.createUrlTree(['/account/role-required']);
  if (auth.status() === 'pending-approval') return router.createUrlTree(['/account/pending']);
  if (auth.status() === 'disabled') return router.createUrlTree(['/account/disabled']);
  if (auth.status() === 'error') return router.createUrlTree(['/account/session-error']);
  return auth.status() === 'authenticated';
};
export const organizationSetupGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.initialize();
  if (auth.status() === 'anonymous') return router.createUrlTree(['/auth/login']);
  if (auth.status() === 'error') return router.createUrlTree(['/account/session-error']);
  if (auth.status() === 'disabled') return router.createUrlTree(['/account/disabled']);
  if (auth.status() === 'authenticated') return router.createUrlTree([dashboardFor(auth.roles())]);
  return auth.status() === 'organization-required';
};
export const roleGuard =
  (roles: readonly UserRole[]): CanActivateFn =>
  async () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    await auth.initialize();
    if (auth.status() === 'role-required') return router.createUrlTree(['/account/role-required']);
    return auth.hasRole(roles) || router.createUrlTree(['/unauthorized']);
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

function dashboardFor(roles: readonly UserRole[]): string {
  if (roles.includes('super_admin') || roles.includes('admin')) return '/admin/quarters';
  if (roles.includes('mentor')) return '/mentor/teams';
  if (roles.includes('observer')) return '/observer/observations';
  if (roles.includes('parent')) return '/parent/children';
  return '/child/today';
}
