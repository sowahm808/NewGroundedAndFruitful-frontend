import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  GfAlert,
  GfBadge,
  GfEmptyState,
  GfPageHeader,
} from '../../../shared/components/design-system';

export interface UserAccountItem {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'mentor' | 'parent' | 'observer' | 'super_admin';
  status: 'active' | 'pending' | 'suspended';
  organizationId?: string;
  version?: number;
  updatedAt?: string;
}

@Component({
  selector: 'gf-admin-users',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    GfAlert,
    GfBadge,
    GfEmptyState,
    GfPageHeader,
  ],
  template: `
    <gf-page-header title="User & Role Management" eyebrow="Administration">
      <p>Assign organization roles, manage staff privileges, and invite mentors, parents, or observers.</p>
    </gf-page-header>

    <div class="users-container" style="max-width: 1200px; margin: 0 auto; padding: 1rem 0;">
      <!-- Filter Bar & Create Trigger -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <input
            type="text"
            placeholder="Search by name or email..."
            [value]="searchTerm()"
            (input)="onSearchInput($event)"
            style="padding: 0.5rem 0.75rem; border: 1px solid #ccc; border-radius: 6px; min-width: 250px;"
          />
          <select
            [value]="selectedRoleFilter()"
            (change)="onRoleFilterChange($event)"
            style="padding: 0.5rem 0.75rem; border: 1px solid #ccc; border-radius: 6px;"
          >
            <option value="">All Roles</option>
            <option value="admin">Administrator</option>
            <option value="mentor">Mentor</option>
            <option value="parent">Parent</option>
            <option value="observer">Observer</option>
          </select>
        </div>

        <button
          type="button"
          class="gf-button gf-button--primary"
          style="padding: 0.6rem 1.2rem; cursor: pointer; border-radius: 6px; background: #1b4d3e; color: #fff; border: none; font-weight: 600;"
          (click)="openInviteModal()"
        >
          + Invite User
        </button>
      </div>

      <!-- Assign / Edit Role Modal -->
      @if (selectedUser()) {
        <div
          class="modal-backdrop"
          role="dialog"
          aria-modal="true"
          style="position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45); display: flex; align-items: center; justify-content: center; z-index: 1000;"
        >
          <div
            class="modal-card"
            style="background: #ffffff; padding: 2rem; border-radius: 8px; width: 100%; max-width: 480px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);"
          >
            <h3 style="margin-top: 0; font-size: 1.25rem; font-weight: 700;">Update Role Assignment</h3>
            <p style="color: #666; font-size: 0.9rem; margin-top: -0.5rem; margin-bottom: 1.25rem;">
              Editing roles for <strong>{{ selectedUser()?.displayName || selectedUser()?.email }}</strong>
            </p>

            @if (modalError()) {
              <gf-alert title="Error">
                <p>{{ modalError() }}</p>
              </gf-alert>
            }

            <form [formGroup]="roleForm" (ngSubmit)="onSaveRole()">
              <div style="margin-bottom: 1.25rem;">
                <label for="role" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                  Organization Role
                </label>
                <select
                  id="role"
                  formControlName="role"
                  style="width: 100%; box-sizing: border-box; padding: 0.6rem; border: 1px solid #ccc; border-radius: 4px;"
                >
                  <option value="admin">Administrator (Full org management)</option>
                  <option value="mentor">Mentor (Growth team leadership)</option>
                  <option value="parent">Parent (Family and child link)</option>
                  <option value="observer">Observer (Positive behavioral notes)</option>
                </select>
              </div>

              <div style="margin-bottom: 1.5rem;">
                <label for="status" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                  Membership Status
                </label>
                <select
                  id="status"
                  formControlName="status"
                  style="width: 100%; box-sizing: border-box; padding: 0.6rem; border: 1px solid #ccc; border-radius: 4px;"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended / Inactive</option>
                </select>
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
                <button
                  type="button"
                  style="padding: 0.6rem 1.2rem; cursor: pointer; border-radius: 4px; border: 1px solid #ccc; background: #fff;"
                  (click)="closeModal()"
                  [disabled]="isSubmitting()"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style="padding: 0.6rem 1.2rem; cursor: pointer; border-radius: 4px; border: none; background: #1b4d3e; color: #fff; font-weight: 600;"
                  [disabled]="roleForm.invalid || isSubmitting()"
                >
                  {{ isSubmitting() ? 'Saving...' : 'Update Role' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Invite Modal -->
      @if (showInviteModal()) {
        <div
          class="modal-backdrop"
          role="dialog"
          aria-modal="true"
          style="position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45); display: flex; align-items: center; justify-content: center; z-index: 1000;"
        >
          <div
            class="modal-card"
            style="background: #ffffff; padding: 2rem; border-radius: 8px; width: 100%; max-width: 480px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);"
          >
            <h3 style="margin-top: 0; font-size: 1.25rem; font-weight: 700;">Invite New Member</h3>

            @if (modalError()) {
              <gf-alert title="Error">
                <p>{{ modalError() }}</p>
              </gf-alert>
            }

            <form [formGroup]="inviteForm" (ngSubmit)="onSendInvite()">
              <div style="margin-bottom: 1rem;">
                <label for="inviteEmail" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                  Email Address
                </label>
                <input
                  id="inviteEmail"
                  type="email"
                  formControlName="email"
                  placeholder="user@example.com"
                  style="width: 100%; box-sizing: border-box; padding: 0.6rem; border: 1px solid #ccc; border-radius: 4px;"
                />
              </div>

              <div style="margin-bottom: 1.5rem;">
                <label for="inviteRole" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                  Initial Assigned Role
                </label>
                <select
                  id="inviteRole"
                  formControlName="role"
                  style="width: 100%; box-sizing: border-box; padding: 0.6rem; border: 1px solid #ccc; border-radius: 4px;"
                >
                  <option value="admin">Administrator</option>
                  <option value="mentor">Mentor</option>
                  <option value="parent">Parent / Guardian</option>
                  <option value="observer">Observer</option>
                </select>
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
                <button
                  type="button"
                  style="padding: 0.6rem 1.2rem; cursor: pointer; border-radius: 4px; border: 1px solid #ccc; background: #fff;"
                  (click)="closeModal()"
                  [disabled]="isSubmitting()"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style="padding: 0.6rem 1.2rem; cursor: pointer; border-radius: 4px; border: none; background: #1b4d3e; color: #fff; font-weight: 600;"
                  [disabled]="inviteForm.invalid || isSubmitting()"
                >
                  {{ isSubmitting() ? 'Sending...' : 'Send Invitation' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- User List Table -->
      @if (isLoading()) {
        <div style="padding: 2rem; text-align: center; color: #666;">Loading organization members...</div>
      } @else if (users().length === 0) {
        <gf-empty-state
          title="No users found"
          message="No matching user accounts or membership records found."
        />
      } @else {
        <div style="overflow-x: auto; background: #fff; border-radius: 8px; border: 1px solid #e0e0e0;">
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px solid #e0e0e0; background: #fafafa; font-size: 0.85rem; color: #666;">
                <th style="padding: 0.75rem 1rem;">User</th>
                <th style="padding: 0.75rem 1rem;">Assigned Role</th>
                <th style="padding: 0.75rem 1rem;">Status</th>
                <th style="padding: 0.75rem 1rem; text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (user of users(); track user.id) {
                <tr style="border-bottom: 1px solid #eee; font-size: 0.9rem;">
                  <td style="padding: 0.75rem 1rem;">
                    <strong>{{ user.displayName || 'No Name' }}</strong>
                    <div style="color: #666; font-size: 0.8rem;">{{ user.email }}</div>
                  </td>
                  <td style="padding: 0.75rem 1rem;">
                    <gf-badge>{{ user.role }}</gf-badge>
                  </td>
                  <td style="padding: 0.75rem 1rem;">
                    <span style="font-size: 0.85rem; text-transform: capitalize;">{{ user.status }}</span>
                  </td>
                  <td style="padding: 0.75rem 1rem; text-align: right;">
                    <button
                      type="button"
                      style="padding: 0.35rem 0.75rem; cursor: pointer; border: 1px solid #1b4d3e; background: #fff; color: #1b4d3e; border-radius: 4px; font-weight: 600; font-size: 0.8rem;"
                      (click)="openEditRoleModal(user)"
                    >
                      Change Role
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsersComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);

  readonly users = signal<UserAccountItem[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly isSubmitting = signal<boolean>(false);
  readonly selectedUser = signal<UserAccountItem | null>(null);
  readonly showInviteModal = signal<boolean>(false);
  readonly modalError = signal<string | null>(null);

  readonly searchTerm = signal<string>('');
  readonly selectedRoleFilter = signal<string>('');

  readonly roleForm: FormGroup = this.fb.group({
    role: ['mentor', [Validators.required]],
    status: ['active', [Validators.required]],
  });

  readonly inviteForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    role: ['mentor', [Validators.required]],
  });

  ngOnInit(): void {
    this.fetchUsers();
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.fetchUsers();
  }

  onRoleFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedRoleFilter.set(value);
    this.fetchUsers();
  }

  openEditRoleModal(user: UserAccountItem): void {
    this.modalError.set(null);
    this.selectedUser.set(user);
    this.roleForm.patchValue({
      role: user.role || 'mentor',
      status: user.status || 'active',
    });
  }

  openInviteModal(): void {
    this.modalError.set(null);
    this.showInviteModal.set(true);
  }

  closeModal(): void {
    this.selectedUser.set(null);
    this.showInviteModal.set(false);
  }

  fetchUsers(): void {
    this.isLoading.set(true);
    let params = new HttpParams();
    if (this.searchTerm()) params = params.set('search', this.searchTerm());

    this.http
      .get<{ data: { items: any[] } }>('/api/v1/admin/memberships', { params })
      .subscribe({
        next: (res) => {
          const rawItems = res.data?.items || [];
          let mapped: UserAccountItem[] = rawItems.map((r: any) => ({
            id: r.userId || r.id,
            email: r.email || r.userEmail || `${r.userId}@workspace.local`,
            displayName: r.displayName || r.userName || r.name || 'Member',
            role: r.role || (Array.isArray(r.roles) ? r.roles[0] : 'mentor'),
            status: r.status || 'active',
            organizationId: r.organizationId,
            version: r.version || 1,
            updatedAt: r.updatedAt,
          }));

          if (this.selectedRoleFilter()) {
            mapped = mapped.filter((u) => u.role === this.selectedRoleFilter());
          }

          this.users.set(mapped);
          this.isLoading.set(false);
        },
        error: () => {
          this.users.set([]);
          this.isLoading.set(false);
        },
      });
  }

  onSaveRole(): void {
    const user = this.selectedUser();
    if (!user || this.roleForm.invalid) return;

    this.isSubmitting.set(true);
    this.modalError.set(null);

    const { role, status } = this.roleForm.value;
    const orgId = user.organizationId || 'current';

    this.http
      .put(`/api/v1/admin/organizations/${orgId}/users/${user.id}/memberships`, {
        role,
        status,
        version: user.version,
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.closeModal();
          this.fetchUsers();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.modalError.set(err.error?.error?.message || 'Failed to update membership role.');
        },
      });
  }

  onSendInvite(): void {
    if (this.inviteForm.invalid) return;

    this.isSubmitting.set(true);
    this.modalError.set(null);

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);

    this.http
      .post('/api/v1/admin/invitations', {
        email: this.inviteForm.value.email,
        role: this.inviteForm.value.role,
        expiresAt: expiry.toISOString(),
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.closeModal();
          this.inviteForm.reset({ role: 'mentor' });
          this.fetchUsers();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.modalError.set(err.error?.error?.message || 'Failed to send invitation.');
        },
      });
  }
}