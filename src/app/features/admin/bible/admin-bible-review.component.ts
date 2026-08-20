import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiError } from '../../../core/http/api-error';
import { GfAlert, GfBadge, GfPageHeader } from '../../../shared/components/design-system';
import { AdminBibleApiService, BibleImportReview } from './admin-bible-api.service';

@Component({
  standalone: true,
  imports: [RouterLink, GfAlert, GfBadge, GfPageHeader],
  template: `
    <gf-page-header title="Import review" eyebrow="Bible Administration"
      ><p>Review processing and validation results before creating a draft.</p></gf-page-header
    >
    <p><a routerLink="/admin/bible">← Back to Bible content</a></p>
    @if (loading()) {
      <div class="skeleton" role="status">Loading import…</div>
    }
    @if (error(); as failure) {
      <gf-alert title="Import could not be loaded"
        ><p>Try again. If the problem continues, contact an administrator.</p>
        <button (click)="load()">Retry</button></gf-alert
      >
    }
    @if (review(); as item) {
      <article>
        <h2>{{ item.contentTitle }}</h2>
        <dl>
          <div>
            <dt>Quarter</dt>
            <dd>{{ item.quarterName }}</dd>
          </div>
          <div>
            <dt>Question document</dt>
            <dd>{{ item.questionFilename }}</dd>
          </div>
          <div>
            <dt>Answer-key document</dt>
            <dd>{{ item.answerKeyFilename }}</dd>
          </div>
          <div>
            <dt>Import status</dt>
            <dd>
              <gf-badge>{{ item.status }}</gf-badge>
            </dd>
          </div>
          <div>
            <dt>Detected activities</dt>
            <dd>{{ item.activityCount }}</dd>
          </div>
          <div>
            <dt>Detected questions</dt>
            <dd>{{ item.questionCount }}</dd>
          </div>
          <div>
            <dt>Errors</dt>
            <dd>{{ item.errorCount }}</dd>
          </div>
          <div>
            <dt>Warnings</dt>
            <dd>{{ item.warningCount }}</dd>
          </div>
        </dl>
        <p>Preview and commit controls become available when authorized by the service response.</p>
      </article>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        max-width: 58rem;
      }
      article {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        padding: 1.5rem;
      }
      dl div {
        display: grid;
        grid-template-columns: 12rem 1fr;
        padding: 0.65rem 0;
        border-bottom: 1px solid var(--border);
      }
      dt {
        font-weight: 800;
      }
      .skeleton {
        height: 18rem;
        background: #edf0eb;
        animation: pulse 1s infinite alternate;
      }
      @keyframes pulse {
        to {
          opacity: 0.45;
        }
      }
      @media (max-width: 600px) {
        dl div {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBibleReviewComponent {
  private readonly api = inject(AdminBibleApiService);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('importId') ?? '';
  readonly review = signal<BibleImportReview | null>(null);
  readonly error = signal<ApiError | null>(null);
  readonly loading = signal(true);
  constructor() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.getImport(this.id).subscribe({
      next: (value) => {
        this.review.set(value);
        this.loading.set(false);
      },
      error: (error: ApiError) => {
        this.error.set(error);
        this.loading.set(false);
      },
    });
  }
}
