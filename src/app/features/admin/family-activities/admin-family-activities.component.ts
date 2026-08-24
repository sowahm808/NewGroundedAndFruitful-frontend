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

export interface FamilyActivityItem {
  id: string;
  title: string;
  activityType: 'conversation' | 'prayer' | 'challenge' | 'appreciation';
  scheduledWeek: number;
  points: number;
  instructions?: string;
  status: 'draft' | 'published' | 'archived';
  version: number;
  updatedAt: string;
}

@Component({
  selector: 'gf-admin-family-activities',
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
    <gf-page-header title="Family activities" eyebrow="Administration">
      <p>Schedule and publish family connection prompts, shared prayer, and household challenges.</p>
    </gf-page-header>

    <div class="family-container" style="max-width: 1200px; margin: 0 auto; padding: 1rem 0;">
      <!-- Toolbar & Actions -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <input
            type="text"
            placeholder="Search activities..."
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
          + Create Family Activity
        </button>
      </div>

      <!-- Create Activity Modal -->
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
            <h3 style="margin-top: 0; font-size: 1.25rem; font-weight: 700;">Create Family Activity</h3>

            @if (errorMessage()) {
              <gf-alert title="Error">
                <p>{{ errorMessage() }}</p>
              </gf-alert>
            }

            <form [formGroup]="activityForm" (ngSubmit)="onCreateActivity()">
              <div style="margin-bottom: 1rem;">
                <label for="title" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                  Activity Title
                </label>
                <input
                  id="title"
                  type="text"
                  formControlName="title"
                  placeholder="e.g. Gratitude Dinner Discussion"
                  style="width: 100%; box-sizing: border-box; padding: 0.6rem; border: 1px solid #ccc; border-radius: 4px;"
                />
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                <div>
                  <label for="activityType" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                    Activity Type
                  </label>
                  <select
                    id="activityType"
                    formControlName="activityType"
                    style="width: 100%; box-sizing: border-box; padding: 0.6rem; border: 1px solid #ccc; border-radius: 4px;"
                  >
                    <option value="conversation">Conversation Prompt</option>
                    <option value="prayer">Shared Prayer</option>
                    <option value="challenge">Parent-Child Challenge</option>
                    <option value="appreciation">Family Appreciation</option>
                  </select>
                </div>
                <div>
                  <label for="scheduledWeek" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                    Week (1-12)
                  </label>
                  <input
                    id="scheduledWeek"
                    type="number"
                    formControlName="scheduledWeek"
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
                <label for="instructions" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                  Instructions & Discussion Guide
                </label>
                <textarea
                  id="instructions"
                  rows="3"
                  formControlName="instructions"
                  placeholder="Enter prompts or instructions for families..."
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
                  [disabled]="activityForm.invalid || isSubmitting()"
                >
                  {{ isSubmitting() ? 'Saving...' : 'Create' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Activities Table -->
      @if (isLoading()) {
        <div style="padding: 2rem; text-align: center; color: #666;">Loading family activities...</div>
      } @else if (activities().length === 0) {
        <gf-empty-state
          title="No family activities found"
          message="Create your first activity using the '+ Create Family Activity' button above."
        />
      } @else {
        <div style="overflow-x: auto; background: #fff; border-radius: 8px; border: 1px solid #e0e0e0;">
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px solid #e0e0e0; background: #fafafa; font-size: 0.85rem; color: #666;">
                <th style="padding: 0.75rem 1rem;">Week</th>
                <th style="padding: 0.75rem 1rem;">Title</th>
                <th style="padding: 0.75rem 1rem;">Type</th>
                <th style="padding: 0.75rem 1rem;">Points</th>
                <th style="padding: 0.75rem 1rem;">Status</th>
                <th style="padding: 0.75rem 1rem; text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (item of activities(); track item.id) {
                <tr style="border-bottom: 1px solid #eee; font-size: 0.9rem;">
                  <td style="padding: 0.75rem 1rem; font-weight: 600;">Wk {{ item.scheduledWeek }}</td>
                  <td style="padding: 0.75rem 1rem;">
                    <strong>{{ item.title }}</strong>
                    @if (item.instructions) {
                      <div style="color: #666; font-size: 0.8rem;">{{ item.instructions }}</div>
                    }
                  </td>
                  <td style="padding: 0.75rem 1rem; text-transform: capitalize;">{{ item.activityType }}</td>
                  <td style="padding: 0.75rem 1rem;">{{ item.points }} pts</td>
                  <td style="padding: 0.75rem 1rem;">
                    <gf-badge>{{ item.status }}</gf-badge>
                  </td>
                  <td style="padding: 0.75rem 1rem; text-align: right;">
                    @if (item.status === 'draft') {
                      <button
                        type="button"
                        style="padding: 0.3rem 0.6rem; cursor: pointer; border: 1px solid #1b4d3e; background: #1b4d3e; color: #fff; border-radius: 4px; font-size: 0.8rem;"
                        (click)="publishActivity(item)"
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
export class AdminFamilyActivitiesComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);

  readonly activities = signal<FamilyActivityItem[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly isSubmitting = signal<boolean>(false);
  readonly showModal = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly searchTerm = signal<string>('');
  readonly selectedStatus = signal<string>('');

  readonly activityForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    activityType: ['conversation', [Validators.required]],
    scheduledWeek: [1, [Validators.required, Validators.min(1), Validators.max(12)]],
    points: [50, [Validators.required, Validators.min(10)]],
    instructions: ['', [Validators.maxLength(1000)]],
  });

  ngOnInit(): void {
    this.fetchActivities();
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
    this.fetchActivities();
  }

  onStatusChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedStatus.set(value);
    this.fetchActivities();
  }

  fetchActivities(): void {
    this.isLoading.set(true);
    let params = new HttpParams();
    if (this.selectedStatus()) params = params.set('status', this.selectedStatus());
    if (this.searchTerm()) params = params.set('search', this.searchTerm());

    this.http
      .get<{ data: { items: any[] } }>('/api/v1/admin/family-activities', { params })
      .subscribe({
        next: (res) => {
          const items = (res.data?.items || []).map((raw) => ({
            id: raw.id,
            title: raw.name || raw.data?.title || 'Untitled Family Activity',
            instructions: raw.data?.instructions || '',
            activityType: raw.data?.activityType || 'conversation',
            scheduledWeek: Number(raw.data?.scheduledWeek ?? 1),
            points: Number(raw.data?.points ?? 50),
            status: raw.status || 'draft',
            version: raw.version || 1,
            updatedAt: raw.updatedAt || new Date().toISOString(),
          }));
          this.activities.set(items);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.activities.set([]);
          this.isLoading.set(false);
          this.errorMessage.set(err.error?.error?.message || 'Failed to load family activities.');
        },
      });
  }

  onCreateActivity(): void {
    if (this.activityForm.invalid) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const formVal = this.activityForm.value;
    const payload = {
      name: formVal.title,
      data: {
        title: formVal.title,
        activityType: formVal.activityType,
        scheduledWeek: Number(formVal.scheduledWeek),
        points: Number(formVal.points),
        instructions: formVal.instructions,
      },
    };

    this.http.post('/api/v1/admin/family-activities', payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeModal();
        this.activityForm.reset({ activityType: 'conversation', scheduledWeek: 1, points: 50 });
        this.fetchActivities();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.error?.message || 'Failed to create family activity.');
      },
    });
  }

  publishActivity(item: FamilyActivityItem): void {
    this.http
      .post(`/api/v1/admin/family-activities/${item.id}/publish`, { version: item.version })
      .subscribe({
        next: () => this.fetchActivities(),
        error: (err) => {
          this.errorMessage.set(err.error?.error?.message || 'Failed to publish activity.');
        },
      });
  }
}