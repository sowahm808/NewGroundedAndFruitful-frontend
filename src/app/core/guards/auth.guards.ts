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
  if (auth.status() === 'role-required') return router.createUrlTree(['/account/role-required']);
  if (auth.status() === 'pending-approval') return router.createUrlTree(['/account/pending']);
  if (auth.status() === 'disabled') return router.createUrlTree(['/account/disabled']);
  if (auth.status() === 'error') return router.createUrlTree(['/account/session-error']);
  return auth.status() === 'authenticated';
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
  if (!url.startsWith('/') || url.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(url)) return '/';
  try {
    decodeURIComponent(url);
  } catch {
    return '/';
  }
  return !rejected.some((path) => url === path || url.startsWith(path)) ? url : '/';
}
