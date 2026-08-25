import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize, interval, startWith, switchMap, takeWhile } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ApiError } from '../../../core/http/api-error';
import { GfAlert, GfBadge, GfEmptyState, GfLoading, GfPageHeader } from '../../../shared/components/design-system';
import { AdminReportsApiService, CreateReportRequest, ReportJob } from './admin-reports-api.service';

type ViewState =
  | 'loading'
  | 'ready'
  | 'empty'
  | 'validation_error'
  | 'forbidden'
  | 'conflict'
  | 'dependency_error'
  | 'contract_error';

const TERMINAL = new Set(['completed', 'failed', 'expired', 'cancelled']);

@Component({
  standalone: true,
  imports: [DatePipe, FormsModule, GfAlert, GfBadge, GfEmptyState, GfLoading, GfPageHeader],
  template: `
    <gf-page-header title="Reports" eyebrow="Administration">
      <p>Generate and review server-approved, organization-scoped reports for the active workspace.</p>
      @if (canCreate()) {
        <button type="button" (click)="creating.set(!creating())">Create report</button>
      }
    </gf-page-header>

    @if (creating()) {
      <form class="create" (ngSubmit)="createReport()">
        <h2>Create report</h2>
        <label
          >Report type
          <select name="reportType" [(ngModel)]="draft.reportType" required>
            <option value="">Select a published report type</option>
            @for (type of publishedTypes; track type.value) {
              <option [value]="type.value">{{ type.label }}</option>
            }
          </select>
        </label>
        <label>Quarter ID <input name="quarterId" [(ngModel)]="draft.quarterId" /></label>
        <div class="form-actions">
          <button type="button" (click)="creating.set(false)">Cancel</button>
          <button [disabled]="submitting()">{{ submitting() ? 'Creating…' : 'Create report' }}</button>
        </div>
        @if (formError()) {
          <p class="field-error" role="alert">{{ formError() }}</p>
        }
      </form>
    }

    <form class="filters" (ngSubmit)="applyFilter()">
      <label
        >Status
        <select name="status" [(ngModel)]="draftStatus">
          <option value="">All statuses</option>
          @for (status of statuses; track status) {
            <option [value]="status">{{ status }}</option>
          }
        </select>
      </label>
      <button>Apply</button>
    </form>

    @switch (state()) {
      @case ('loading') {
        <gf-loading />
      }
      @case ('empty') {
        <gf-empty-state title="No report jobs yet" message="Create an organization-scoped report when one is needed." />
      }
      @case ('ready') {
        <div class="jobs">
          @for (job of visibleJobs(); track job.id) {
            <article>
              <header>
                <div>
                  <h2>{{ job.reportName || humanize(job.reportType) }}</h2>
                  <p>{{ job.scopeLabel }}</p>
                </div>
                <gf-badge>{{ job.status }}</gf-badge>
              </header>
              <dl>
                <div>
                  <dt>Period</dt>
                  <dd>{{ job.quarterName || period(job) }}</dd>
                </div>
                <div>
                  <dt>Requested by</dt>
                  <dd>{{ job.requestedBy }}</dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd>{{ job.createdAt | date: 'medium' }}</dd>
                </div>
                @if (job.completedAt) {
                  <div>
                    <dt>Completed</dt>
                    <dd>{{ job.completedAt | date: 'medium' }}</dd>
                  </div>
                }
                @if (job.expiresAt) {
                  <div>
                    <dt>Expires</dt>
                    <dd>{{ job.expiresAt | date: 'medium' }}</dd>
                  </div>
                }
              </dl>
              <div class="actions">
                @for (action of job.allowedActions || []; track action) {
                  <button type="button" (click)="runAction(job, action)" [disabled]="busyId() === job.id">
                    {{ humanize(action) }}
                  </button>
                }
              </div>
            </article>
          }
        </div>
      }
      @default {
        <gf-alert [title]="errorTitle()">
          <p>{{ error()?.message }}</p>
          @if (error()?.fieldErrors; as fields) {
            @for (field of fieldEntries(fields); track field[0]) {
              <p>
                <strong>{{ field[0] }}:</strong> {{ field[1].join(', ') }}
              </p>
            }
          }
          @if (error()?.requestId) {
            <p>
              Request ID: <code>{{ error()?.requestId }}</code>
            </p>
          }
          <button type="button" (click)="load()">Try again</button>
        </gf-alert>
      }
    }
  `,
  styles: [
    `
      :host {
        display: block;
        max-width: 76rem;
      }
      .filters,
      .create {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        align-items: end;
        padding: 1rem;
        margin-bottom: 1.5rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
      }
      .create {
        display: grid;
        max-width: 40rem;
      }
      .create h2 {
        margin: 0;
      }
      label {
        display: grid;
        gap: 0.35rem;
        font-weight: 700;
      }
      select,
      input,
      button {
        min-height: 44px;
        padding: 0.55rem 0.8rem;
        border: 1px solid var(--border);
        border-radius: 0.55rem;
        background: #fff;
        font: inherit;
      }
      button {
        cursor: pointer;
        font-weight: 700;
      }
      .jobs {
        display: grid;
        gap: 1rem;
      }
      .jobs article {
        padding: 1.2rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow);
      }
      article header,
      .actions,
      .form-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
      }
      article h2,
      article p {
        margin: 0.2rem 0;
      }
      dl {
        display: flex;
        flex-wrap: wrap;
        gap: 1.5rem;
      }
      dl div {
        display: grid;
        gap: 0.15rem;
      }
      dt {
        font-size: 0.8rem;
        text-transform: uppercase;
        color: var(--muted);
      }
      dd {
        margin: 0;
      }
      .actions,
      .form-actions {
        justify-content: flex-start;
      }
      .field-error {
        color: #8b1e1e;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminReportsComponent implements OnInit {
  private readonly api = inject(AdminReportsApiService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly state = signal<ViewState>('loading');
  readonly jobs = signal<readonly ReportJob[]>([]);
  readonly visibleJobs = signal<readonly ReportJob[]>([]);
  readonly error = signal<ApiError | null>(null);
  readonly creating = signal(false);
  readonly submitting = signal(false);
  readonly busyId = signal<string | null>(null);
  readonly formError = signal('');
  readonly statuses = ['queued', 'processing', 'completed', 'failed', 'expired', 'cancelled'] as const;
  readonly publishedTypes = [
    { value: 'participation_summary', label: 'Participation summary' },
    { value: 'team_composite_progress', label: 'Team composite progress' },
    { value: 'quarter_progress', label: 'Quarter progress' },
    { value: 'point_ledger_summary', label: 'Point-ledger summary' },
    { value: 'reconciliation_variance', label: 'Reconciliation variance' },
    { value: 'content_completion', label: 'Content completion' },
    { value: 'awards_recognition', label: 'Awards and recognition' },
    { value: 'family_activity_participation', label: 'Family activity participation' },
    { value: 'project_participation', label: 'Project participation' },
  ] as const;

  draft = { reportType: '', quarterId: '' };
  draftStatus = '';
  private status = '';

  canCreate = () => this.auth.capabilities().includes('admin.reports.create');

  ngOnInit() {
    this.load();
  }

  load() {
    this.state.set('loading');
    this.error.set(null);
    this.api
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.jobs.set(p.items);
          this.filter();
        },
        error: (e) => this.fail(e),
      });
  }

  applyFilter() {
    this.status = this.statuses.includes(this.draftStatus as never) ? this.draftStatus : '';
    this.filter();
  }

  private filter() {
    const items = this.status ? this.jobs().filter((j) => j.status === this.status) : this.jobs();
    this.visibleJobs.set(items);
    this.state.set(items.length ? 'ready' : 'empty');
  }

  createReport() {
    this.formError.set('');
    if (!this.publishedTypes.some((t) => t.value === this.draft.reportType)) {
      this.formError.set('Select a published report type.');
      return;
    }
    if (!this.draft.quarterId.trim()) {
      this.formError.set('Quarter is required for this report type.');
      return;
    }
    const request: CreateReportRequest = { reportType: this.draft.reportType, quarterId: this.draft.quarterId.trim() };
    this.submitting.set(true);
    this.api
      .create(request, crypto.randomUUID())
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (job) => {
          this.jobs.update((v) => [job, ...v.filter((x) => x.id !== job.id)]);
          this.creating.set(false);
          this.filter();
          this.poll(job);
        },
        error: (e) => this.fail(e),
      });
  }

  private poll(job: ReportJob) {
    if (TERMINAL.has(job.status)) return;
    interval(2000)
      .pipe(
        startWith(0),
        switchMap(() => this.api.job(job.id)),
        takeWhile((v) => !TERMINAL.has(v.status), true),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (v) => {
          this.jobs.update((items) => items.map((x) => (x.id === v.id ? v : x)));
          this.filter();
        },
        error: (e) => this.fail(e),
      });
  }

  runAction(job: ReportJob, action: string) {
    if (action === 'view') return;
    if (action === 'download') {
      this.busyId.set(job.id);
      this.api
        .download(job.id)
        .pipe(
          finalize(() => this.busyId.set(null)),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({
          next: (d) => {
            window.location.assign(d.url);
          },
          error: (e) => this.fail(e),
        });
      return;
    }
    if (action === 'retry' || action === 'cancel') {
      this.busyId.set(job.id);
      this.api
        .command(job.id, action)
        .pipe(
          finalize(() => this.busyId.set(null)),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({
          next: (v) => {
            this.jobs.update((items) => items.map((x) => (x.id === v.id ? v : x)));
            this.filter();
            if (action === 'retry') this.poll(v);
          },
          error: (e) => this.fail(e),
        });
    }
  }

  private fail(value: unknown) {
    const e =
      value instanceof ApiError ? value : new ApiError(-1, 'unexpected_error', 'The request could not be completed.');
    this.error.set(e);
    this.state.set(
      e.status === 403
        ? 'forbidden'
        : e.status === 409
          ? 'conflict'
          : e.status === 422
            ? 'validation_error'
            : e.status >= 500 || e.status === 0
              ? 'dependency_error'
              : 'contract_error',
    );
  }

  errorTitle() {
    return this.state() === 'forbidden'
      ? 'Reports access forbidden'
      : this.state() === 'validation_error'
        ? 'Report request validation failed'
        : this.state() === 'conflict'
          ? 'Report request conflict'
          : this.state() === 'dependency_error'
            ? 'Reports dependency unavailable'
            : 'Reports contract error';
  }

  humanize(v: string) {
    return v.replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase());
  }

  period(j: ReportJob) {
    return j.periodStart && j.periodEnd ? `${j.periodStart} – ${j.periodEnd}` : 'Organization scope';
  }

  fieldEntries(v: Readonly<Record<string, readonly string[]>>) {
    return Object.entries(v);
  }
}