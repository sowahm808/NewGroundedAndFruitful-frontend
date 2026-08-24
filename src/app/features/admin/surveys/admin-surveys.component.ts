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

export interface SurveyItem {
  id: string;
  title: string;
  surveyType: 'pre_program' | 'mid_program' | 'post_program' | 'annual';
  targetAudience: 'child' | 'parent' | 'mentor' | 'all';
  targetWeek: number;
  questionCount: number;
  privacyNotice: string;
  status: 'draft' | 'published' | 'archived';
  version: number;
  updatedAt: string;
}

@Component({
  selector: 'gf-admin-surveys',
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
    <gf-page-header title="Surveys" eyebrow="Administration">
      <p>Manage privacy-noticed surveys, feedback instruments, and response windows.</p>
    </gf-page-header>

    <div class="surveys-container" style="max-width: 1200px; margin: 0 auto; padding: 1rem 0;">
      <!-- Filter Bar & Create Trigger -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <input
            type="text"
            placeholder="Search surveys..."
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
          + Create Survey
        </button>
      </div>

      <!-- Create Survey Modal -->
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
            <h3 style="margin-top: 0; font-size: 1.25rem; font-weight: 700;">Create Program Survey</h3>

            @if (errorMessage()) {
              <gf-alert title="Error">
                <p>{{ errorMessage() }}</p>
              </gf-alert>
            }

            <form [formGroup]="surveyForm" (ngSubmit)="onCreateSurvey()">
              <div style="margin-bottom: 1rem;">
                <label for="title" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                  Survey Title
                </label>
                <input
                  id="title"
                  type="text"
                  formControlName="title"
                  placeholder="e.g. Pre-Quarter Growth Baseline Survey"
                  style="width: 100%; box-sizing: border-box; padding: 0.6rem; border: 1px solid #ccc; border-radius: 4px;"
                />
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                <div>
                  <label for="surveyType" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                    Survey Type
                  </label>
                  <select
                    id="surveyType"
                    formControlName="surveyType"
                    style="width: 100%; box-sizing: border-box; padding: 0.6rem; border: 1px solid #ccc; border-radius: 4px;"
                  >
                    <option value="pre_program">Pre-Quarter Survey</option>
                    <option value="mid_program">Mid-Quarter Checkpoint</option>
                    <option value="post_program">Post-Quarter Survey</option>
                    <option value="annual">Annual Composite Survey</option>
                  </select>
                </div>
                <div>
                  <label for="targetAudience" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                    Target Audience
                  </label>
                  <select
                    id="targetAudience"
                    formControlName="targetAudience"
                    style="width: 100%; box-sizing: border-box; padding: 0.6rem; border: 1px solid #ccc; border-radius: 4px;"
                  >
                    <option value="child">Child / Participant</option>
                    <option value="parent">Parent / Guardian</option>
                    <option value="mentor">Mentor</option>
                    <option value="all">All Personas</option>
                  </select>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                <div>
                  <label for="targetWeek" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                    Active Week (1-12)
                  </label>
                  <input
                    id="targetWeek"
                    type="number"
                    formControlName="targetWeek"
                    style="width: 100%; box-sizing: border-box; padding: 0.6rem; border: 1px solid #ccc; border-radius: 4px;"
                  />
                </div>
                <div>
                  <label for="questionCount" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                    Question Count
                  </label>
                  <input
                    id="questionCount"
                    type="number"
                    formControlName="questionCount"
                    style="width: 100%; box-sizing: border-box; padding: 0.6rem; border: 1px solid #ccc; border-radius: 4px;"
                  />
                </div>
              </div>

              <div style="margin-bottom: 1.5rem;">
                <label for="privacyNotice" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                  Privacy Notice & Voluntary Disclaimer
                </label>
                <textarea
                  id="privacyNotice"
                  rows="3"
                  formControlName="privacyNotice"
                  placeholder="Responses are confidential and summarized strictly at the aggregate cohort level..."
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
                  [disabled]="surveyForm.invalid || isSubmitting()"
                >
                  {{ isSubmitting() ? 'Saving...' : 'Create Survey' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Data Table -->
      @if (isLoading()) {
        <div style="padding: 2rem; text-align: center; color: #666;">Loading surveys...</div>
      } @else if (surveys().length === 0) {
        <gf-empty-state
          title="No surveys found"
          message="Create your first survey using the '+ Create Survey' button above."
        />
      } @else {
        <div style="overflow-x: auto; background: #fff; border-radius: 8px; border: 1px solid #e0e0e0;">
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px solid #e0e0e0; background: #fafafa; font-size: 0.85rem; color: #666;">
                <th style="padding: 0.75rem 1rem;">Target Week</th>
                <th style="padding: 0.75rem 1rem;">Survey Title</th>
                <th style="padding: 0.75rem 1rem;">Type</th>
                <th style="padding: 0.75rem 1rem;">Audience</th>
                <th style="padding: 0.75rem 1rem;">Questions</th>
                <th style="padding: 0.75rem 1rem;">Status</th>
                <th style="padding: 0.75rem 1rem; text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (item of surveys(); track item.id) {
                <tr style="border-bottom: 1px solid #eee; font-size: 0.9rem;">
                  <td style="padding: 0.75rem 1rem; font-weight: 600;">Wk {{ item.targetWeek }}</td>
                  <td style="padding: 0.75rem 1rem;">
                    <strong>{{ item.title }}</strong>
                    @if (item.privacyNotice) {
                      <div style="color: #666; font-size: 0.8rem;">Notice: {{ item.privacyNotice }}</div>
                    }
                  </td>
                  <td style="padding: 0.75rem 1rem; text-transform: capitalize;">{{ item.surveyType.replace('_', ' ') }}</td>
                  <td style="padding: 0.75rem 1rem; text-transform: capitalize;">{{ item.targetAudience }}</td>
                  <td style="padding: 0.75rem 1rem;">{{ item.questionCount }} questions</td>
                  <td style="padding: 0.75rem 1rem;">
                    <gf-badge>{{ item.status }}</gf-badge>
                  </td>
                  <td style="padding: 0.75rem 1rem; text-align: right;">
                    @if (item.status === 'draft') {
                      <button
                        type="button"
                        style="padding: 0.3rem 0.6rem; cursor: pointer; border: 1px solid #1b4d3e; background: #1b4d3e; color: #fff; border-radius: 4px; font-size: 0.8rem;"
                        (click)="publishSurvey(item)"
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
export class AdminSurveysComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);

  readonly surveys = signal<SurveyItem[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly isSubmitting = signal<boolean>(false);
  readonly showModal = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly searchTerm = signal<string>('');
  readonly selectedStatus = signal<string>('');

  readonly surveyForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    surveyType: ['pre_program', [Validators.required]],
    targetAudience: ['child', [Validators.required]],
    targetWeek: [1, [Validators.required, Validators.min(1), Validators.max(12)]],
    questionCount: [5, [Validators.required, Validators.min(1), Validators.max(50)]],
    privacyNotice: [
      'Responses are confidential and analyzed only at the aggregate cohort level.',
      [Validators.required, Validators.maxLength(1000)],
    ],
  });

  ngOnInit(): void {
    this.fetchSurveys();
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
    this.fetchSurveys();
  }

  onStatusChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedStatus.set(value);
    this.fetchSurveys();
  }

  fetchSurveys(): void {
    this.isLoading.set(true);
    let params = new HttpParams();
    if (this.selectedStatus()) params = params.set('status', this.selectedStatus());
    if (this.searchTerm()) params = params.set('search', this.searchTerm());

    this.http
      .get<{ data: { items: any[] } }>('/api/v1/admin/surveys', { params })
      .subscribe({
        next: (res) => {
          const items = (res.data?.items || []).map((raw) => ({
            id: raw.id,
            title: raw.name || raw.data?.title || 'Untitled Survey',
            surveyType: raw.data?.surveyType || 'pre_program',
            targetAudience: raw.data?.targetAudience || 'child',
            targetWeek: Number(raw.data?.targetWeek ?? 1),
            questionCount: Number(raw.data?.questionCount ?? 5),
            privacyNotice: raw.data?.privacyNotice || '',
            status: raw.status || 'draft',
            version: raw.version || 1,
            updatedAt: raw.updatedAt || new Date().toISOString(),
          }));
          this.surveys.set(items);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.surveys.set([]);
          this.isLoading.set(false);
          this.errorMessage.set(err.error?.error?.message || 'Failed to load surveys.');
        },
      });
  }

  onCreateSurvey(): void {
    if (this.surveyForm.invalid) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const formVal = this.surveyForm.value;
    const payload = {
      name: formVal.title,
      data: {
        title: formVal.title,
        surveyType: formVal.surveyType,
        targetAudience: formVal.targetAudience,
        targetWeek: Number(formVal.targetWeek),
        questionCount: Number(formVal.questionCount),
        privacyNotice: formVal.privacyNotice,
      },
    };

    this.http.post('/api/v1/admin/surveys', payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeModal();
        this.surveyForm.reset({
          surveyType: 'pre_program',
          targetAudience: 'child',
          targetWeek: 1,
          questionCount: 5,
          privacyNotice: 'Responses are confidential and analyzed only at the aggregate cohort level.',
        });
        this.fetchSurveys();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.error?.message || 'Failed to create survey.');
      },
    });
  }

  publishSurvey(item: SurveyItem): void {
    this.http
      .post(`/api/v1/admin/surveys/${item.id}/publish`, { version: item.version })
      .subscribe({
        next: () => this.fetchSurveys(),
        error: (err) => {
          this.errorMessage.set(err.error?.error?.message || 'Failed to publish survey.');
        },
      });
  }
}