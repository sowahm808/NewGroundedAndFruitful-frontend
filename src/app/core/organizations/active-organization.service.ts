import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { SessionMembership, UserRole } from '../models/domain.models';

const STORAGE_KEY = 'gf.activeOrganizationId';

/** Membership-validated organization selection. IDs are context, never authorization. */
@Injectable({ providedIn: 'root' })
export class ActiveOrganizationService {
  private readonly auth = inject(AuthService);
  private readonly selectedId = signal<string | null>(null);
  readonly memberships = computed(() => this.auth.user()?.memberships.filter((m) => m.status === 'active') ?? []);
  readonly activeMembership = computed<SessionMembership | null>(() => {
    const memberships = this.memberships();
    const selected = this.selectedId() ?? readStoredId() ?? this.auth.user()?.activeOrganizationId;
    if (selected) return memberships.find((membership) => membership.organizationId === selected) ?? null;
    if (memberships.length === 1 && memberships[0].organizationId) return memberships[0];
    return null;
  });
  readonly organizationId = computed(() => this.activeMembership()?.organizationId ?? null);
  readonly requiresSelection = computed(() => this.memberships().length > 1 && !this.activeMembership());
  readonly roles = computed(() => this.activeMembership()?.roles ?? []);

  hasRole(role: UserRole): boolean {
    return this.auth.roles().includes(role) && this.roles().includes(role);
  }

  constructor() {
    effect(() => {
      const memberships = this.memberships();
      const selected = this.selectedId();
      if (memberships.length === 1 && memberships[0].organizationId) this.store(memberships[0].organizationId);
      else if (selected && !memberships.some((membership) => membership.organizationId === selected)) this.clear();
    });
  }

  select(organizationId: string): boolean {
    if (!this.memberships().some((membership) => membership.organizationId === organizationId)) return false;
    this.store(organizationId);
    return true;
  }
  clear(): void {
    this.selectedId.set(null);
    if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY);
  }
  private store(id: string): void {
    this.selectedId.set(id);
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, id);
  }
}

function readStoredId(): string | null {
  return typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY);
}
