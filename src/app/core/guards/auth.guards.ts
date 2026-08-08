import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserRole } from '../models/domain.models';
import { AuthService } from '../auth/auth.service';

export const authGuard: CanActivateFn = () =>
  inject(AuthService).authenticated() || inject(Router).createUrlTree(['/auth/login']);
export const roleGuard =
  (roles: readonly UserRole[]): CanActivateFn =>
  () =>
    inject(AuthService).hasRole(roles) || inject(Router).createUrlTree(['/unauthorized']);
