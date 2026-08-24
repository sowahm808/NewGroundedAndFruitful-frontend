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
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  GfAlert,
  GfBadge,
  GfEmptyState,
  GfPageHeader,
} from '../../../shared/components/design-system';
import { ActiveOrganizationService } from '../../../core/organizations/active-organization.service';

export interface AssignmentItem {
  id: string;
  title: string;
  description?: string;
  category: 'bible' | 'reading' | 'character' | 'project' | 'family';
  weekNumber: number;
  targetAudience?: string;
  points: number;
  status: 'draft' | 'published' | 'archived';
  version: number;
  updatedAt: string;
}

@Component({
  selector: 'gf-admin-assignments',
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
    <gf-page-header title="Assignments" eyebrow="Administration">
      <p>Schedule and publish weekly program assignments for active quarters.</p>
    </gf-page-header>

    <div class="assignments-container" style="max-width: 1200px; margin: 0 auto; padding: 1rem 0;">
      <!-- Filter Bar & Create Trigger -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <input
            type="text"
            placeholder="Search assignments..."
            [value]="searchTerm()"
            (input)="onSearchInput($event)"
            style="padding: 0.5rem 0.75rem; border: 1px solid #ccc; border-radius: 6px; min-width: 220px;"
          />
          <select
            [value]="selectedStatus()"
            (change)="onStatusChange($event)"
            style="padding: 0.5rem 0.75rem; border: 1px solid #ccc; border-radius: 6px;"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <button
          type="button"
          class="gf-button gf-button--primary"
          style="padding: 0.6rem 1.2rem; cursor: pointer; border-radius: 6px; background: #1b4d3e; color: #fff; border: none; font-weight: 600;"
          (click)="openModal()"
        >
          + Create Assignment
        </button>
      </div>

      <!-- Create Assignment Modal -->
      @if (showModal()) {
        <div
          class="modal-backdrop"
          role="dialog"
          aria-modal="true"
          style="position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45); display: flex; align-items: center; justify-content: center; z-index: 1000;"
        >
          <div
            class="modal-card"
            style="background: #ffffff; padding: 2rem; border-radius: 8px; width: 100%; max-width: 520px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);"
          >
            <h3 style="margin-top: 0; font-size: 1.25rem; font-weight: 700;">Create Program Assignment</h3>

            @if (errorMessage()) {
              <gf-alert title="Error">
                <p>{{ errorMessage() }}</p>
              </gf-alert>
            }

            <form [formGroup]="assignmentForm" (ngSubmit)="onCreateAssignment()">
              <div style="margin-bottom: 1rem;">
                <label for="title" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                  Title
                </label>
                <input
                  id="title"
                  type="text"
                  formControlName="title"
                  placeholder="e.g. Proverbs 3:5-6 Memory Verse"
                  style="width: 100%; box-sizing: border-box; padding: 0.6rem; border: 1px solid #ccc; border-radius: 4px;"
                />
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                <div>
                  <label for="category" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                    Category
                  </label>
                  <select
                    id="category"
                    formControlName="category"
                    style="width: 100%; box-sizing: border-box; padding: 0.6rem; border: 1px solid #ccc; border-radius: 4px;"
                  >
                    <option value="bible">Bible Activity</option>
                    <option value="reading">Reading Program</option>
                    <option value="character">Character Assessment</option>
                    <option value="project">Personal Project</option>
                    <option value="family">Family Activity</option>
                  </select>
                </div>
                <div>
                  <label for="weekNumber" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                    Week (1-12)
                  </label>
                  <input
                    id="weekNumber"
                    type="number"
                    formControlName="weekNumber"
                    style="width: 100%; box-sizing: border-box; padding: 0.6rem; border: 1px solid #ccc; border-radius: 4px;"
                  />
                </div>
              </div>

              <div style="margin-bottom: 1rem;">
                <label for="points" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                  Participation Points Award
                </label>
                <input
                  id="points"
                  type="number"
                  formControlName="points"
                  style="width: 100%; box-sizing: border-box; padding: 0.6rem; border: 1px solid #ccc; border-radius: 4px;"
                />
              </div>

              <div style="margin-bottom: 1.5rem;">
                <label for="description" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                  Prompt & Instructions
                </label>
                <textarea
                  id="description"
                  rows="3"
                  formControlName="description"
                  placeholder="Provide instructions or prompt for the participants..."
                  style="width: 100%; box-sizing: border-box; padding: 0.6rem; border: 1px solid #ccc; border-radius: 4px; resize: vertical;"
                ></textarea>
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
                  [disabled]="assignmentForm.invalid || isSubmitting() || !organizationId()"
                >
                  {{ isSubmitting() ? 'Saving...' : 'Create' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Data Table -->
      @if (isLoading()) {
        <div style="padding: 2rem; text-align: center; color: #666;">Loading assignments...</div>
      } @else if (assignments().length === 0) {
        <gf-empty-state
          title="No assignments found"
          message="Create your first assignment using the '+ Create Assignment' button above."
        />
      } @else {
        <div style="overflow-x: auto; background: #fff; border-radius: 8px; border: 1px solid #e0e0e0;">
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px solid #e0e0e0; background: #fafafa; font-size: 0.85rem; color: #666;">
                <th style="padding: 0.75rem 1rem;">Week</th>
                <th style="padding: 0.75rem 1rem;">Title</th>
                <th style="padding: 0.75rem 1rem;">Category</th>
                <th style="padding: 0.75rem 1rem;">Points</th>
                <th style="padding: 0.75rem 1rem;">Status</th>
                <th style="padding: 0.75rem 1rem; text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (item of assignments(); track item.id) {
                <tr style="border-bottom: 1px solid #eee; font-size: 0.9rem;">
                  <td style="padding: 0.75rem 1rem; font-weight: 600;">Wk {{ item.weekNumber }}</td>
                  <td style="padding: 0.75rem 1rem;">
                    <strong>{{ item.title }}</strong>
                    @if (item.description) {
                      <div style="color: #666; font-size: 0.8rem;">{{ item.description }}</div>
                    }
                  </td>
                  <td style="padding: 0.75rem 1rem; text-transform: capitalize;">{{ item.category }}</td>
                  <td style="padding: 0.75rem 1rem;">{{ item.points }} pts</td>
                  <td style="padding: 0.75rem 1rem;">
                    <gf-badge>{{ item.status }}</gf-badge>
                  </td>
                  <td style="padding: 0.75rem 1rem; text-align: right;">
                    @if (item.status === 'draft') {
                      <button
                        type="button"
                        style="padding: 0.3rem 0.6rem; cursor: pointer; border: 1px solid #1b4d3e; background: #1b4d3e; color: #fff; border-radius: 4px; font-size: 0.8rem;"
                        (click)="publishAssignment(item)"
                      >
                        Publish
                      </button>
                    }
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
export class AdminAssignmentsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly organizations = inject(ActiveOrganizationService);

  readonly organizationId = this.organizations.organizationId;

  readonly assignments = signal<AssignmentItem[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly isSubmitting = signal<boolean>(false);
  readonly showModal = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly searchTerm = signal<string>('');
  readonly selectedStatus = signal<string>('');

  readonly assignmentForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    category: ['bible', [Validators.required]],
    weekNumber: [1, [Validators.required, Validators.min(1), Validators.max(12)]],
    points: [50, [Validators.required, Validators.min(10)]],
    description: ['', [Validators.maxLength(1000)]],
  });

  ngOnInit(): void {
    this.fetchAssignments();
  }

  openModal(): void {
    this.errorMessage.set(null);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.fetchAssignments();
  }

  onStatusChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedStatus.set(value);
    this.fetchAssignments();
  }

  fetchAssignments(): void {
    this.isLoading.set(true);
    let params = new HttpParams();
    if (this.selectedStatus()) params = params.set('status', this.selectedStatus());
    if (this.searchTerm()) params = params.set('search', this.searchTerm());

    this.http
      .get<{ data: { items: any[] } }>('/api/v1/admin/assignments', { params })
      .subscribe({
        next: (res) => {
          const items = (res.data?.items || []).map((raw) => ({
            id: raw.id,
            title: raw.name || raw.data?.title || 'Untitled Assignment',
            description: raw.data?.description || '',
            category: raw.data?.category || 'bible',
            weekNumber: Number(raw.data?.weekNumber ?? 1),
            points: Number(raw.data?.points ?? 50),
            status: raw.status || 'draft',
            version: raw.version || 1,
            updatedAt: raw.updatedAt || new Date().toISOString(),
          }));
          this.assignments.set(items);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.assignments.set([]);
          this.isLoading.set(false);
          this.errorMessage.set(err.error?.error?.message || 'Failed to load assignments.');
        },
      });
  }

  onCreateAssignment(): void {
    const organizationId = this.organizationId();
    if (this.assignmentForm.invalid || this.isSubmitting()) return;
    if (!organizationId) {
      this.errorMessage.set('Select an organization before creating an assignment.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const formVal = this.assignmentForm.value;
    const payload = {
      organizationId,
      name: formVal.title,
      data: {
        title: formVal.title,
        category: formVal.category,
        weekNumber: Number(formVal.weekNumber),
        points: Number(formVal.points),
        description: formVal.description,
      },
    };

    this.http.post('/api/v1/admin/assignments', payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeModal();
        this.assignmentForm.reset({ category: 'bible', weekNumber: 1, points: 50 });
        this.fetchAssignments();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.error?.message || 'Failed to create assignment.');
      },
    });
  }

  publishAssignment(item: AssignmentItem): void {
    this.http
      .post(`/api/v1/admin/assignments/${item.id}/publish`, { version: item.version })
      .subscribe({
        next: () => this.fetchAssignments(),
        error: (err) => {
          this.errorMessage.set(err.error?.error?.message || 'Failed to publish assignment.');
        },
      });
  }
}
