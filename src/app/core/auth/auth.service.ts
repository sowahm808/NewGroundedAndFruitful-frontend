import { Injectable, computed, signal } from '@angular/core';
import { SessionUser, UserRole } from '../models/domain.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly current = signal<SessionUser | null>(null);
  readonly user = this.current.asReadonly();
  readonly authenticated = computed(() => this.current() !== null && !this.current()?.disabled);
  readonly roles = computed(() => this.current()?.roles ?? []);
  restore(user: SessionUser | null): void {
    this.current.set(user);
  }
  hasRole(allowed: readonly UserRole[]): boolean {
    return this.roles().some((role) => allowed.includes(role));
  }
  logout(): void {
    this.current.set(null);
  }
  // Sign-in exchanges are intentionally performed by the protected backend/Firebase adapter.
}
