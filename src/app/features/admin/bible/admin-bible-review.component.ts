import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiError } from '../../../core/http/api-error';
import { GfAlert, GfBadge, GfPageHeader, GfStatCard } from '../../../shared/components/design-system';
import { AdminBibleApiService, BibleImportReview } from './admin-bible-api.service';

type ViewState = 'loading' | 'ready' | 'contract_error' | 'forbidden' | 'not_found' | 'conflict' | 'dependency_error';
@Component({
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, RouterLink, GfAlert, GfBadge, GfPageHeader, GfStatCard],
  template: `
    <p><a routerLink="/admin/bible" [queryParams]="{ tab: 'imports' }">← Back to Imports</a></p>
    @if (state() === 'loading') {
      <div class="skeleton" role="status">Loading import review…</div>
    } @else if (state() !== 'ready') {
      <gf-alert [title]="errorTitle()"
        ><p>{{ error()?.message }}</p>
        @if (error()?.requestId; as requestId) {
          <p>Request ID: {{ requestId }}</p>
        }
        <button type="button" (click)="load()">Retry</button></gf-alert
      >
    } @else if (review(); as item) {
      <header class="review-header">
        <div>
          <p class="eyebrow">Bible import review</p>
          <h1>{{ item.title }}</h1>
          <p>{{ item.quarter.name }} · Uploaded {{ item.uploadedAt | date: 'medium' }} by {{ item.uploadedBy }}</p>
          <p>Parser {{ item.parserVersion }}</p>
        </div>
        <gf-badge>{{ statusLabel(item.status) }}</gf-badge>
      </header>
      <section class="summary" aria-label="Import summary">
        <gf-stat-card label="Detected activities" [value]="item.activityCount" /><gf-stat-card
          label="Detected questions"
          [value]="item.questionCount"
        /><gf-stat-card label="Warnings" [value]="item.warningCount" /><gf-stat-card
          label="Blocking errors"
          [value]="item.errorCount"
        />
      </section>
      <section>
        <h2>Source documents</h2>
        <p class="privacy">
          <strong>Answer key privacy:</strong> Source files and correct answers are restricted to authorized
          administrators reviewing this import. Never share them with participants.
        </p>
        <div class="documents">
          <article>
            <h3>Question document</h3>
            <p>{{ item.documents.question.filename }}</p>
            <p>{{ fileSize(item.documents.question.sizeBytes) }}</p>
            <div class="actions">
              @if (item.documents.question.viewUrl) {
                <a [href]="item.documents.question.viewUrl" target="_blank" rel="noopener">View</a>
              }
              @if (item.documents.question.downloadUrl) {
                <a [href]="item.documents.question.downloadUrl">Download</a>
              }
              @if (!item.documents.question.viewUrl && !item.documents.question.downloadUrl) {
                <span>Source actions were not authorized by the service.</span>
              }
            </div>
          </article>
          <article>
            <h3>Answer-key document</h3>
            <p>{{ item.documents.answerKey.filename }}</p>
            <p>{{ fileSize(item.documents.answerKey.sizeBytes) }}</p>
            <div class="actions">
              @if (item.documents.answerKey.viewUrl) {
                <a [href]="item.documents.answerKey.viewUrl" target="_blank" rel="noopener">View</a>
              }
              @if (item.documents.answerKey.downloadUrl) {
                <a [href]="item.documents.answerKey.downloadUrl">Download</a>
              }
              @if (!item.documents.answerKey.viewUrl && !item.documents.answerKey.downloadUrl) {
                <span>Answer-key actions were not authorized by the service.</span>
              }
            </div>
          </article>
        </div>
      </section>
      <section>
        <h2>Validation</h2>
        <dl class="validation">
          <div>
            <dt>Date range</dt>
            <dd>{{ item.validation.dateRange || 'No diagnostic supplied' }}</dd>
          </div>
          <div>
            <dt>Question/answer reconciliation</dt>
            <dd>{{ item.validation.reconciliation || 'No diagnostic supplied' }}</dd>
          </div>
          <div>
            <dt>Parser diagnostics</dt>
            <dd>{{ item.validation.diagnostics || 'No diagnostic supplied' }}</dd>
          </div>
        </dl>
        @if (item.validation.issues.length) {
          <ul class="issues">
            @for (issue of item.validation.issues; track issue.code + issue.message) {
              <li [class.blocking]="issue.blocking">
                <strong>{{ issue.blocking ? 'Blocking error' : 'Warning' }}:</strong> {{ issue.message }}
              </li>
            }
          </ul>
        } @else {
          <p>No validation issues detected.</p>
        }
      </section>
      <section>
        <div class="preview-title">
          <h2>Parsed preview</h2>
          <label>Search questions <input type="search" [(ngModel)]="search" /></label>
        </div>
        @if (!visibleActivities().length) {
          <p>No preview questions match your search.</p>
        }
        @for (activity of visibleActivities(); track activity.id) {
          <details>
            <summary>
              <strong>{{ activity.title }}</strong> · {{ activity.date }} · {{ activity.questions.length }} questions
            </summary>
            @for (question of activity.questions; track question.number) {
              <article class="question">
                <h3>Question {{ question.number }}</h3>
                <p>{{ question.prompt }}</p>
                <ol type="A">
                  @for (choice of question.choices; track choice.id) {
                    <li [class.correct]="choice.isCorrect">
                      {{ choice.text }}
                      @if (choice.isCorrect) {
                        <strong>✓ Detected correct choice</strong>
                      }
                    </li>
                  }
                </ol>
                @for (issue of question.issues; track issue.code + issue.message) {
                  <p class="question-issue">{{ issue.blocking ? 'Error' : 'Warning' }}: {{ issue.message }}</p>
                }
              </article>
            }
          </details>
        }
        @if (filteredActivities().length > pageSize) {
          <nav class="pager">
            <button (click)="previewPage.set(previewPage() - 1)" [disabled]="previewPage() === 1">Previous</button
            ><span>Page {{ previewPage() }} of {{ previewPages() }}</span
            ><button (click)="previewPage.set(previewPage() + 1)" [disabled]="previewPage() === previewPages()">
              Next
            </button>
          </nav>
        }
      </section>
      <section class="decision">
        <h2>Review decision</h2>
        @if (item.allowedActions.includes('commit')) {
          <button class="primary" type="button" (click)="confirming.set(true)" [disabled]="submitting()">
            Approve and create draft
          </button>
        } @else {
          <gf-alert title="This import cannot be approved"
            ><p>
              {{
                item.reviewBlock?.reason ||
                  'The service did not provide a commit action or an explanation. Refresh the import; if this continues, report a response contract error.'
              }}
            </p>
            @if (item.reviewBlock?.code) {
              <p>Reason: {{ blockLabel(item.reviewBlock!.code) }}</p>
            }
          </gf-alert>
        }
        <div class="actions">
          @if (item.allowedActions.includes('reject')) {
            <button type="button" (click)="reject()" [disabled]="submitting()">Reject import</button>
          }
          @if (item.allowedActions.includes('reprocess')) {
            <button type="button" (click)="reprocess()" [disabled]="submitting()">Reprocess documents</button>
          }
          <a routerLink="/admin/bible" [queryParams]="{ tab: 'imports' }">Cancel / back</a>
        </div>
        @if (actionError(); as failure) {
          <gf-alert [title]="actionErrorTitle(failure)"
            ><p>{{ failure.message }}</p>
            @if (failure.requestId) {
              <p>Request ID: {{ failure.requestId }}</p>
            }
          </gf-alert>
        }
      </section>
      @if (confirming()) {
        <div class="backdrop" role="presentation">
          <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <h2 id="confirm-title">Create draft content set?</h2>
            <p>
              Approve <strong>{{ item.title }}</strong> for {{ item.quarter.name }}. This creates one draft with
              {{ item.activityCount }} activities and {{ item.questionCount }} questions.
            </p>
            <p>Warnings: {{ item.warningCount }} · Blocking errors: {{ item.errorCount }}</p>
            <div class="actions">
              <button class="primary" (click)="commit()" [disabled]="submitting()">
                {{ submitting() ? 'Creating draft…' : 'Confirm approval' }}</button
              ><button (click)="confirming.set(false)" [disabled]="submitting()">Keep reviewing</button>
            </div>
          </section>
        </div>
      }
    }
  `,
  styles: [
    `
      :host {
        display: block;
        max-width: 76rem;
      }
      .review-header {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: start;
      }
      .eyebrow {
        color: var(--brand);
        font-weight: 800;
        text-transform: uppercase;
      }
      .summary,
      .documents {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
        gap: 1rem;
      }
      .summary,
      section {
        margin-bottom: 1.5rem;
      }
      .documents article,
      .question,
      details,
      .decision {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        padding: 1rem;
      }
      .privacy {
        border-left: 4px solid var(--brand);
        padding: 0.75rem;
        background: #f4f7f1;
      }
      .validation div {
        display: grid;
        grid-template-columns: 15rem 1fr;
        padding: 0.6rem;
        border-bottom: 1px solid var(--border);
      }
      dt {
        font-weight: 800;
      }
      .issues .blocking {
        color: #9b1c1c;
      }
      .preview-title,
      .actions,
      .pager {
        display: flex;
        gap: 0.75rem;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
      }
      input,
      button {
        min-height: 44px;
        padding: 0.55rem 0.8rem;
        font: inherit;
      }
      details {
        margin: 0.75rem 0;
      }
      summary {
        cursor: pointer;
      }
      .correct {
        background: #e6f4e6;
        border-left: 4px solid #247a36;
        padding: 0.4rem;
      }
      .question-issue {
        color: #8a4b00;
      }
      .primary {
        background: var(--brand);
        color: #fff;
        border: 0;
        border-radius: 0.5rem;
        font-weight: 800;
      }
      .skeleton {
        height: 25rem;
        background: #edf0eb;
      }
      .backdrop {
        position: fixed;
        inset: 0;
        background: #0009;
        display: grid;
        place-items: center;
        padding: 1rem;
        z-index: 10;
      }
      .dialog {
        background: #fff;
        max-width: 34rem;
        padding: 1.5rem;
        border-radius: var(--radius-lg);
      }
      @media (max-width: 600px) {
        .review-header {
          display: block;
        }
        .validation div {
          grid-template-columns: 1fr;
        }
        .preview-title {
          align-items: stretch;
        }
        .preview-title label,
        .preview-title input {
          width: 100%;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBibleReviewComponent {
  private readonly api = inject(AdminBibleApiService);
  private readonly router = inject(Router);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('importId') ?? '';
  readonly review = signal<BibleImportReview | null>(null);
  readonly error = signal<ApiError | null>(null);
  readonly state = signal<ViewState>('loading');
  readonly search = signal('');
  readonly previewPage = signal(1);
  readonly pageSize = 5;
  readonly confirming = signal(false);
  readonly submitting = signal(false);
  readonly actionError = signal<ApiError | null>(null);
  private commitKey = '';
  readonly filteredActivities = computed(() => {
    const term = this.search().trim().toLowerCase();
    const rows = this.review()?.activities ?? [];
    return !term
      ? rows
      : rows
          .map((a) => ({
            ...a,
            questions: a.questions.filter((q) =>
              `${q.number} ${q.prompt} ${q.choices.map((c) => c.text).join(' ')}`.toLowerCase().includes(term),
            ),
          }))
          .filter((a) => a.questions.length);
  });
  readonly previewPages = computed(() => Math.max(1, Math.ceil(this.filteredActivities().length / this.pageSize)));
  readonly visibleActivities = computed(() =>
    this.filteredActivities().slice((this.previewPage() - 1) * this.pageSize, this.previewPage() * this.pageSize),
  );
  constructor() {
    this.load();
  }
  load() {
    this.state.set('loading');
    this.error.set(null);
    this.api.getImport(this.id).subscribe({
      next: (v) => {
        this.review.set(v);
        this.state.set('ready');
      },
      error: (e: ApiError) => {
        this.error.set(e);
        this.state.set(
          e.status === 403
            ? 'forbidden'
            : e.status === 404
              ? 'not_found'
              : e.status === 409
                ? 'conflict'
                : e.status < 0
                  ? 'contract_error'
                  : 'dependency_error',
        );
      },
    });
  }
  commit() {
    const item = this.review();
    if (!item || this.submitting()) return;
    this.submitting.set(true);
    this.actionError.set(null);
    this.commitKey ||= crypto.randomUUID();
    this.api
      .commitImport(item.id, item.version, this.commitKey)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (result) => {
          if (!result.committedContentSetId) {
            this.actionError.set(
              new ApiError(-1, 'unexpected_error', 'Commit succeeded without committedContentSetId.'),
            );
            return;
          }
          this.load();
          void this.router.navigate(['/admin/bible/content', result.committedContentSetId], {
            state: { success: 'The import was approved and a draft Bible content set was created.' },
          });
        },
        error: (e: ApiError) => {
          this.actionError.set(e);
          this.confirming.set(false);
        },
      });
  }
  reprocess() {
    const i = this.review();
    if (!i || this.submitting()) return;
    this.submitting.set(true);
    this.api
      .reprocessImport(i.id, i.version)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({ next: () => this.load(), error: (e: ApiError) => this.actionError.set(e) });
  }
  reject() {
    const i = this.review();
    if (!i || this.submitting()) return;
    const reason = window.prompt('Reason for rejecting this import:')?.trim();
    if (!reason) return;
    this.submitting.set(true);
    this.api
      .rejectImport(i.id, i.version, reason)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({ next: () => this.load(), error: (e: ApiError) => this.actionError.set(e) });
  }
  fileSize(v: number) {
    return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(v < 1048576 ? v / 1024 : v / 1048576)} ${v < 1048576 ? 'KB' : 'MB'}`;
  }
  statusLabel(s: string) {
    return (
      (
        {
          needs_review: 'Needs review',
          needs_correction: 'Needs correction',
          processing: 'Processing',
          committed: 'Draft created',
          rejected: 'Rejected',
          processing_failed: 'Processing failed',
        } as Record<string, string>
      )[s] ?? s
    );
  }
  blockLabel(s: string) {
    return s.replaceAll('_', ' ');
  }
  errorTitle() {
    return this.state() === 'contract_error'
      ? 'Import response is incomplete'
      : this.state() === 'forbidden'
        ? 'Access denied'
        : this.state() === 'not_found'
          ? 'Import not found'
          : this.state() === 'conflict'
            ? 'Import changed'
            : 'Import dependency unavailable';
  }
  actionErrorTitle(e: ApiError) {
    return e.status === 403
      ? 'Approval not permitted'
      : e.status === 409
        ? 'The import changed'
        : e.status === 422
          ? 'Blocking validation errors remain'
          : 'Draft could not be created';
  }
}
