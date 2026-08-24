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

export interface AwardItem {
  id: string;
  title: string;
  badgeCode: string;
  category: 'character' | 'milestone' | 'consistency' | 'quarter_completion';
  requiredPointsThreshold: number;
  description?: string;
  status: 'draft' | 'published' | 'archived';
  version: number;
  updatedAt: string;
}

@Component({
  selector: 'gf-admin-awards',
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
    <gf-page-header title="Awards & recognition" eyebrow="Administration">
      <p>Configure deterministic badge criteria, quarter awards, and ceremony recognition thresholds.</p>
    </gf-page-header>

    <div class="awards-container" style="max-width: 1200px; margin: 0 auto; padding: 1rem 0;">
      <!-- Filter Bar & Create Trigger -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <input
            type="text"
            placeholder="Search awards..."
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
          + Create Award Badge
        </button>
      </div>

      <!-- Create Award Modal -->
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
            <h3 style="margin-top: 0; font-size: 1.25rem; font-weight: 700;">Create Recognition Award</h3>

            @if (errorMessage()) {
              <gf-alert title="Error">
                <p>{{ errorMessage() }}</p>
              </gf-alert>
            }

            <form [formGroup]="awardForm" (ngSubmit)="onCreateAward()">
              <div style="margin-bottom: 1rem;">
                <label for="title" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                  Award Title
                </label>
                <input
                  id="title"
                  type="text"
                  formControlName="title"
                  placeholder="e.g. Faithful Finisher Award"
                  style="width: 100%; box-sizing: border-box; padding: 0.6rem; border: 1px solid #ccc; border-radius: 4px;"
                />
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                <div>
                  <label for="badgeCode" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                    Badge Code
                  </label>
                  <input
                    id="badgeCode"
                    type="text"
                    formControlName="badgeCode"
                    placeholder="e.g. FAITHFUL_FINISHER"
                    style="width: 100%; box-sizing: border-box; padding: 0.6rem; border: 1px solid #ccc; border-radius: 4px;"
                  />
                </div>
                <div>
                  <label for="category" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                    Category
                  </label>
                  <select
                    id="category"
                    formControlName="category"
                    style="width: 100%; box-sizing: border-box; padding: 0.6rem; border: 1px solid #ccc; border-radius: 4px;"
                  >
                    <option value="character">Character Growth</option>
                    <option value="consistency">Consistency Streak</option>
                    <option value="milestone">Milestone Target</option>
                    <option value="quarter_completion">Quarter Completion</option>
                  </select>
                </div>
              </div>

              <div style="margin-bottom: 1rem;">
                <label for="requiredPointsThreshold" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                  Required Participation Points Threshold
                </label>
                <input
                  id="requiredPointsThreshold"
                  type="number"
                  formControlName="requiredPointsThreshold"
                  style="width: 100%; box-sizing: border-box; padding: 0.6rem; border: 1px solid #ccc; border-radius: 4px;"
                />
              </div>

              <div style="margin-bottom: 1.5rem;">
                <label for="description" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">
                  Ceremony Citation & Criteria
                </label>
                <textarea
                  id="description"
                  rows="3"
                  formControlName="description"
                  placeholder="Awarded for consistent participation throughout the 12-week quarter..."
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
                  [disabled]="awardForm.invalid || isSubmitting()"
                >
                  {{ isSubmitting() ? 'Saving...' : 'Create Award' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Data Table -->
      @if (isLoading()) {
        <div style="padding: 2rem; text-align: center; color: #666;">Loading awards & badges...</div>
      } @else if (awards().length === 0) {
        <gf-empty-state
          title="No awards found"
          message="Create your first award badge using the '+ Create Award Badge' button above."
        />
      } @else {
        <div style="overflow-x: auto; background: #fff; border-radius: 8px; border: 1px solid #e0e0e0;">
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px solid #e0e0e0; background: #fafafa; font-size: 0.85rem; color: #666;">
                <th style="padding: 0.75rem 1rem;">Award Title</th>
                <th style="padding: 0.75rem 1rem;">Badge Code</th>
                <th style="padding: 0.75rem 1rem;">Category</th>
                <th style="padding: 0.75rem 1rem;">Points Threshold</th>
                <th style="padding: 0.75rem 1rem;">Status</th>
                <th style="padding: 0.75rem 1rem; text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (item of awards(); track item.id) {
                <tr style="border-bottom: 1px solid #eee; font-size: 0.9rem;">
                  <td style="padding: 0.75rem 1rem;">
                    <strong>{{ item.title }}</strong>
                    @if (item.description) {
                      <div style="color: #666; font-size: 0.8rem;">{{ item.description }}</div>
                    }
                  </td>
                  <td style="padding: 0.75rem 1rem; font-family: monospace; font-size: 0.85rem;">{{ item.badgeCode }}</td>
                  <td style="padding: 0.75rem 1rem; text-transform: capitalize;">{{ item.category.replace('_', ' ') }}</td>
                  <td style="padding: 0.75rem 1rem; font-weight: 600; color: #1b4d3e;">{{ item.requiredPointsThreshold }} pts</td>
                  <td style="padding: 0.75rem 1rem;">
                    <gf-badge>{{ item.status }}</gf-badge>
                  </td>
                  <td style="padding: 0.75rem 1rem; text-align: right;">
                    @if (item.status === 'draft') {
                      <button
                        type="button"
                        style="padding: 0.3rem 0.6rem; cursor: pointer; border: 1px solid #1b4d3e; background: #1b4d3e; color: #fff; border-radius: 4px; font-size: 0.8rem;"
                        (click)="publishAward(item)"
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
export class AdminAwardsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);

  readonly awards = signal<AwardItem[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly isSubmitting = signal<boolean>(false);
  readonly showModal = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly searchTerm = signal<string>('');
  readonly selectedStatus = signal<string>('');

  readonly awardForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    badgeCode: ['', [Validators.required, Validators.pattern(/^[A-Z0-9_]{3,30}$/)]],
    category: ['character', [Validators.required]],
    requiredPointsThreshold: [500, [Validators.required, Validators.min(0)]],
    description: ['', [Validators.maxLength(1000)]],
  });

  ngOnInit(): void {
    this.fetchAwards();
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
    this.fetchAwards();
  }

  onStatusChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedStatus.set(value);
    this.fetchAwards();
  }

  fetchAwards(): void {
    this.isLoading.set(true);
    let params = new HttpParams();
    if (this.selectedStatus()) params = params.set('status', this.selectedStatus());
    if (this.searchTerm()) params = params.set('search', this.searchTerm());

    this.http
      .get<{ data: any[] }>('/api/v1/admin/awards', { params })
      .subscribe({
        next: (res) => {
          const rawItems = Array.isArray(res.data) ? res.data : (res.data as any)?.items || [];
          const items = rawItems.map((raw: any) => ({
            id: raw.id,
            title: raw.name || raw.data?.title || 'Untitled Award',
            badgeCode: raw.data?.badgeCode || raw.id.toUpperCase(),
            category: raw.data?.category || 'character',
            requiredPointsThreshold: Number(raw.data?.requiredPointsThreshold ?? 500),
            description: raw.data?.description || '',
            status: raw.status || 'draft',
            version: raw.version || 1,
            updatedAt: raw.updatedAt || new Date().toISOString(),
          }));
          this.awards.set(items);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.awards.set([]);
          this.isLoading.set(false);
          this.errorMessage.set(err.error?.error?.message || 'Failed to load awards.');
        },
      });
  }

  onCreateAward(): void {
    if (this.awardForm.invalid) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const formVal = this.awardForm.value;
    const payload = {
      name: formVal.title,
      data: {
        title: formVal.title,
        badgeCode: formVal.badgeCode,
        category: formVal.category,
        requiredPointsThreshold: Number(formVal.requiredPointsThreshold),
        description: formVal.description,
      },
    };

    this.http.post('/api/v1/admin/awards', payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeModal();
        this.awardForm.reset({
          category: 'character',
          requiredPointsThreshold: 500,
        });
        this.fetchAwards();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.error?.message || 'Failed to create award badge.');
      },
    });
  }

  publishAward(item: AwardItem): void {
    this.http
      .post(`/api/v1/admin/awards/${item.id}/publish`, { version: item.version })
      .subscribe({
        next: () => this.fetchAwards(),
        error: (err) => {
          this.errorMessage.set(err.error?.error?.message || 'Failed to publish award.');
        },
      });
  }
}