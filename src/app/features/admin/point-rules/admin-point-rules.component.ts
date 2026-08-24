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

export interface PointRuleItem {
  id: string;
  name: string;
  sourceType:
    | 'daily_checkin'
    | 'gratitude'
    | 'character_assessment'
    | 'bible_activity'
    | 'family_activity'
    | 'reading_assignment'
    | 'project_milestone'
    | 'observation_bonus'
    | 'special_activity';
  pointAmount: number;
  description?: string;
  cadence: 'daily' | 'weekly' | 'per_completion' | 'quarterly';
  status: 'draft' | 'published' | 'archived';
  version: number;
  updatedAt: string;
}

@Component({
  selector: 'gf-admin-point-rules',
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
    <gf-page-header title="Point rules" eyebrow="Administration">
      <p>Configure versioned, backend-calculated participation rules and point award amounts.</p>
    </gf-page-header>

    <div class="point-rules-container" style="max-width: 1200px; margin: 0 auto; padding: 1rem 0;">
      <!-- Filter Bar & Create Trigger -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <input
            type="text"
            placeholder="Search point rules..."
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
          + Create Point Rule
        </button>
      </div>

      <!-- Create Point Rule Modal -->
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
            <h3 style="margin-top: 0; font-size: 1.25rem; font-weight: 700;">Create Participation Point Rule</h3>

            @if (errorMessage()) {
              <gf-alert title="Error">
                <p>{{ errorMessage() }}</p>
              </gf-alert>
            }

            <form [formGroup]="ruleForm" (ngSubmit)="onCreateRule()">
              <div style="margin-bottom: 1rem;">
                <label for="name" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                  Rule Name
                </label>
                <input
                  id="name"
                  type="text"
                  formControlName="name"
                  placeholder="e.g. Daily Bible Activity Completion"
                  style="width: 100%; box-sizing: border-box; padding: 0.6rem; border: 1px solid #ccc; border-radius: 4px;"
                />
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                <div>
                  <label for="sourceType" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                    Source Event
                  </label>
                  <select
                    id="sourceType"
                    formControlName="sourceType"
                    style="width: 100%; box-sizing: border-box; padding: 0.6rem; border: 1px solid #ccc; border-radius: 4px;"
                  >
                    <option value="daily_checkin">Daily Check-in</option>
                    <option value="gratitude">Gratitude Entry</option>
                    <option value="character_assessment">Character Assessment</option>
                    <option value="bible_activity">Bible Activity</option>
                    <option value="family_activity">Family Activity</option>
                    <option value="reading_assignment">Reading Assignment</option>
                    <option value="project_milestone">Project Milestone</option>
                    <option value="observation_bonus">Observation Bonus</option>
                    <option value="special_activity">Special Activity</option>
                  </select>
                </div>
                <div>
                  <label for="cadence" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                    Award Cadence
                  </label>
                  <select
                    id="cadence"
                    formControlName="cadence"
                    style="width: 100%; box-sizing: border-box; padding: 0.6rem; border: 1px solid #ccc; border-radius: 4px;"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="per_completion">Per Completion</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>
              </div>

              <div style="margin-bottom: 1rem;">
                <label for="pointAmount" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                  Point Amount (Fixed Participation)
                </label>
                <input
                  id="pointAmount"
                  type="number"
                  formControlName="pointAmount"
                  style="width: 100%; box-sizing: border-box; padding: 0.6rem; border: 1px solid #ccc; border-radius: 4px;"
                />
              </div>

              <div style="margin-bottom: 1.5rem;">
                <label for="description" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                  Description & Audit Invariant Note
                </label>
                <textarea
                  id="description"
                  rows="3"
                  formControlName="description"
                  placeholder="Points awarded strictly for eligible participation, regardless of score or quality..."
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
                  [disabled]="ruleForm.invalid || isSubmitting()"
                >
                  {{ isSubmitting() ? 'Saving...' : 'Create Rule' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Data Table -->
      @if (isLoading()) {
        <div style="padding: 2rem; text-align: center; color: #666;">Loading point rules...</div>
      } @else if (pointRules().length === 0) {
        <gf-empty-state
          title="No point rules found"
          message="Create your first rule using the '+ Create Point Rule' button above."
        />
      } @else {
        <div style="overflow-x: auto; background: #fff; border-radius: 8px; border: 1px solid #e0e0e0;">
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px solid #e0e0e0; background: #fafafa; font-size: 0.85rem; color: #666;">
                <th style="padding: 0.75rem 1rem;">Rule Name</th>
                <th style="padding: 0.75rem 1rem;">Source Event</th>
                <th style="padding: 0.75rem 1rem;">Cadence</th>
                <th style="padding: 0.75rem 1rem;">Award</th>
                <th style="padding: 0.75rem 1rem;">Version</th>
                <th style="padding: 0.75rem 1rem;">Status</th>
                <th style="padding: 0.75rem 1rem; text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (item of pointRules(); track item.id) {
                <tr style="border-bottom: 1px solid #eee; font-size: 0.9rem;">
                  <td style="padding: 0.75rem 1rem;">
                    <strong>{{ item.name }}</strong>
                    @if (item.description) {
                      <div style="color: #666; font-size: 0.8rem;">{{ item.description }}</div>
                    }
                  </td>
                  <td style="padding: 0.75rem 1rem; text-transform: capitalize;">{{ item.sourceType.replace('_', ' ') }}</td>
                  <td style="padding: 0.75rem 1rem; text-transform: capitalize;">{{ item.cadence.replace('_', ' ') }}</td>
                  <td style="padding: 0.75rem 1rem; font-weight: 600; color: #1b4d3e;">+{{ item.pointAmount }} pts</td>
                  <td style="padding: 0.75rem 1rem;">v{{ item.version }}</td>
                  <td style="padding: 0.75rem 1rem;">
                    <gf-badge>{{ item.status }}</gf-badge>
                  </td>
                  <td style="padding: 0.75rem 1rem; text-align: right;">
                    @if (item.status === 'draft') {
                      <button
                        type="button"
                        style="padding: 0.3rem 0.6rem; cursor: pointer; border: 1px solid #1b4d3e; background: #1b4d3e; color: #fff; border-radius: 4px; font-size: 0.8rem;"
                        (click)="publishRule(item)"
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
export class AdminPointRulesComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);

  readonly pointRules = signal<PointRuleItem[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly isSubmitting = signal<boolean>(false);
  readonly showModal = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly searchTerm = signal<string>('');
  readonly selectedStatus = signal<string>('');

  readonly ruleForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    sourceType: ['daily_checkin', [Validators.required]],
    cadence: ['daily', [Validators.required]],
    pointAmount: [50, [Validators.required, Validators.min(1)]],
    description: ['', [Validators.maxLength(1000)]],
  });

  ngOnInit(): void {
    this.fetchRules();
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
    this.fetchRules();
  }

  onStatusChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedStatus.set(value);
    this.fetchRules();
  }

  fetchRules(): void {
    this.isLoading.set(true);
    let params = new HttpParams();
    if (this.selectedStatus()) params = params.set('status', this.selectedStatus());
    if (this.searchTerm()) params = params.set('search', this.searchTerm());

    this.http
      .get<{ data: { items: any[] } }>('/api/v1/admin/point-rules', { params })
      .subscribe({
        next: (res) => {
          const items = (res.data?.items || []).map((raw) => ({
            id: raw.id,
            name: raw.name || raw.data?.name || 'Untitled Point Rule',
            sourceType: raw.data?.sourceType || 'daily_checkin',
            cadence: raw.data?.cadence || 'daily',
            pointAmount: Number(raw.data?.pointAmount ?? 50),
            description: raw.data?.description || '',
            status: raw.status || 'draft',
            version: raw.version || 1,
            updatedAt: raw.updatedAt || new Date().toISOString(),
          }));
          this.pointRules.set(items);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.pointRules.set([]);
          this.isLoading.set(false);
          this.errorMessage.set(err.error?.error?.message || 'Failed to load point rules.');
        },
      });
  }

  onCreateRule(): void {
    if (this.ruleForm.invalid) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const formVal = this.ruleForm.value;
    const payload = {
      name: formVal.name,
      data: {
        name: formVal.name,
        sourceType: formVal.sourceType,
        cadence: formVal.cadence,
        pointAmount: Number(formVal.pointAmount),
        description: formVal.description,
      },
    };

    this.http.post('/api/v1/admin/point-rules', payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeModal();
        this.ruleForm.reset({
          sourceType: 'daily_checkin',
          cadence: 'daily',
          pointAmount: 50,
        });
        this.fetchRules();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.error?.message || 'Failed to create point rule.');
      },
    });
  }

  publishRule(item: PointRuleItem): void {
    this.http
      .post(`/api/v1/admin/point-rules/${item.id}/publish`, { version: item.version })
      .subscribe({
        next: () => this.fetchRules(),
        error: (err) => {
          this.errorMessage.set(err.error?.error?.message || 'Failed to publish point rule.');
        },
      });
  }
}