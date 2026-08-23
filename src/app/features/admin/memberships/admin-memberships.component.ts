import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ApiClient } from '../../../core/http/api-client.service';
import { ApiError } from '../../../core/http/api-error';
import { GfAlert, GfBadge, GfEmptyState, GfPageHeader } from '../../../shared/components/design-system';
import { AdminMembershipsApiService, MembershipListResponse, MembershipSummary } from './admin-memberships-api.service';

@Component({
  standalone: true,
  imports: [DatePipe, FormsModule, GfAlert, GfBadge, GfEmptyState, GfPageHeader],
  template: `
    <gf-page-header title="Memberships" eyebrow="Administration">
      <p>Manage organization access and roles.</p>
    </gf-page-header>

    @if (loading()) {
      <p role="status">Loading memberships…</p>
    } @else if (forbidden()) {
      <gf-alert title="Access denied"><p>You do not have permission to view memberships.</p></gf-alert>
    } @else if (error(); as e) {
      <gf-alert title="Unable to load memberships">
        <p>{{ e.message }}</p>
        @if (e.requestId) {
          <p>Support reference: {{ e.requestId }}</p>
        }
        <button type="button" (click)="load()">Retry</button>
      </gf-alert>
    } @else if (list(); as data) {
      <div class="actions-header">
        @if (data.canInvite) {
          <button type="button" class="btn-primary" (click)="showInviteModal.set(true)">+ Invite member</button>
        }
      </div>

      <!-- Invite Member Modal -->
      @if (showInviteModal()) {
        <div class="modal-overlay">
          <div class="modal-card">
            <h3>Invite Organization Member</h3>
            <form (ngSubmit)="sendInvite()">
              <label>
                Email Address
                <input
                  type="email"
                  name="email"
                  [(ngModel)]="inviteForm.email"
                  required
                  placeholder="name@example.com"
                />
              </label>

              <label>
                Role
                <select name="role" [(ngModel)]="inviteForm.role">
                  <option value="mentor">Mentor</option>
                  <option value="observer">Observer</option>
                </select>
              </label>

              <div class="modal-actions">
                <button type="button" (click)="showInviteModal.set(false)" [disabled]="isInviting()">Cancel</button>
                <button type="submit" class="btn-primary" [disabled]="isInviting() || !inviteForm.email.trim()">
                  {{ isInviting() ? 'Sending...' : 'Send Invitation' }}
                </button>
              </div>
            </form>
          </div>
        </div>
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
                    <strong>{{ m.member.displayName }}</strong>
                    <br />{{ m.member.email || '' }}
                  </td>
                  <td>{{ m.organization.name }}</td>
                  <td>{{ m.roles.join(', ') }}</td>
                  <td>
                    <gf-badge>{{ m.status }}</gf-badge>
                  </td>
                  <td>{{ m.updatedAt | date: 'medium' }}</td>
                  <td>
                    @for (action of m.allowedActions; track action) {
                      <button type="button" (click)="run(m, action)">{{ label(action) }}</button>
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
      .actions-header {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 1rem;
      }
      .btn-primary {
        background: #1b4332;
        color: #fff;
        border: none;
        border-radius: 0.5rem;
        cursor: pointer;
        font-weight: 600;
      }
      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
      }
      .modal-card {
        background: #fff;
        padding: 2rem;
        border-radius: 0.75rem;
        width: 100%;
        max-width: 26rem;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
      }
      .modal-card form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-top: 1rem;
      }
      label {
        display: grid;
        gap: 0.35rem;
        font-weight: 700;
      }
      input,
      select {
        min-height: 44px;
        font: inherit;
        border: 1px solid var(--border, #ccc);
        border-radius: 0.55rem;
        padding: 0.55rem 0.8rem;
      }
      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        margin-top: 0.5rem;
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
        border-bottom: 1px solid var(--border, #eee);
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
  private readonly http = inject(ApiClient);

  readonly loading = signal(true);
  readonly forbidden = signal(false);
  readonly error = signal<ApiError | null>(null);
  readonly list = signal<MembershipListResponse | null>(null);

  readonly showInviteModal = signal(false);
  readonly isInviting = signal(false);

  inviteForm = {
    email: '',
    role: 'mentor' as 'mentor' | 'observer',
  };

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

  sendInvite(): void {
    if (!this.inviteForm.email.trim()) return;
    this.isInviting.set(true);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    this.http
      .postData('/admin/invitations', {
        email: this.inviteForm.email.trim(),
        role: this.inviteForm.role,
        expiresAt,
      })
      .pipe(finalize(() => this.isInviting.set(false)))
      .subscribe({
        next: () => {
          this.showInviteModal.set(false);
          this.inviteForm = { email: '', role: 'mentor' };
          this.load();
        },
        error: (err: ApiError) => {
          this.error.set(
            err instanceof ApiError ? err : new ApiError(-1, 'unexpected_error', 'Failed to send invitation.'),
          );
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