import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../../core/http/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { GfAlert, GfBadge, GfEmptyState, GfPageHeader } from '../../../shared/components/design-system';
import { AdminOrganizationsApiService, OrganizationListResponse } from './admin-organizations-api.service';

@Component({
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, RouterLink, GfAlert, GfBadge, GfEmptyState, GfPageHeader],
  template: `
    <gf-page-header title="Organizations" eyebrow="Administration"
      ><p>Manage organizations and their program settings.</p></gf-page-header
    >
    <form (ngSubmit)="load()" class="filters">
      <label for="organization-search">Search</label
      ><input id="organization-search" type="search" [formControl]="search" /><button>Apply</button>
    </form>
    @if (loading()) {
      <div role="status" aria-label="Loading organizations" class="skeletons">
        @for (n of [1, 2, 3, 4]; track n) {
          <div></div>
        }
      </div>
    } @else if (forbidden()) {
      <gf-alert title="Access denied"><p>You do not have permission to view organizations.</p></gf-alert>
    } @else if (error(); as e) {
      <gf-alert title="Unable to load organizations"
        ><p>{{ e.message }}</p>
        @if (e.requestId) {
          <p>Support reference: {{ e.requestId }}</p>
        }
        <button (click)="load()">Retry</button></gf-alert
      >
    } @else if (list(); as data) {
      @if (data.canCreate) {
        <a class="primary" routerLink="/onboarding/organization">Create organization</a>
      }
      @if (!data.items.length && hasMembership()) {
        <gf-alert title="Organization unavailable"
          ><p>
            Your membership is active, but its organization was not returned. Reload the session or contact support.
          </p></gf-alert
        >
      } @else if (!data.items.length) {
        <gf-empty-state
          [title]="search.value ? 'No organizations match this filter' : 'No organizations'"
          [message]="
            search.value ? 'Clear the filter and try again.' : 'No organizations are available to this account.'
          "
        />
      } @else {
        <div class="table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Timezone</th>
                <th>Status</th>
                <th>Administrators</th>
                <th>Members</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (organization of data.items; track organization.id) {
                <tr>
                  <td>
                    <strong>{{ organization.name }}</strong>
                  </td>
                  <td>{{ organization.slug }}</td>
                  <td>{{ organization.timezone }}</td>
                  <td>
                    <gf-badge>{{ organization.status }}</gf-badge>
                  </td>
                  <td>{{ organization.administratorCount ?? '—' }}</td>
                  <td>{{ organization.memberCount ?? '—' }}</td>
                  <td>{{ organization.updatedAt | date: 'medium' }}</td>
                  <td>{{ organization.allowedActions.length ? organization.allowedActions.join(', ') : 'None' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }
  `,
  styles: [
    `
      :host {
        display: block;
        max-width: 76rem;
      }
      .filters {
        display: flex;
        gap: 0.6rem;
        align-items: end;
        margin-bottom: 1rem;
      }
      .filters label {
        font-weight: 700;
      }
      input,
      button {
        min-height: 44px;
        padding: 0.6rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
      }
      table {
        width: 100%;
        border-collapse: collapse;
        background: white;
      }
      th,
      td {
        text-align: left;
        padding: 0.8rem;
        border-bottom: 1px solid var(--border);
      }
      .table {
        overflow: auto;
      }
      .skeletons {
        display: grid;
        gap: 0.6rem;
      }
      .skeletons div {
        height: 4rem;
        background: #e5e9e3;
        animation: pulse 1s infinite alternate;
      }
      @keyframes pulse {
        to {
          opacity: 0.45;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminOrganizationsComponent {
  private readonly api = inject(AdminOrganizationsApiService);
  private readonly auth = inject(AuthService);
  readonly search = new FormControl('', { nonNullable: true });
  readonly loading = signal(true);
  readonly forbidden = signal(false);
  readonly error = signal<ApiError | null>(null);
  readonly list = signal<OrganizationListResponse | null>(null);
  readonly hasMembership = computed(() => this.auth.user()?.memberships.some((m) => m.status === 'active') ?? false);
  constructor() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.list(this.search.value.trim()).subscribe({
      next: (data) => {
        this.list.set(data);
        this.forbidden.set(false);
        this.loading.set(false);
      },
      error: (e: ApiError) => {
        this.forbidden.set(e.status === 403);
        this.error.set(e.status === 403 ? null : e);
        this.loading.set(false);
      },
    });
  }
}
