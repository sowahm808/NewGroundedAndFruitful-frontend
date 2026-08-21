import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom, Subject } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ApiClient } from '../http/api-client.service';
import { SessionMembership, UserRole, WorkspaceType } from '../models/domain.models';

export interface WorkspaceOption {
  readonly id: string;
  readonly type: WorkspaceType;
  readonly name: string;
  readonly membership?: SessionMembership;
}

/** Server-verified workspace context. Selection never grants authority and is never persisted locally. */
@Injectable({ providedIn: 'root' })
export class ActiveOrganizationService {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiClient);
  private readonly switchingState = signal(false);
  private readonly changes = new Subject<void>();
  readonly workspaceChanged$ = this.changes.asObservable();
  readonly switching = this.switchingState.asReadonly();
  readonly memberships = computed(() => this.auth.user()?.memberships.filter((m) => m.status === 'active') ?? []);
  readonly workspaces = computed<readonly WorkspaceOption[]>(() => {
    const user = this.auth.user();
    if (!user) return [];
    const personal = user.personalWorkspace
      ? [
          {
            id: user.personalWorkspace.id,
            type: 'personal' as const,
            name: user.personalWorkspace.displayName || user.displayName,
          },
        ]
      : [];
    return [
      ...personal,
      ...this.memberships()
        .filter((m) => !!m.organizationId)
        .map((membership) => ({
          id: membership.organizationId!,
          type: 'organization' as const,
          name: membership.organizationName || 'Organization',
          membership,
        })),
    ];
  });
  readonly activeWorkspace = computed(() => {
    const choices = this.workspaces();
    const selected = this.auth.user()?.activeWorkspace;
    if (selected) return choices.find((w) => w.id === selected.id && w.type === selected.type) ?? null;
    const selectedId = this.auth.user()?.activeWorkspaceId;
    if (selectedId) return choices.find((workspace) => workspace.id === selectedId) ?? null;
    const legacyId = this.auth.user()?.activeOrganizationId;
    if (legacyId) return choices.find((w) => w.type === 'organization' && w.id === legacyId) ?? null;
    return choices.length === 1 ? choices[0] : null;
  });
  readonly activeMembership = computed(() => this.activeWorkspace()?.membership ?? null);
  readonly organizationId = computed(() =>
    this.activeWorkspace()?.type === 'organization' ? this.activeWorkspace()!.id : null,
  );
  readonly workspaceId = computed(() => this.activeWorkspace()?.id ?? null);
  readonly requiresSelection = computed(() => this.workspaces().length > 1 && !this.activeWorkspace());
  readonly roles = computed(() => this.activeMembership()?.roles ?? []);

  constructor() {
    effect(() => {
      // Reading this computed drops a revoked/stale server selection immediately.
      this.activeWorkspace();
    });
  }
  hasRole(role: UserRole): boolean {
    return (
      this.auth.roles().includes(role) && (this.activeWorkspace()?.type === 'personal' || this.roles().includes(role))
    );
  }
  async selectWorkspace(type: WorkspaceType, id: string): Promise<boolean> {
    if (this.switchingState() || !this.workspaces().some((w) => w.type === type && w.id === id)) return false;
    this.switchingState.set(true);
    try {
      await firstValueFrom(this.api.postData('/auth/session/workspace', { type, workspaceId: id }));
      await this.auth.refreshSession();
      const active = this.activeWorkspace();
      if (!active || active.id !== id || active.type !== type) return false;
      this.changes.next();
      return true;
    } finally {
      this.switchingState.set(false);
    }
  }
  select(organizationId: string): boolean {
    void this.selectWorkspace('organization', organizationId);
    return this.workspaces().some((w) => w.type === 'organization' && w.id === organizationId);
  }
  clear(): void {
    /* Context is exclusively server-owned. */
  }
}
