import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Subscription, finalize } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ApiError } from '../../core/http/api-error';
import { ActiveOrganizationService } from '../../core/organizations/active-organization.service';
import { ParentApi, ParentChild } from './parent-api.service';

export type ParentContextState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly children: readonly ParentChild[]; readonly selectedChildId: string | null }
  | { readonly status: 'empty'; readonly children: readonly [] }
  | { readonly status: 'forbidden' | 'dependency_error' | 'contract_error'; readonly requestId?: string }
  | { readonly status: 'unauthenticated' };

/** The single relationship boundary shared by every Parent route. */
@Injectable({ providedIn: 'root' })
export class ParentContextStore {
  private readonly auth = inject(AuthService);
  private readonly organizations = inject(ActiveOrganizationService);
  private readonly api = inject(ParentApi);
  private readonly value = signal<ParentContextState>({ status: 'idle' });
  private request?: Subscription;
  private loadedKey: string | null = null;
  readonly state = this.value.asReadonly();
  readonly children = computed<readonly ParentChild[]>(() => {
    const state = this.value();
    return state.status === 'ready' || state.status === 'empty' ? state.children : [];
  });
  readonly selectedChildId = computed(() => {
    const state = this.value();
    return state.status === 'ready' ? state.selectedChildId : null;
  });

  constructor() {
    effect(() => {
      const user = this.auth.user();
      const generation = this.auth.sessionGeneration();
      const workspaceId = this.organizations.workspaceId();
      untracked(() => this.activate(user?.uid ?? null, workspaceId, generation));
    });
  }

  retry(): void {
    this.loadedKey = null;
    const user = this.auth.user();
    this.activate(user?.uid ?? null, this.organizations.workspaceId(), this.auth.sessionGeneration());
  }

  select(childId: string | null): boolean {
    const state = this.value();
    if (state.status !== 'ready') return false;
    const safe = childId && state.children.some((child) => child.id === childId) ? childId : null;
    // Signals notify dependants whenever a new state object is assigned. Avoid replacing an
    // already-selected state: ParentChildScope's synchronization effect calls this method and
    // would otherwise trigger itself indefinitely.
    if (state.selectedChildId === safe) return safe === childId;
    this.value.set({ ...state, selectedChildId: safe });
    return safe === childId;
  }

  private activate(uid: string | null, workspaceId: string | null, generation: number): void {
    this.request?.unsubscribe();
    this.request = undefined;
    if (!uid) {
      this.loadedKey = null;
      this.value.set({ status: 'unauthenticated' });
      return;
    }
    const key = `${uid}:${workspaceId ?? 'none'}:${generation}`;
    if (this.loadedKey === key) return;
    this.loadedKey = key;
    this.value.set({ status: 'loading' });
    this.request = this.api
      .children('', 'active')
      .pipe(
        finalize(() => {
          // A cancellation is followed synchronously by the new generation's state. This is a
          // last-resort invariant so a completed request can never strand the UI in loading.
          if (this.loadedKey === key && this.value().status === 'loading') this.value.set({ status: 'contract_error' });
        }),
      )
      .subscribe({
        next: (page) => {
          const children = page.items.filter((child) => child.status === 'active');
          this.value.set(
            children.length ? { status: 'ready', children, selectedChildId: null } : { status: 'empty', children: [] },
          );
        },
        error: (error: unknown) => {
          this.value.set(this.failure(error));
        },
      });
  }

  private failure(error: unknown): ParentContextState {
    if (error instanceof ApiError) {
      if (error.status === 401) return { status: 'unauthenticated' };
      if (error.status === 403) return { status: 'forbidden', requestId: error.requestId };
      if (error.status === 0 || error.status === 429 || error.status >= 500)
        return { status: 'dependency_error', requestId: error.requestId };
      return { status: 'contract_error', requestId: error.requestId };
    }
    return { status: 'contract_error' };
  }
}
