import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ApiError } from '../../../core/http/api-error';
import { GfAlert, GfBadge, GfEmptyState, GfPageHeader } from '../../../shared/components/design-system';
import { AdminMembershipsApiService, MembershipListResponse, MembershipSummary } from './admin-memberships-api.service';
@Component({
  standalone: true,
  imports: [DatePipe, GfAlert, GfBadge, GfEmptyState, GfPageHeader],
  template: `
    <gf-page-header title="Memberships" eyebrow="Administration"
      ><p>Manage organization access and roles.</p></gf-page-header
    >
    @if (loading()) {
      <p role="status">Loading memberships…</p>
    } @else if (forbidden()) {
      <gf-alert title="Access denied"><p>You do not have permission to view memberships.</p></gf-alert>
    } @else if (error(); as e) {
      <gf-alert title="Unable to load memberships"
        ><p>{{ e.message }}</p>
        @if (e.requestId) {
          <p>Support reference: {{ e.requestId }}</p>
        }
        <button (click)="load()">Retry</button></gf-alert
      >
    } @else if (list(); as data) {
      @if (data.canInvite) {
        <button>Invite member</button>
      }
      @if (!data.items.length) {
        <gf-empty-state title="No memberships" message="No organization memberships are available." />
      } @else {
        <div class="table">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Organization</th>
                <th>Roles</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (m of data.items; track m.id) {
                <tr>
                  <td>
                    <strong>{{ m.member.displayName }}</strong
                    ><br />{{ m.member.email || '' }}
                  </td>
                  <td>{{ m.organization.name }}</td>
                  <td>{{ m.roles.join(', ') }}</td>
                  <td>
                    <gf-badge>{{ m.status }}</gf-badge>
                  </td>
                  <td>{{ m.updatedAt | date: 'medium' }}</td>
                  <td>
                    @for (action of m.allowedActions; track action) {
                      <button (click)="run(m, action)">{{ label(action) }}</button>
                    }
                  </td>
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
      .table {
        overflow: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        background: #fff;
      }
      th,
      td {
        text-align: left;
        padding: 0.8rem;
        border-bottom: 1px solid var(--border);
      }
      button {
        min-height: 44px;
        margin: 0.15rem;
        padding: 0.5rem 0.7rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminMembershipsComponent {
  private readonly api = inject(AdminMembershipsApiService);
  readonly loading = signal(true);
  readonly forbidden = signal(false);
  readonly error = signal<ApiError | null>(null);
  readonly list = signal<MembershipListResponse | null>(null);
  constructor() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.api.list().subscribe({
      next: (x) => {
        this.list.set(x);
        this.loading.set(false);
      },
      error: (e: ApiError) => {
        this.forbidden.set(e.status === 403);
        this.error.set(e.status === 403 ? null : e);
        this.loading.set(false);
      },
    });
  }
  run(m: MembershipSummary, a: string) {
    const body = a === 'activate' ? { status: 'active' } : a === 'deactivate' ? { status: 'inactive' } : { command: a };
    this.api.patch(m.id, body).subscribe({
      next: () => this.load(),
      error: (e: ApiError) =>
        this.error.set(
          new ApiError(
            e.status,
            e.code,
            e.status === 409
              ? 'This change would remove the final organization administrator. Add another administrator first.'
              : e.message,
            e.details,
            e.retryAfterSeconds,
            e.requestId,
          ),
        ),
    });
  }
  label(v: string) {
    return v.replaceAll('_', ' ');
  }
}
