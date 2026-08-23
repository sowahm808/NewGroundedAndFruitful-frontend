import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ApiClient } from '../../../core/http/api-client.service';
import { ApiError } from '../../../core/http/api-error';
import {
  GfAlert,
  GfBadge,
  GfCard,
  GfEmptyState,
  GfLoading,
  GfPageHeader,
} from '../../../shared/components/design-system';
import { adminMutationOptions } from '../admin-mutation';
import { TeamItem } from '../teams/admin-teams-api.service';
import {
  AdminParticipantsApiService,
  ParticipantListQuery,
  ParticipantPage,
  ParticipantSort,
  ParticipantStatus,
  ParticipantSummary,
} from './admin-participants-api.service';

@Component({
  selector: 'gf-admin-participants',
  standalone: true,
  imports: [DatePipe, FormsModule, GfAlert, GfBadge, GfCard, GfEmptyState, GfLoading, GfPageHeader],
  template: `
    <gf-page-header title="Participants" eyebrow="Administration">
      <p>Manage participant enrollment without exposing private journey content.</p>
    </gf-page-header>

    <div class="actions-bar">
      <button type="button" class="btn-primary" (click)="showCreateModal.set(true)">+ Enroll Participant</button>
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
              <button
                type="submit"
                class="btn-primary"
                [disabled]="isSubmitting() || !newParticipant.displayName.trim()"
              >
                {{ isSubmitting() ? 'Enrolling...' : 'Save & Enroll' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    @if (participantToAssign(); as participant) {
      <div class="modal-overlay" (click)="closeAssignment()">
        <gf-card class="modal-card" (click)="$event.stopPropagation()">
          <h3>Assign {{ participant.name }} to a team</h3>
          @if (modalError(); as failure) {
            <gf-alert title="Team assignment failed."
              ><p>{{ failure.message }}</p></gf-alert
            >
          }
          @if (teamsLoading()) {
            <gf-loading />
          } @else if (!availableTeams().length) {
            <gf-empty-state title="No teams have space." message="Teams can contain no more than five children." />
          } @else {
            <form (ngSubmit)="assignTeam()">
              <label
                >Available team
                <select name="selectedTeam" [(ngModel)]="selectedTeamId" required>
                  <option value="">Select a team</option>
                  @for (team of availableTeams(); track team.id) {
                    <option [value]="team.id">
                      {{ team.displayName || team.approvedDisplayName || team.name }} ({{ team.memberCount || 0 }}/{{
                        team.capacity || 5
                      }})
                    </option>
                  }
                </select>
              </label>
              <div class="modal-actions">
                <button type="button" (click)="closeAssignment()" [disabled]="isSubmitting()">Cancel</button>
                <button type="submit" class="btn-primary" [disabled]="isSubmitting() || !selectedTeamId">
                  {{ isSubmitting() ? 'Assigning...' : 'Assign Team' }}
                </button>
              </div>
            </form>
          }
        </gf-card>
      </div>
    }

    @if (participantToEdit(); as participant) {
      <div class="modal-overlay" (click)="closeEdit()">
        <gf-card class="modal-card" (click)="$event.stopPropagation()">
          <h3>Edit participant</h3>
          @if (modalError(); as failure) {
            <gf-alert title="Participant could not be updated."
              ><p>{{ failure.message }}</p></gf-alert
            >
          }
          <form (ngSubmit)="saveParticipant()">
            <label>Display name <input name="editName" [(ngModel)]="editDraft.displayName" required /></label>
            <label
              >Enrollment status
              <select name="editStatus" [(ngModel)]="editDraft.status" required>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
            </label>
            <div class="modal-actions">
              <button type="button" (click)="closeEdit()" [disabled]="isSubmitting()">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="isSubmitting() || !editDraft.displayName.trim()">
                {{ isSubmitting() ? 'Saving...' : 'Save changes' }}
              </button>
            </div>
          </form>
        </gf-card>
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
                <td>
                  <gf-badge>{{ participant.enrollmentStatus }}</gf-badge>
                </td>
                <td>{{ participant.linkedGuardian || '—' }}</td>
                <td>{{ participant.team || '—' }}</td>
                <td>{{ participant.currentQuarterStatus || '—' }}</td>
                <td>{{ participant.updatedAt | date: 'medium' }}</td>
                <td>
                  <div class="row-actions">
                    @if (participant.allowedActions?.includes('assign')) {
                      <button type="button" (click)="openAssignment(participant)">Assign Team</button>
                    }
                    @if (participant.allowedActions?.includes('edit')) {
                      <button type="button" (click)="openEdit(participant)">Edit</button>
                    }
                    @if (
                      !participant.allowedActions?.includes('assign') && !participant.allowedActions?.includes('edit')
                    ) {
                      <span>—</span>
                    }
                  </div>
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
        display: block;
        background: #fff;
        padding: 2rem;
        border-radius: 0.75rem;
        width: 100%;
        max-width: 28rem;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
      }
      .row-actions {
        display: flex;
        gap: 0.5rem;
        white-space: nowrap;
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
  readonly participantToAssign = signal<ParticipantSummary | null>(null);
  readonly participantToEdit = signal<ParticipantSummary | null>(null);
  readonly teams = signal<readonly TeamItem[]>([]);
  readonly teamsLoading = signal(false);
  readonly modalError = signal<ApiError | null>(null);

  selectedTeamId = '';
  editDraft: { displayName: string; status: ParticipantStatus } = { displayName: '', status: 'pending' };

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

  availableTeams(): readonly TeamItem[] {
    return this.teams().filter((team) => (team.memberCount ?? 0) < Math.min(team.capacity ?? 5, 5));
  }

  openAssignment(participant: ParticipantSummary): void {
    this.participantToAssign.set(participant);
    this.selectedTeamId = '';
    this.modalError.set(null);
    this.teamsLoading.set(true);
    this.http
      .getData<{ items: readonly TeamItem[] }>('/admin/teams')
      .pipe(finalize(() => this.teamsLoading.set(false)))
      .subscribe({
        next: ({ items }) => this.teams.set(items),
        error: (error) => this.modalError.set(this.asApiError(error, 'Teams could not be loaded.')),
      });
  }

  closeAssignment(): void {
    if (!this.isSubmitting()) this.participantToAssign.set(null);
  }

  assignTeam(): void {
    const participant = this.participantToAssign();
    if (!participant || !this.selectedTeamId) return;
    this.isSubmitting.set(true);
    this.modalError.set(null);
    this.http
      .putData(
        `/admin/teams/${encodeURIComponent(this.selectedTeamId)}/members`,
        { participantId: participant.id },
        adminMutationOptions(),
      )
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.participantToAssign.set(null);
          this.load(this.query().page);
        },
        error: (error) => this.modalError.set(this.asApiError(error, 'The participant could not be assigned.')),
      });
  }

  openEdit(participant: ParticipantSummary): void {
    this.participantToEdit.set(participant);
    this.editDraft = { displayName: participant.name, status: participant.enrollmentStatus };
    this.modalError.set(null);
  }

  closeEdit(): void {
    if (!this.isSubmitting()) this.participantToEdit.set(null);
  }

  saveParticipant(): void {
    const participant = this.participantToEdit();
    const displayName = this.editDraft.displayName.trim();
    if (!participant || !displayName) return;
    this.isSubmitting.set(true);
    this.modalError.set(null);
    this.http
      .patchData(
        `/admin/participants/${encodeURIComponent(participant.id)}`,
        { displayName, status: this.editDraft.status, expectedVersion: participant.version },
        adminMutationOptions(participant.version),
      )
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.participantToEdit.set(null);
          this.load(this.query().page);
        },
        error: (error) => this.modalError.set(this.asApiError(error, 'The participant could not be updated.')),
      });
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

  // createParticipant(): void {
  //   if (!this.newParticipant.displayName.trim()) return;
  //   this.isSubmitting.set(true);

  //   this.http
  //     .postData('/admin/participants', {
  //       displayName: this.newParticipant.displayName.trim(),
  //       name: this.newParticipant.displayName.trim(),
  //       handle: this.newParticipant.handle.trim() || undefined,
  //       activeTeamId: this.newParticipant.teamId.trim() || undefined,
  //       status: 'active',
  //       enrollmentStatus: 'active',
  //     })
  //     .pipe(finalize(() => this.isSubmitting.set(false)))
  //     .subscribe({
  //       next: () => {
  //         this.showCreateModal.set(false);
  //         this.newParticipant = { displayName: '', handle: '', teamId: '' };
  //         this.load(1);
  //       },
  //       error: (err) => {
  //         this.error.set(
  //           err instanceof ApiError ? err : new ApiError(-1, 'unexpected_error', 'Failed to enroll participant.'),
  //         );
  //       },
  //     });
  // }
  createParticipant(): void {
    const name = this.newParticipant.displayName.trim();
    if (!name) return;

    this.isSubmitting.set(true);

    const payload = {
      displayName: name,
      birthDate: '2015-01-01',
      programId: 'default-program',
    };

    this.http
      .postData('/admin/participants', payload)
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

  private asApiError(error: unknown, fallback: string): ApiError {
    return error instanceof ApiError ? error : new ApiError(-1, 'unexpected_error', fallback);
  }
}
