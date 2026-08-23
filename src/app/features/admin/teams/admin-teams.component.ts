import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import {
  GfAlert,
  GfBadge,
  GfCard,
  GfEmptyState,
  GfPageHeader,
} from '../../../shared/components/design-system';

interface TeamItem {
  id: string;
  name: string;
  displayName?: string;
  approvedDisplayName?: string;
  status: string;
  capacity?: number;
  memberCount?: number;
  targetPoints?: number;
}

@Component({
  selector: 'gf-admin-teams',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    GfAlert,
    GfBadge,
    GfCard,
    GfEmptyState,
    GfPageHeader,
  ],
  template: `
    <gf-page-header title="Teams" eyebrow="Administration">
      <p>Manage growth team rosters, capacities, and target points within authorized scopes.</p>
    </gf-page-header>

    <div class="teams-container">
      <!-- Toolbar -->
      <div class="toolbar" style="margin: 1.5rem 0; display: flex; justify-content: flex-end;">
        <button
          type="button"
          class="gf-button gf-button--primary"
          style="padding: 0.6rem 1.2rem; cursor: pointer; border-radius: 6px; font-weight: 600;"
          (click)="openModal()"
        >
          + Add New Team
        </button>
      </div>

      <!-- Add Team Modal -->
      @if (showModal()) {
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
            <h3 style="margin-top: 0; font-size: 1.25rem; font-weight: 700;">Create Growth Team</h3>

            @if (errorMessage()) {
              <gf-alert title="Error">
                <p>{{ errorMessage() }}</p>
              </gf-alert>
            }

            <form [formGroup]="teamForm" (ngSubmit)="onCreateTeam()">
              <div style="margin-bottom: 1rem;">
                <label for="teamName" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                  Team Name
                </label>
                <input
                  id="teamName"
                  type="text"
                  formControlName="name"
                  placeholder="e.g. Team Alpha"
                  style="width: 100%; box-sizing: border-box; padding: 0.6rem; border: 1px solid #ccc; border-radius: 4px; font-size: 0.95rem;"
                />
              </div>

              <div style="margin-bottom: 1rem;">
                <label for="capacity" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                  Capacity (Max Children)
                </label>
                <input
                  id="capacity"
                  type="number"
                  formControlName="capacity"
                  style="width: 100%; box-sizing: border-box; padding: 0.6rem; border: 1px solid #ccc; border-radius: 4px; font-size: 0.95rem;"
                />
              </div>

              <div style="margin-bottom: 1.5rem;">
                <label for="targetPoints" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                  Target Points (Quarter Goal)
                </label>
                <input
                  id="targetPoints"
                  type="number"
                  formControlName="targetPoints"
                  style="width: 100%; box-sizing: border-box; padding: 0.6rem; border: 1px solid #ccc; border-radius: 4px; font-size: 0.95rem;"
                />
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
                <button
                  type="button"
                  style="padding: 0.6rem 1.2rem; cursor: pointer; border-radius: 4px; border: 1px solid #ccc; background: #fff; font-weight: 600;"
                  (click)="closeModal()"
                  [disabled]="isSubmitting()"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style="padding: 0.6rem 1.2rem; cursor: pointer; border-radius: 4px; border: none; background: #1b4d3e; color: #fff; font-weight: 600;"
                  [disabled]="teamForm.invalid || isSubmitting()"
                >
                  {{ isSubmitting() ? 'Saving...' : 'Create Team' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Team List -->
      @if (isLoading()) {
        <div class="cards" role="status" aria-label="Loading teams" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem;">
          <div class="skeleton" style="height: 140px; background: #eee; border-radius: 8px;"></div>
          <div class="skeleton" style="height: 140px; background: #eee; border-radius: 8px;"></div>
        </div>
      } @else if (teams().length === 0) {
        <gf-empty-state
          title="No records found"
          message="Create your first team using the '+ Add New Team' button above."
        />
      } @else {
        <div class="cards" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem;">
          @for (team of teams(); track team.id) {
            <gf-card>
              <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <gf-badge>{{ team.status }}</gf-badge>
              </div>
              <h2 style="margin: 0.5rem 0; font-size: 1.2rem; font-weight: 700;">
                {{ team.approvedDisplayName || team.displayName || team.name }}
              </h2>
              <ul class="meta" style="list-style: none; padding: 0; margin: 0.5rem 0; color: #555; font-size: 0.9rem;">
                <li><strong>Members:</strong> {{ team.memberCount || 0 }} / {{ team.capacity || 5 }}</li>
                <li><strong>Target:</strong> {{ team.targetPoints || 5000 }} pts</li>
              </ul>
            </gf-card>
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminTeamsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);

  readonly teams = signal<TeamItem[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly isSubmitting = signal<boolean>(false);
  readonly showModal = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly teamForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    capacity: [5, [Validators.required, Validators.min(1), Validators.max(20)]],
    targetPoints: [5000, [Validators.required, Validators.min(100)]],
  });

  ngOnInit(): void {
    this.fetchTeams();
  }

  openModal(): void {
    this.errorMessage.set(null);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  fetchTeams(): void {
    this.isLoading.set(true);
    this.http.get<{ data: { items: TeamItem[] } }>('/api/v1/admin/teams').subscribe({
      next: (res) => {
        this.teams.set(res.data?.items || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.teams.set([]);
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error?.message || 'Failed to load teams.');
      },
    });
  }

  onCreateTeam(): void {
    if (this.teamForm.invalid) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.http.post('/api/v1/admin/teams', this.teamForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeModal();
        this.teamForm.reset({ capacity: 5, targetPoints: 5000 });
        this.fetchTeams();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.error?.message || 'Failed to create team.');
      },
    });
  }
}