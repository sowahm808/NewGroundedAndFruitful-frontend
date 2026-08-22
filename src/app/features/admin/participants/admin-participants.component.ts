import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ApiClient } from '../../../core/http/api-client.service';
import { ApiError } from '../../../core/http/api-error';
import { GfAlert, GfEmptyState, GfLoading, GfPageHeader } from '../../../shared/components/design-system';
import {
  AdminParticipantsApiService,
  ParticipantListQuery,
  ParticipantPage,
  ParticipantSort,
  ParticipantStatus,
} from './admin-participants-api.service';

@Component({
  selector: 'gf-admin-participants',
  standalone: true,
  imports: [DatePipe, FormsModule, GfAlert, GfEmptyState, GfLoading, GfPageHeader],
  template: `
    <gf-page-header title="Participants" eyebrow="Administration">
      <p>Manage participant enrollment without exposing private journey content.</p>
    </gf-page-header>

    <div class="actions-bar">
      <button type="button" class="btn-primary" (click)="showCreateModal.set(true)">
        + Enroll Participant
      </button>
    </div>

    <!-- Create Participant Modal -->
    @if (showCreateModal()) {
      <div class="modal-overlay">
        <div class="modal-card">
          <h3>Enroll New Participant</h3>
          <form (ngSubmit)="createParticipant()">
            <label>
              Full Name
              <input name="name" [(ngModel)]="newParticipant.displayName" required placeholder="e.g. David Sowah" />
            </label>
            <label>
              Handle / Username
              <input name="handle" [(ngModel)]="newParticipant.handle" placeholder="e.g. davids" />
            </label>
            <label>
              Assign Team (Optional)
              <input name="teamId" [(ngModel)]="newParticipant.teamId" placeholder="Team ID" />
            </label>

            <div class="modal-actions">
              <button type="button" (click)="showCreateModal.set(false)" [disabled]="isSubmitting()">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="isSubmitting() || !newParticipant.displayName.trim()">
                {{ isSubmitting() ? 'Enrolling...' : 'Save & Enroll' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <form class="filters" (ngSubmit)="apply()">
      <label>Search participants <input name="search" [(ngModel)]="draft.search" /></label>
      <label
        >Status
        <select name="status" [(ngModel)]="draft.status">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="withdrawn">Withdrawn</option>
        </select></label
      >
      <label>Team <input name="teamId" [(ngModel)]="draft.teamId" placeholder="All teams" /></label>
      <label
        >Sort
        <select name="sort" [(ngModel)]="draft.sort">
          <option value="updatedAt_desc">Recently updated</option>
          <option value="name_asc">Name A–Z</option>
        </select></label
      >
      <button type="submit">Apply</button><button type="button" (click)="clear()">Clear</button>
    </form>

    @if (loading()) {
      <gf-loading />
    } @else if (error(); as failure) {
      <gf-alert title="Participants could not be loaded.">
        <p>{{ failure.message }}</p>
        @if (failure.fieldErrors; as fields) {
          @for (field of fieldNames(fields); track field) {
            <p class="field-error">{{ field }}: {{ fields[field][0] }}</p>
          }
        }
        @if (failure.requestId) {
          <p>
            Support details: Request ID <code>{{ failure.requestId }}</code>
          </p>
        }
        <button type="button" (click)="load(query().page)">Try again</button>
      </gf-alert>
    } @else if (!page()?.items?.length) {
      <gf-empty-state title="No participants have been enrolled." message="Try another participant filter." />
    } @else {
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Participant</th>
              <th>Enrollment status</th>
              <th>Linked guardian</th>
              <th>Team</th>
              <th>Current quarter status</th>
              <th>Last updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (participant of page()!.items; track participant.id) {
              <tr>
                <td>{{ participant.name }}</td>
                <td>{{ participant.enrollmentStatus }}</td>
                <td>{{ participant.linkedGuardian || '—' }}</td>
                <td>{{ participant.team || '—' }}</td>
                <td>{{ participant.currentQuarterStatus || '—' }}</td>
                <td>{{ participant.updatedAt | date: 'medium' }}</td>
                <td>
                  @if (participant.allowedActions?.includes('view')) {
                    <a [href]="'/admin/participants/' + participant.id">View</a>
                  } @else {
                    —
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <nav aria-label="Participant pages">
        <button type="button" [disabled]="page()!.pagination.page <= 1" (click)="load(page()!.pagination.page - 1)">
          Previous</button
        ><span>Page {{ page()!.pagination.page }} of {{ page()!.pagination.totalPages || 1 }}</span
        ><button
          type="button"
          [disabled]="page()!.pagination.page >= page()!.pagination.totalPages"
          (click)="load(page()!.pagination.page + 1)"
        >
          Next
        </button>
      </nav>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        max-width: 76rem;
      }
      .actions-bar {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 1rem;
      }
      .btn-primary {
        background: #1b4332;
        color: #fff;
        border: none;
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
        max-width: 28rem;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
      }
      .modal-card form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-top: 1rem;
      }
      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        margin-top: 1rem;
      }
      .filters {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        align-items: end;
        margin-bottom: 1.5rem;
        padding: 1rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
      }
      label {
        display: grid;
        gap: 0.35rem;
        font-weight: 700;
      }
      input,
      select,
      button {
        min-height: 44px;
        font: inherit;
        border: 1px solid var(--border);
        border-radius: 0.55rem;
        padding: 0.55rem 0.8rem;
        background: #fff;
      }
      .table-wrap {
        overflow-x: auto;
      }
      table {
        width: 100%;
        min-width: 60rem;
        border-collapse: collapse;
        background: var(--surface);
      }
      th,
      td {
        text-align: left;
        padding: 0.8rem;
        border-bottom: 1px solid var(--border);
      }
      nav {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 1rem;
        margin: 1.5rem;
      }
      .field-error {
        color: #8b1e1e;
      }
      code {
        overflow-wrap: anywhere;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminParticipantsComponent implements OnInit {
  private readonly api = inject(AdminParticipantsApiService);
  private readonly http = inject(ApiClient);

  readonly page = signal<ParticipantPage | null>(null);
  readonly loading = signal(true);
  readonly error = signal<ApiError | null>(null);
  readonly query = signal<ParticipantListQuery>({ page: 1, pageSize: 25, sort: 'updatedAt_desc' });

  readonly showCreateModal = signal(false);
  readonly isSubmitting = signal(false);

  newParticipant = {
    displayName: '',
    handle: '',
    teamId: '',
  };

  draft: { search: string; status: ParticipantStatus | ''; teamId: string; sort: ParticipantSort } = {
    search: '',
    status: '',
    teamId: '',
    sort: 'updatedAt_desc',
  };

  ngOnInit(): void {
    this.load();
  }

  load(page = 1): void {
    const query = { ...this.query(), page };
    this.query.set(query);
    this.loading.set(true);
    this.error.set(null);
    this.api
      .list(query)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (value) => this.page.set(value),
        error: (error) =>
          this.error.set(
            error instanceof ApiError
              ? error
              : new ApiError(-1, 'unexpected_error', 'The request could not be completed.'),
          ),
      });
  }

  createParticipant(): void {
    if (!this.newParticipant.displayName.trim()) return;
    this.isSubmitting.set(true);

    this.http
      .postData('/admin/participants', {
        displayName: this.newParticipant.displayName.trim(),
        name: this.newParticipant.displayName.trim(),
        handle: this.newParticipant.handle.trim() || undefined,
        activeTeamId: this.newParticipant.teamId.trim() || undefined,
        status: 'active',
        enrollmentStatus: 'active',
      })
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.showCreateModal.set(false);
          this.newParticipant = { displayName: '', handle: '', teamId: '' };
          this.load(1);
        },
        error: (err) => {
          this.error.set(
            err instanceof ApiError ? err : new ApiError(-1, 'unexpected_error', 'Failed to enroll participant.'),
          );
        },
      });
  }

  apply(): void {
    this.query.set({
      page: 1,
      pageSize: 25,
      ...(this.draft.search.trim() ? { search: this.draft.search.trim() } : {}),
      ...(this.draft.status ? { status: this.draft.status } : {}),
      ...(this.draft.teamId.trim() ? { teamId: this.draft.teamId.trim() } : {}),
      sort: this.draft.sort,
    });
    this.load();
  }

  clear(): void {
    this.draft = { search: '', status: '', teamId: '', sort: 'updatedAt_desc' };
    this.query.set({ page: 1, pageSize: 25, sort: 'updatedAt_desc' });
    this.load();
  }

  fieldNames(fields: Readonly<Record<string, readonly string[]>>): readonly string[] {
    return Object.keys(fields);
  }
}